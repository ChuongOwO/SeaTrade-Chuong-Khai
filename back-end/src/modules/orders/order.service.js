const pool = require('../../config/database');
const env = require('../../config/env');

const httpError = (statusCode, message) => Object.assign(new Error(message), { statusCode });

/**
 * Tạo đơn hàng từ 1 offer đã ACCEPTED.
 * Tự động tạo order + order_item + cập nhật batch status = SOLD.
 */
const createOrderFromOffer = async (offer) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Lấy listing info
    const listingResult = await client.query(
      'SELECT * FROM seafood_listings WHERE id = $1',
      [offer.listing_id]
    );
    const listing = listingResult.rows[0];
    if (!listing) throw new Error('Listing không tồn tại');

    // Mẻ cá phải còn trên chợ (chưa bị "Mua ngay" giữ hoặc đã bán)
    const batchResult = await client.query(
      'SELECT status FROM seafood_batches WHERE id = $1 FOR UPDATE',
      [listing.batch_id]
    );
    if (batchResult.rows[0]?.status !== 'AVAILABLE') {
      throw httpError(409, 'Mẻ cá này đã được người khác mua hoặc đang được giữ chờ thanh toán');
    }

    const totalAmount = parseFloat(offer.quantity_kg) * parseFloat(offer.price_per_kg);

    // Tạo order
    const orderResult = await client.query(
      `INSERT INTO orders (buyer_id, seller_id, total_amount, status, accepted_offer_id, note)
       VALUES ($1, $2, $3, 'CONFIRMED', $4, $5)
       RETURNING *`,
      [offer.buyer_id, offer.seller_id, totalAmount, offer.id, `Thỏa thuận giá qua chat`]
    );
    const order = orderResult.rows[0];

    // Tạo order item
    await client.query(
      `INSERT INTO order_items (order_id, listing_id, quantity_kg, price_per_kg)
       VALUES ($1, $2, $3, $4)`,
      [order.id, offer.listing_id, offer.quantity_kg, offer.price_per_kg]
    );

    // Cập nhật listing status = SOLD
    await client.query(
      `UPDATE seafood_listings SET status = 'SOLD', updated_at = NOW() WHERE id = $1`,
      [offer.listing_id]
    );

    // Cập nhật batch status = SOLD
    await client.query(
      `UPDATE seafood_batches SET status = 'SOLD', updated_at = NOW() WHERE id = $1`,
      [listing.batch_id]
    );

    // Cập nhật conversation gắn order_id
    await client.query(
      `UPDATE conversations SET order_id = $1, updated_at = NOW() WHERE id = $2`,
      [order.id, offer.conversation_id]
    );

    await client.query('COMMIT');
    return order;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
};

/**
 * Lấy danh sách đơn hàng của 1 user (cả mua lẫn bán).
 * userId = null -> toàn bộ đơn trong hệ thống (ADMIN).
 */
const getOrdersByUser = async (userId) => {
  const result = await pool.query(
    `SELECT 
       o.id, o.total_amount, o.status, o.created_at, o.note, o.accepted_offer_id,
       o.purchase_type, o.hold_expires_at,
       EXISTS (SELECT 1 FROM payments p WHERE p.order_id = o.id AND p.status = 'PAID') AS is_paid,
       json_build_object('id', buyer.id, 'full_name', buyer.full_name, 'phone', buyer.phone) AS buyer,
       json_build_object('id', seller.id, 'full_name', seller.full_name, 'phone', seller.phone) AS seller,
       json_agg(json_build_object(
         'listing_id', oi.listing_id,
         'quantity_kg', oi.quantity_kg,
         'price_per_kg', oi.price_per_kg,
         'subtotal', oi.subtotal,
         'species_name', s.name_vi,
         'vessel_code', v.vessel_code,
         'vessel_name', v.vessel_name
       )) AS items
     FROM orders o
     JOIN users buyer ON o.buyer_id = buyer.id
     JOIN users seller ON o.seller_id = seller.id
     LEFT JOIN order_items oi ON oi.order_id = o.id
     LEFT JOIN seafood_listings l ON oi.listing_id = l.id
     LEFT JOIN seafood_batches b ON l.batch_id = b.id
     LEFT JOIN seafood_species s ON b.species_id = s.id
     LEFT JOIN vessels v ON b.vessel_id = v.id
     WHERE $1::uuid IS NULL OR o.buyer_id = $1 OR o.seller_id = $1
     GROUP BY o.id, buyer.id, seller.id
     ORDER BY o.created_at DESC`,
    [userId]
  );
  return result.rows;
};

const updateOrderStatus = async (orderId, status) => {
  const result = await pool.query(
    'UPDATE orders SET status = $1, updated_at = NOW() WHERE id = $2 RETURNING id, status, updated_at',
    [status, orderId]
  );
  return result.rows[0] || null;
};

/**
 * "Mua ngay": mua CẢ MẺ theo giá niêm yết. Mẻ cá bị giữ (RESERVED) trong orderHoldMinutes phút
 * để người mua thanh toán; hết hạn mà chưa trả thì releaseExpiredHolds() trả mẻ cá về chợ.
 */
const createBuyNowOrder = async (batchId, buyerId) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Khoá mẻ cá: 2 người bấm Mua ngay cùng lúc thì chỉ 1 người được.
    const batchRes = await client.query(
      `SELECT b.id, b.status, b.quantity_kg, v.owner_id, s.name_vi AS species_name
       FROM seafood_batches b
       JOIN vessels v ON v.id = b.vessel_id
       JOIN seafood_species s ON s.id = b.species_id
       WHERE b.id = $1 FOR UPDATE OF b`,
      [batchId]
    );
    const batch = batchRes.rows[0];
    if (!batch) throw httpError(404, 'Không tìm thấy mẻ cá');
    if (batch.owner_id === buyerId) throw httpError(400, 'Bạn không thể mua mẻ cá của chính mình');
    if (batch.status !== 'AVAILABLE') {
      throw httpError(409, 'Mẻ cá này đã được người khác mua hoặc đang được giữ chờ thanh toán');
    }

    const listingRes = await client.query(
      'SELECT id, price_per_kg FROM seafood_listings WHERE batch_id = $1 ORDER BY created_at DESC LIMIT 1 FOR UPDATE',
      [batchId]
    );
    const listing = listingRes.rows[0];
    const pricePerKg = Number(listing?.price_per_kg || 0);
    if (!listing || !(pricePerKg > 0)) {
      throw httpError(409, 'Mẻ cá chưa có giá niêm yết. Hãy nhắn tin để thương lượng với người bán.');
    }

    const quantityKg = Number(batch.quantity_kg);
    const totalAmount = Math.round(quantityKg * pricePerKg); // VNPay chỉ nhận số nguyên VND
    const holdExpiresAt = new Date(Date.now() + env.orderHoldMinutes * 60 * 1000);

    const orderRes = await client.query(
      `INSERT INTO orders (buyer_id, seller_id, total_amount, status, purchase_type, hold_expires_at, note)
       VALUES ($1, $2, $3, 'CONFIRMED', 'BUY_NOW', $4, 'Mua ngay cả mẻ theo giá niêm yết')
       RETURNING *`,
      [buyerId, batch.owner_id, totalAmount, holdExpiresAt]
    );
    const order = orderRes.rows[0];

    await client.query(
      'INSERT INTO order_items (order_id, listing_id, quantity_kg, price_per_kg) VALUES ($1, $2, $3, $4)',
      [order.id, listing.id, quantityKg, pricePerKg]
    );
    await client.query(
      "UPDATE seafood_listings SET status = 'RESERVED', updated_at = NOW() WHERE id = $1",
      [listing.id]
    );
    await client.query(
      "UPDATE seafood_batches SET status = 'RESERVED', updated_at = NOW() WHERE id = $1",
      [batchId]
    );

    await client.query('COMMIT');
    return { ...order, quantity_kg: quantityKg, price_per_kg: pricePerKg, species_name: batch.species_name };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
};

/**
 * Gọi trong transaction ngay khi đơn có khoản PAID (VNPay hoặc người bán xác nhận đã nhận tiền).
 * Đơn Mua ngay đang giữ hàng -> bán hẳn mẻ cá và bỏ hạn giữ. Đơn thương lượng: mẻ cá đã SOLD sẵn.
 */
/** Mẻ cá của listing còn trên chợ không (chưa bị Mua ngay giữ / chưa bán). */
const isListingBatchAvailable = async (listingId) => {
  const res = await pool.query(
    `SELECT b.status FROM seafood_listings l JOIN seafood_batches b ON b.id = l.batch_id WHERE l.id = $1`,
    [listingId]
  );
  return res.rows[0]?.status === 'AVAILABLE';
};

const finalizePaidOrder = async (client, orderId) => {
  const res = await client.query(
    'UPDATE orders SET hold_expires_at = NULL, updated_at = NOW() WHERE id = $1 AND hold_expires_at IS NOT NULL RETURNING id',
    [orderId]
  );
  if (res.rowCount === 0) return;
  await client.query(
    `UPDATE seafood_listings SET status = 'SOLD', updated_at = NOW()
     WHERE id IN (SELECT listing_id FROM order_items WHERE order_id = $1)`,
    [orderId]
  );
  await client.query(
    `UPDATE seafood_batches SET status = 'SOLD', updated_at = NOW()
     WHERE id IN (SELECT l.batch_id FROM order_items oi JOIN seafood_listings l ON l.id = oi.listing_id
                  WHERE oi.order_id = $1)`,
    [orderId]
  );
};

// Chờ thêm sau khi link VNPay hết hạn để IPN đến muộn vẫn kịp ghi nhận trước khi huỷ đơn.
const IPN_GRACE_MINUTES = 5;

/**
 * Huỷ các đơn Mua ngay quá hạn giữ hàng mà chưa thanh toán, trả mẻ cá về chợ.
 * Không huỷ khi còn link VNPay đang hiệu lực (cộng thời gian chờ IPN).
 */
const releaseExpiredHolds = async () => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const expired = await client.query(
      `SELECT o.id, o.buyer_id FROM orders o
       WHERE o.hold_expires_at IS NOT NULL AND o.hold_expires_at < NOW() AND o.status = 'CONFIRMED'
         AND NOT EXISTS (SELECT 1 FROM payments p WHERE p.order_id = o.id AND p.status = 'PAID')
         AND NOT EXISTS (
           SELECT 1 FROM payments p WHERE p.order_id = o.id AND p.status = 'PENDING'
             AND p.expires_at > NOW() - make_interval(mins => $1))
       FOR UPDATE OF o SKIP LOCKED`,
      [IPN_GRACE_MINUTES]
    );
    for (const order of expired.rows) {
      await client.query(
        `UPDATE orders SET status = 'CANCELLED', hold_expires_at = NULL,
           note = 'Hết thời gian giữ hàng, chưa thanh toán', updated_at = NOW()
         WHERE id = $1`,
        [order.id]
      );
      await client.query(
        `UPDATE seafood_listings SET status = 'PUBLISHED', updated_at = NOW()
         WHERE status = 'RESERVED' AND id IN (SELECT listing_id FROM order_items WHERE order_id = $1)`,
        [order.id]
      );
      await client.query(
        `UPDATE seafood_batches SET status = 'AVAILABLE', updated_at = NOW()
         WHERE status = 'RESERVED' AND id IN (
           SELECT l.batch_id FROM order_items oi JOIN seafood_listings l ON l.id = oi.listing_id
           WHERE oi.order_id = $1)`,
        [order.id]
      );
      await client.query(
        `INSERT INTO notifications (user_id, title, content, notification_type, reference_id)
         VALUES ($1, 'Đơn Mua ngay đã bị huỷ',
                 'Hết thời gian giữ hàng mà chưa thanh toán, mẻ cá đã quay lại chợ.', 'ORDER', $2)`,
        [order.buyer_id, order.id]
      );
    }
    await client.query('COMMIT');
    return expired.rows;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
};

module.exports = {
  createOrderFromOffer,
  getOrdersByUser,
  updateOrderStatus,
  createBuyNowOrder,
  isListingBatchAvailable,
  finalizePaidOrder,
  releaseExpiredHolds,
};
