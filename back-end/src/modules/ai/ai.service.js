const pool = require('../../config/database');
const { UPDATABLE_FIELDS } = require('./ai.validation');

// Kiểm tra image tồn tại và thuộc batch của vessel user sở hữu
const checkImageOwnershipForDetection = async (image_id, owner_id) => {
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

// Kiểm tra detection tồn tại và thuộc image → batch → vessel của user
const checkDetectionOwnership = async (detection_id, owner_id) => {
  const query = `
    SELECT d.id 
    FROM ai_detections d
    JOIN seafood_images i ON d.image_id = i.id
    JOIN seafood_batches b ON i.batch_id = b.id
    JOIN vessels v ON b.vessel_id = v.id
    WHERE d.id = $1 AND v.owner_id = $2
  `;
  const result = await pool.query(query, [detection_id, owner_id]);
  return result.rows.length > 0;
};

// Kiểm tra species tồn tại
const checkSpeciesExists = async (species_id) => {
  const result = await pool.query('SELECT id FROM seafood_species WHERE id = $1', [species_id]);
  return result.rows.length > 0;
};

// Query helper để JOIN species
const DETECTION_SELECT = `
  SELECT 
    d.id, d.image_id, d.model_version, d.confidence,
    d.bbox_x, d.bbox_y, d.bbox_width, d.bbox_height,
    d.estimated_size_cm, d.quality_score, d.freshness_score, d.created_at,
    CASE WHEN s.id IS NOT NULL THEN
      json_build_object(
        'id', s.id, 
        'name_vi', s.name_vi, 
        'name_en', s.name_en, 
        'scientific_name', s.scientific_name
      )
    ELSE NULL END AS species
  FROM ai_detections d
  LEFT JOIN seafood_species s ON d.species_id = s.id
`;

const createDetection = async (detectionData) => {
  const {
    image_id, model_version, species_id, confidence,
    bbox_x, bbox_y, bbox_width, bbox_height,
    estimated_size_cm, quality_score, freshness_score
  } = detectionData;

  const insertQuery = `
    INSERT INTO ai_detections (
      image_id, model_version, species_id, confidence,
      bbox_x, bbox_y, bbox_width, bbox_height,
      estimated_size_cm, quality_score, freshness_score
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
    RETURNING id
  `;
  const values = [
    image_id, model_version, species_id, confidence,
    bbox_x, bbox_y, bbox_width, bbox_height,
    estimated_size_cm, quality_score, freshness_score
  ];
  const result = await pool.query(insertQuery, values);
  const newId = result.rows[0].id;

  // Lấy lại kết quả với JOIN species để trả về đầy đủ
  return getDetectionById(newId);
};

const getDetectionsByImageId = async (image_id) => {
  const query = `
    ${DETECTION_SELECT}
    JOIN seafood_images i2 ON d.image_id = i2.id
    WHERE d.image_id = $1
    ORDER BY d.created_at DESC
  `;
  const result = await pool.query(query, [image_id]);
  return result.rows;
};

const getDetectionById = async (detection_id) => {
  const query = `
    ${DETECTION_SELECT}
    WHERE d.id = $1
  `;
  const result = await pool.query(query, [detection_id]);
  return result.rows[0];
};

const getDetectionByIdAndOwner = async (detection_id, owner_id) => {
  const query = `
    ${DETECTION_SELECT}
    JOIN seafood_images i2 ON d.image_id = i2.id
    JOIN seafood_batches b ON i2.batch_id = b.id
    JOIN vessels v ON b.vessel_id = v.id
    WHERE d.id = $1 AND v.owner_id = $2
  `;
  const result = await pool.query(query, [detection_id, owner_id]);
  return result.rows[0];
};

const updateDetection = async (detection_id, updateData) => {
  // Lọc chỉ những field nằm trong whitelist để tránh SQL injection
  const allowedData = {};
  for (const key of UPDATABLE_FIELDS) {
    if (key in updateData) {
      allowedData[key] = updateData[key];
    }
  }

  if (Object.keys(allowedData).length === 0) return null;

  let updateQuery = 'UPDATE ai_detections SET ';
  const values = [];
  let index = 1;

  for (const [key, value] of Object.entries(allowedData)) {
    updateQuery += `${key} = $${index}, `;
    values.push(value);
    index++;
  }

  updateQuery = updateQuery.slice(0, -2);
  updateQuery += ` WHERE id = $${index} RETURNING id`;
  values.push(detection_id);

  const result = await pool.query(updateQuery, values);
  if (!result.rows[0]) return null;

  return getDetectionById(detection_id);
};

const deleteDetection = async (detection_id) => {
  const query = 'DELETE FROM ai_detections WHERE id = $1 RETURNING id';
  const result = await pool.query(query, [detection_id]);
  return result.rows[0];
};

module.exports = {
  checkImageOwnershipForDetection,
  checkDetectionOwnership,
  checkSpeciesExists,
  createDetection,
  getDetectionsByImageId,
  getDetectionByIdAndOwner,
  updateDetection,
  deleteDetection
};
