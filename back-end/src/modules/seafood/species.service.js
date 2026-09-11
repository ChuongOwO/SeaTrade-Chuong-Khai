const pool = require('../../config/database');

const createSpecies = async (speciesData) => {
  const { name_vi, name_en, scientific_name, description, image_url, status } = speciesData;
  const insertQuery = `
    INSERT INTO seafood_species (name_vi, name_en, scientific_name, description, image_url, status)
    VALUES ($1, $2, $3, $4, $5, $6)
    RETURNING *
  `;
  const values = [name_vi, name_en, scientific_name, description, image_url, status !== undefined ? status : true];
  const result = await pool.query(insertQuery, values);
  return result.rows[0];
};

const getAllSpecies = async (filters = {}) => {
  let query = 'SELECT * FROM seafood_species WHERE 1=1';
  const values = [];
  let index = 1;

  if (filters.status !== undefined) {
    query += ` AND status = $${index}`;
    values.push(filters.status);
    index++;
  }

  if (filters.search) {
    query += ` AND (name_vi ILIKE $${index} OR name_en ILIKE $${index})`;
    values.push(`%${filters.search}%`);
    index++;
  }

  query += ' ORDER BY name_vi ASC';
  const result = await pool.query(query, values);
  return result.rows;
};

const getSpeciesById = async (id) => {
  const query = 'SELECT * FROM seafood_species WHERE id = $1';
  const result = await pool.query(query, [id]);
  return result.rows[0];
};

const updateSpecies = async (id, updateData) => {
  if (Object.keys(updateData).length === 0) return await getSpeciesById(id);

  let updateQuery = 'UPDATE seafood_species SET ';
  const values = [];
  let index = 1;

  for (const [key, value] of Object.entries(updateData)) {
    updateQuery += `${key} = $${index}, `;
    values.push(value);
    index++;
  }

  updateQuery = updateQuery.slice(0, -2); // remove trailing comma
  updateQuery += ` WHERE id = $${index} RETURNING *`;
  values.push(id);

  const result = await pool.query(updateQuery, values);
  return result.rows[0];
};

const deleteSpecies = async (id) => {
  const query = 'DELETE FROM seafood_species WHERE id = $1 RETURNING id';
  const result = await pool.query(query, [id]);
  return result.rows[0];
};

const checkSpeciesNameExists = async (name_vi, exclude_id = null) => {
  let query = 'SELECT id FROM seafood_species WHERE name_vi = $1';
  const values = [name_vi];
  if (exclude_id) {
    query += ' AND id != $2';
    values.push(exclude_id);
  }
  const result = await pool.query(query, values);
  return result.rows.length > 0;
};

module.exports = {
  createSpecies,
  getAllSpecies,
  getSpeciesById,
  updateSpecies,
  deleteSpecies,
  checkSpeciesNameExists
};
