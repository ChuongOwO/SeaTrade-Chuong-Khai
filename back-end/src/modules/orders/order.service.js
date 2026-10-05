const pool = require('../../config/database');

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
 * Lấy danh sách đơn hàng của 1 user (cả mua lẫn bán)
 */
const getOrdersByUser = async (userId) => {
  const result = await pool.query(
    `SELECT 
       o.id, o.total_amount, o.status, o.created_at, o.note, o.accepted_offer_id,
       json_build_object('id', buyer.id, 'full_name', buyer.full_name, 'phone', buyer.phone) AS buyer,
       json_build_object('id', seller.id, 'full_name', seller.full_name, 'phone', seller.phone) AS seller,
       json_agg(json_build_object(
         'listing_id', oi.listing_id,
         'quantity_kg', oi.quantity_kg,
         'price_per_kg', oi.price_per_kg,
         'subtotal', oi.subtotal,
         'species_name', s.name_vi
       )) AS items
     FROM orders o
     JOIN users buyer ON o.buyer_id = buyer.id
     JOIN users seller ON o.seller_id = seller.id
     LEFT JOIN order_items oi ON oi.order_id = o.id
     LEFT JOIN seafood_listings l ON oi.listing_id = l.id
     LEFT JOIN seafood_batches b ON l.batch_id = b.id
     LEFT JOIN seafood_species s ON b.species_id = s.id
     WHERE o.buyer_id = $1 OR o.seller_id = $1
     GROUP BY o.id, buyer.id, seller.id
     ORDER BY o.created_at DESC`,
    [userId]
  );
  return result.rows;
};

module.exports = { createOrderFromOffer, getOrdersByUser };
