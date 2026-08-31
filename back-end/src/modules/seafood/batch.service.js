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

  const insertQuery = `
    INSERT INTO seafood_batches (
      vessel_id, species_id, quantity_kg, estimated_quantity_kg, catch_time,
      catch_location, quality_level, freshness_score, size_min_cm, size_max_cm, status
    )
    VALUES (
      $1, $2, $3, $4, $5, 
      ${latitude != null && longitude != null ? 'ST_SetSRID(ST_MakePoint($7, $6), 4326)' : 'NULL'}, 
      $8, $9, $10, $11, $12
    )
    RETURNING id, vessel_id, species_id, quantity_kg, status
  `;
  const values = [
    vessel_id, species_id, quantity_kg, estimated_quantity_kg, catch_time,
    latitude, longitude, quality_level, freshness_score, size_min_cm, size_max_cm, status || 'AVAILABLE'
  ];
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

module.exports = {
  checkVesselOwnership,
  checkSpeciesExists,
  checkBatchOwnership,
  createBatch,
  getBatchesByOwner,
  getBatchByIdAndOwner,
  updateBatch,
  deleteBatch
};
