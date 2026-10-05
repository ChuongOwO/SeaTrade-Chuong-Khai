const pool = require('../../config/database');

/**
 * Tạo offer (đề xuất giá) trong cuộc thương lượng.
 * Người mua (buyer) đề xuất giá cho listing của người bán (seller).
 */
const createOffer = async ({ conversationId, listingId, buyerId, sellerId, quantity_kg, price_per_kg, message, parentOfferId }) => {
  const result = await pool.query(
    `INSERT INTO offers (conversation_id, listing_id, buyer_id, seller_id, quantity_kg, price_per_kg, message, parent_offer_id, expires_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW() + INTERVAL '24 hours')
     RETURNING *`,
    [conversationId, listingId, buyerId, sellerId, quantity_kg, price_per_kg, message || null, parentOfferId || null]
  );
  return result.rows[0];
};

/**
 * Chấp nhận offer → cập nhật status = ACCEPTED, hủy các offer PENDING khác
 */
const acceptOffer = async (offerId) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Cập nhật offer này
    const updated = await client.query(
      `UPDATE offers SET status = 'ACCEPTED', responded_at = NOW()
       WHERE id = $1 AND status = 'PENDING'
       RETURNING *`,
      [offerId]
    );
    const offer = updated.rows[0];
    if (!offer) throw new Error('Offer không tồn tại hoặc đã được xử lý');

    // Hủy các offer PENDING khác trong cùng conversation
    await client.query(
      `UPDATE offers SET status = 'EXPIRED', responded_at = NOW()
       WHERE conversation_id = $1 AND id <> $2 AND status = 'PENDING'`,
      [offer.conversation_id, offerId]
    );

    await client.query('COMMIT');
    return offer;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
};

/**
 * Từ chối offer
 */
const rejectOffer = async (offerId) => {
  const result = await pool.query(
    `UPDATE offers SET status = 'REJECTED', responded_at = NOW()
     WHERE id = $1 AND status = 'PENDING'
     RETURNING *`,
    [offerId]
  );
  if (!result.rows[0]) throw new Error('Offer không tồn tại hoặc đã được xử lý');
  return result.rows[0];
};

/**
 * Trả giá (counter) → reject offer cũ, tạo offer mới với giá mới
 */
const counterOffer = async (originalOfferId, { price_per_kg, quantity_kg, message }) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Reject offer cũ
    const old = await client.query(
      `UPDATE offers SET status = 'COUNTERED', responded_at = NOW()
       WHERE id = $1 AND status = 'PENDING'
       RETURNING *`,
      [originalOfferId]
    );
    const oldOffer = old.rows[0];
    if (!oldOffer) throw new Error('Offer không tồn tại hoặc đã được xử lý');

    // Tạo offer mới (đảo buyer/seller so với offer gốc vì người trả giá là người nhận offer trước đó)
    const newOffer = await client.query(
      `INSERT INTO offers (conversation_id, listing_id, buyer_id, seller_id, quantity_kg, price_per_kg, message, parent_offer_id, expires_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW() + INTERVAL '24 hours')
       RETURNING *`,
      [
        oldOffer.conversation_id, oldOffer.listing_id,
        oldOffer.buyer_id, oldOffer.seller_id,
        quantity_kg || oldOffer.quantity_kg,
        price_per_kg,
        message || null,
        originalOfferId
      ]
    );

    await client.query('COMMIT');
    return newOffer.rows[0];
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
};

/**
 * Lấy thông tin 1 offer (kèm tên loài cá)
 */
const getOfferById = async (offerId) => {
  const result = await pool.query(
    `SELECT o.*, s.name_vi AS species_name
     FROM offers o
     JOIN seafood_listings l ON o.listing_id = l.id
     JOIN seafood_batches b ON l.batch_id = b.id
     JOIN seafood_species s ON b.species_id = s.id
     WHERE o.id = $1`,
    [offerId]
  );
  return result.rows[0];
};

/**
 * Lấy tất cả offers trong 1 conversation
 */
const getOffersByConversation = async (conversationId) => {
  const result = await pool.query(
    `SELECT o.*, s.name_vi AS species_name
     FROM offers o
     JOIN seafood_listings l ON o.listing_id = l.id
     JOIN seafood_batches b ON l.batch_id = b.id
     JOIN seafood_species s ON b.species_id = s.id
     WHERE o.conversation_id = $1
     ORDER BY o.created_at DESC`,
    [conversationId]
  );
  return result.rows;
};

module.exports = {
  createOffer,
  acceptOffer,
  rejectOffer,
  counterOffer,
  getOfferById,
  getOffersByConversation
};
