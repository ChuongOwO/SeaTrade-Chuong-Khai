const pool = require('../../config/database');

const checkVesselOwnership = async (vessel_id, owner_id) => {
  const query = 'SELECT id FROM vessels WHERE id = $1 AND owner_id = $2';
  const result = await pool.query(query, [vessel_id, owner_id]);
  return result.rows.length > 0;
};

const checkSpeciesExists = async (species_id) => {
  const query = 'SELECT id FROM seafood_species WHERE id = $1';
  const result = await pool.query(query, [species_id]);
  return result.rows.length > 0;
};

const checkBatchOwnership = async (batch_id, owner_id) => {
  const query = `
    SELECT b.id 
    FROM seafood_batches b
    JOIN vessels v ON b.vessel_id = v.id
    WHERE b.id = $1 AND v.owner_id = $2
  `;
  const result = await pool.query(query, [batch_id, owner_id]);
  return result.rows.length > 0;
};

const createBatch = async (batchData) => {
  const {
    vessel_id, species_id, quantity_kg, estimated_quantity_kg, catch_time,
    latitude, longitude, quality_level, freshness_score, size_min_cm, size_max_cm, status
  } = batchData;

  const hasLocation = latitude != null && longitude != null;

  // Xây mảng values và đánh số $1, $2, ... tuần tự, không bỏ gap
  const columns = [
    'vessel_id', 'species_id', 'quantity_kg', 'estimated_quantity_kg', 'catch_time',
    'catch_location', 'quality_level', 'freshness_score', 'size_min_cm', 'size_max_cm', 'status'
  ];

  const values = [];
  const placeholders = [];

  // $1 vessel_id
  values.push(vessel_id);
  placeholders.push(`$${values.length}`);

  // $2 species_id
  values.push(species_id);
  placeholders.push(`$${values.length}`);

  // $3 quantity_kg
  values.push(quantity_kg);
  placeholders.push(`$${values.length}`);

  // $4 estimated_quantity_kg
  values.push(estimated_quantity_kg ?? null);
  placeholders.push(`$${values.length}`);

  // $5 catch_time
  values.push(catch_time ?? null);
  placeholders.push(`$${values.length}`);

  // catch_location (PostGIS) - chỉ dùng tham số nếu có toạ độ
  if (hasLocation) {
    values.push(parseFloat(latitude));
    const latIdx = values.length;
    values.push(parseFloat(longitude));
    const lngIdx = values.length;
    placeholders.push(`ST_SetSRID(ST_MakePoint($${lngIdx}, $${latIdx}), 4326)`);
  } else {
    placeholders.push('NULL');
  }

  // quality_level
  values.push(quality_level ?? null);
  placeholders.push(`$${values.length}`);

  // freshness_score
  values.push(freshness_score ?? null);
  placeholders.push(`$${values.length}`);

  // size_min_cm
  values.push(size_min_cm ?? null);
  placeholders.push(`$${values.length}`);

  // size_max_cm
  values.push(size_max_cm ?? null);
  placeholders.push(`$${values.length}`);

  // status
  values.push(status || 'AVAILABLE');
  placeholders.push(`$${values.length}`);

  const insertQuery = `
    INSERT INTO seafood_batches (${columns.join(', ')})
    VALUES (${placeholders.join(', ')})
    RETURNING id, vessel_id, species_id, quantity_kg, status
  `;

  const result = await pool.query(insertQuery, values);
  return result.rows[0];
};

const getBatchesByOwner = async (owner_id, filters = {}) => {
  let query = `
    SELECT 
      b.id, b.quantity_kg, b.estimated_quantity_kg, b.catch_time, b.quality_level, 
      b.freshness_score, b.size_min_cm, b.size_max_cm, b.status, b.created_at, b.updated_at,
      ST_Y(b.catch_location::geometry) AS latitude,
      ST_X(b.catch_location::geometry) AS longitude,
      json_build_object('id', v.id, 'vessel_name', v.vessel_name, 'vessel_code', v.vessel_code) AS vessel,
      json_build_object('id', s.id, 'name_vi', s.name_vi, 'name_en', s.name_en) AS species
    FROM seafood_batches b
    JOIN vessels v ON b.vessel_id = v.id
    JOIN seafood_species s ON b.species_id = s.id
    WHERE v.owner_id = $1
  `;
  const values = [owner_id];
  let index = 2;

  if (filters.species_id) {
    query += ` AND b.species_id = $${index}`;
    values.push(filters.species_id);
    index++;
  }
  if (filters.vessel_id) {
    query += ` AND b.vessel_id = $${index}`;
    values.push(filters.vessel_id);
    index++;
  }
  if (filters.status) {
    query += ` AND b.status = $${index}`;
    values.push(filters.status);
    index++;
  }
  if (filters.quality_level) {
    query += ` AND b.quality_level = $${index}`;
    values.push(filters.quality_level);
    index++;
  }

  query += ' ORDER BY b.created_at DESC';
  const result = await pool.query(query, values);
  return result.rows;
};

const getBatchByIdAndOwner = async (batch_id, owner_id) => {
  const query = `
    SELECT 
      b.id, b.quantity_kg, b.estimated_quantity_kg, b.catch_time, b.quality_level, 
      b.freshness_score, b.size_min_cm, b.size_max_cm, b.status, b.created_at, b.updated_at,
      ST_Y(b.catch_location::geometry) AS latitude,
      ST_X(b.catch_location::geometry) AS longitude,
      json_build_object('id', v.id, 'vessel_name', v.vessel_name, 'vessel_code', v.vessel_code) AS vessel,
      json_build_object('id', s.id, 'name_vi', s.name_vi, 'name_en', s.name_en) AS species
    FROM seafood_batches b
    JOIN vessels v ON b.vessel_id = v.id
    JOIN seafood_species s ON b.species_id = s.id
    WHERE b.id = $1 AND v.owner_id = $2
  `;
  const result = await pool.query(query, [batch_id, owner_id]);
  return result.rows[0];
};

const updateBatch = async (batch_id, updateData) => {
  if (Object.keys(updateData).length === 0) return null;

  let updateQuery = 'UPDATE seafood_batches SET ';
  const values = [];
  let index = 1;

  for (const [key, value] of Object.entries(updateData)) {
    if (key === 'latitude' || key === 'longitude') continue;
    updateQuery += `${key} = $${index}, `;
    values.push(value);
    index++;
  }

  if (updateData.latitude !== undefined && updateData.longitude !== undefined) {
    if (updateData.latitude === null || updateData.longitude === null) {
      updateQuery += `catch_location = NULL, `;
    } else {
      updateQuery += `catch_location = ST_SetSRID(ST_MakePoint($${index + 1}, $${index}), 4326), `;
      values.push(updateData.latitude, updateData.longitude);
      index += 2;
    }
  }

  updateQuery += `updated_at = NOW() WHERE id = $${index} RETURNING id`;
  values.push(batch_id);

  const result = await pool.query(updateQuery, values);
  return result.rows[0];
};

const deleteBatch = async (batch_id) => {
  const query = 'DELETE FROM seafood_batches WHERE id = $1 RETURNING id';
  const result = await pool.query(query, [batch_id]);
  return result.rows[0];
};

/**
 * Lấy tất cả lô hàng AVAILABLE trên "Chợ hải sản" — ai cũng xem được.
 */
const getMarketBatches = async () => {
  const query = `
    SELECT 
      b.id, b.quantity_kg, b.quality_level, b.status, b.created_at,
      b.catch_time, b.freshness_score,
      ST_Y(b.catch_location::geometry) AS catch_lat,
      ST_X(b.catch_location::geometry) AS catch_lng,
      l.price_per_kg,
      v.owner_id, u.phone AS owner_phone, u.full_name AS owner_name,
      json_build_object('id', v.id, 'vessel_name', v.vessel_name, 'vessel_code', v.vessel_code) AS vessel,
      json_build_object('id', s.id, 'name_vi', s.name_vi, 'name_en', s.name_en, 'image_url', s.image_url) AS species
    FROM seafood_batches b
    JOIN vessels v ON b.vessel_id = v.id
    JOIN seafood_species s ON b.species_id = s.id
    JOIN users u ON v.owner_id = u.id
    -- Giá chào bán (nếu mẻ cá đã có listing, xem listings/listing.service.js)
    LEFT JOIN LATERAL (
      SELECT price_per_kg FROM seafood_listings
      WHERE batch_id = b.id ORDER BY created_at DESC LIMIT 1
    ) l ON TRUE
    WHERE b.status = 'AVAILABLE'
    ORDER BY b.created_at DESC
  `;
  const result = await pool.query(query);
  return result.rows;
};

module.exports = {
  checkVesselOwnership,
  checkSpeciesExists,
  checkBatchOwnership,
  createBatch,
  getBatchesByOwner,
  getBatchByIdAndOwner,
  updateBatch,
  deleteBatch,
  getMarketBatches
};
