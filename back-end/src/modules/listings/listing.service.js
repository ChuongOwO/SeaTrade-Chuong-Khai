const pool = require('../../config/database');

/**
 * Tìm hoặc tạo listing cho 1 batch (dùng khi bắt đầu thương lượng).
 * Mỗi batch chỉ có 1 listing — nếu đã tạo rồi thì trả về cái cũ.
 */
const findOrCreateListingForBatch = async (batchId, sellerId) => {
  // Kiểm tra listing đã tồn tại chưa
  const existing = await pool.query(
    'SELECT * FROM seafood_listings WHERE batch_id = $1 AND seller_id = $2 LIMIT 1',
    [batchId, sellerId]
  );
  if (existing.rows[0]) return existing.rows[0];

  // Lấy thông tin batch + species để tạo listing
  const batchResult = await pool.query(
    `SELECT b.*, s.name_vi FROM seafood_batches b
     JOIN seafood_species s ON b.species_id = s.id
     WHERE b.id = $1`,
    [batchId]
  );
  const batch = batchResult.rows[0];
  if (!batch) throw new Error('Không tìm thấy mẻ cá');

  const inserted = await pool.query(
    `INSERT INTO seafood_listings (batch_id, seller_id, title, description, price_per_kg, quantity_available, status)
     VALUES ($1, $2, $3, $4, 0, $5, 'PUBLISHED')
     RETURNING *`,
    [
      batchId,
      sellerId,
      `${batch.name_vi} - ${batch.quantity_kg}kg`,
      `Mẻ cá ${batch.name_vi} đang bán trên chợ`,
      batch.quantity_kg
    ]
  );
  return inserted.rows[0];
};

const getListingById = async (listingId) => {
  const result = await pool.query(
    `SELECT l.*, s.name_vi AS species_name, s.name_en AS species_name_en,
            b.quantity_kg AS batch_quantity_kg, b.quality_level
     FROM seafood_listings l
     JOIN seafood_batches b ON l.batch_id = b.id
     JOIN seafood_species s ON b.species_id = s.id
     WHERE l.id = $1`,
    [listingId]
  );
  return result.rows[0];
};

module.exports = { findOrCreateListingForBatch, getListingById };
