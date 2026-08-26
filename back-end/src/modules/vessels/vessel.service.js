const pool = require('../../config/database');

const createVessel = async (owner_id, vesselData) => {
  const { vessel_code, vessel_name, vessel_type, capacity_kg, registration_number, status } = vesselData;
  const insertQuery = `
    INSERT INTO vessels (owner_id, vessel_code, vessel_name, vessel_type, capacity_kg, registration_number, status)
    VALUES ($1, $2, $3, $4, $5, $6, $7)
    RETURNING *
  `;
  const values = [owner_id, vessel_code, vessel_name, vessel_type || 'FISHING', capacity_kg || 0, registration_number, status || 'ACTIVE'];
  const result = await pool.query(insertQuery, values);
  return result.rows[0];
};

const getVesselsByOwner = async (owner_id) => {
  const query = 'SELECT * FROM vessels WHERE owner_id = $1 ORDER BY created_at DESC';
  const result = await pool.query(query, [owner_id]);
  return result.rows;
};

const getVesselByIdAndOwner = async (vessel_id, owner_id) => {
  const query = 'SELECT * FROM vessels WHERE id = $1 AND owner_id = $2';
  const result = await pool.query(query, [vessel_id, owner_id]);
  return result.rows[0];
};

const updateVessel = async (vessel_id, owner_id, updateData) => {
  const vessel = await getVesselByIdAndOwner(vessel_id, owner_id);
  if (!vessel) return null;

  if (Object.keys(updateData).length === 0) return vessel;

  let updateQuery = 'UPDATE vessels SET ';
  const values = [];
  let index = 1;

  for (const [key, value] of Object.entries(updateData)) {
    updateQuery += `${key} = $${index}, `;
    values.push(value);
    index++;
  }

  updateQuery += `updated_at = NOW() WHERE id = $${index} RETURNING *`;
  values.push(vessel_id);

  const result = await pool.query(updateQuery, values);
  return result.rows[0];
};

const deleteVessel = async (vessel_id, owner_id) => {
  const vessel = await getVesselByIdAndOwner(vessel_id, owner_id);
  if (!vessel) return null;

  const query = 'DELETE FROM vessels WHERE id = $1 RETURNING id';
  const result = await pool.query(query, [vessel_id]);
  return result.rows[0];
};

const checkVesselCodeExists = async (vessel_code) => {
  const query = 'SELECT id FROM vessels WHERE vessel_code = $1';
  const result = await pool.query(query, [vessel_code]);
  return result.rows.length > 0;
};

module.exports = {
  createVessel,
  getVesselsByOwner,
  getVesselByIdAndOwner,
  updateVessel,
  deleteVessel,
  checkVesselCodeExists
};
