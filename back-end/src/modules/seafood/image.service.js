const pool = require('../../config/database');

const checkBatchExistsAndOwnership = async (batch_id, owner_id) => {
  const query = `
    SELECT b.id 
    FROM seafood_batches b
    JOIN vessels v ON b.vessel_id = v.id
    WHERE b.id = $1 AND v.owner_id = $2
  `;
  const result = await pool.query(query, [batch_id, owner_id]);
  return result.rows.length > 0;
};

const checkImageOwnership = async (image_id, owner_id) => {
  const query = `
    SELECT i.id 
    FROM seafood_images i
    JOIN seafood_batches b ON i.batch_id = b.id
    JOIN vessels v ON b.vessel_id = v.id
    WHERE i.id = $1 AND v.owner_id = $2
  `;
  const result = await pool.query(query, [image_id, owner_id]);
  return result.rows.length > 0;
};

const createImage = async (imageData) => {
  const { batch_id, image_url, thumbnail_url, uploaded_by, captured_at } = imageData;
  const insertQuery = `
    INSERT INTO seafood_images (batch_id, image_url, thumbnail_url, uploaded_by, captured_at)
    VALUES ($1, $2, $3, $4, $5)
    RETURNING *
  `;
  const values = [batch_id, image_url, thumbnail_url, uploaded_by, captured_at];
  const result = await pool.query(insertQuery, values);
  return result.rows[0];
};

const getImagesByBatchId = async (batch_id) => {
  const query = `
    SELECT i.*, 
           json_build_object('id', u.id, 'username', u.username, 'full_name', u.full_name) AS uploader
    FROM seafood_images i
    LEFT JOIN users u ON i.uploaded_by = u.id
    WHERE i.batch_id = $1
    ORDER BY i.created_at DESC
  `;
  const result = await pool.query(query, [batch_id]);
  return result.rows;
};

const getImageByIdAndOwner = async (image_id, owner_id) => {
  const query = `
    SELECT i.*, 
           json_build_object('id', u.id, 'username', u.username, 'full_name', u.full_name) AS uploader
    FROM seafood_images i
    JOIN seafood_batches b ON i.batch_id = b.id
    JOIN vessels v ON b.vessel_id = v.id
    LEFT JOIN users u ON i.uploaded_by = u.id
    WHERE i.id = $1 AND v.owner_id = $2
  `;
  const result = await pool.query(query, [image_id, owner_id]);
  return result.rows[0];
};

const updateImage = async (image_id, updateData) => {
  if (Object.keys(updateData).length === 0) return null;

  let updateQuery = 'UPDATE seafood_images SET ';
  const values = [];
  let index = 1;

  for (const [key, value] of Object.entries(updateData)) {
    updateQuery += `${key} = $${index}, `;
    values.push(value);
    index++;
  }

  updateQuery = updateQuery.slice(0, -2);
  updateQuery += ` WHERE id = $${index} RETURNING *`;
  values.push(image_id);

  const result = await pool.query(updateQuery, values);
  return result.rows[0];
};

const deleteImage = async (image_id) => {
  const query = 'DELETE FROM seafood_images WHERE id = $1 RETURNING id';
  const result = await pool.query(query, [image_id]);
  return result.rows[0];
};

module.exports = {
  checkBatchExistsAndOwnership,
  checkImageOwnership,
  createImage,
  getImagesByBatchId,
  getImageByIdAndOwner,
  updateImage,
  deleteImage
};
