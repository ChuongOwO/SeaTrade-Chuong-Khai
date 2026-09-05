const Joi = require('joi');

const createDetectionSchema = Joi.object({
  image_id: Joi.string().uuid().required(),
  model_version: Joi.string().max(100).required(),
  species_id: Joi.string().uuid().allow(null),
  confidence: Joi.number().min(0).max(1).allow(null),
  bbox_x: Joi.number().allow(null),
  bbox_y: Joi.number().allow(null),
  bbox_width: Joi.number().min(0).allow(null),
  bbox_height: Joi.number().min(0).allow(null),
  estimated_size_cm: Joi.number().positive().allow(null),
  quality_score: Joi.number().min(0).max(100).allow(null),
  freshness_score: Joi.number().min(0).max(100).allow(null)
});

// Whitelist các field được phép update để tránh SQL injection khi dùng dynamic UPDATE
const UPDATABLE_FIELDS = [
  'model_version', 'species_id', 'confidence',
  'bbox_x', 'bbox_y', 'bbox_width', 'bbox_height',
  'estimated_size_cm', 'quality_score', 'freshness_score'
];

const updateDetectionSchema = Joi.object({
  model_version: Joi.string().max(100),
  species_id: Joi.string().uuid().allow(null),
  confidence: Joi.number().min(0).max(1).allow(null),
  bbox_x: Joi.number().allow(null),
  bbox_y: Joi.number().allow(null),
  bbox_width: Joi.number().min(0).allow(null),
  bbox_height: Joi.number().min(0).allow(null),
  estimated_size_cm: Joi.number().positive().allow(null),
  quality_score: Joi.number().min(0).max(100).allow(null),
  freshness_score: Joi.number().min(0).max(100).allow(null)
}).min(1);

const validate = (schema) => (req, res, next) => {
  const { error } = schema.validate(req.body, { abortEarly: false, allowUnknown: false });
  if (error) {
    return res.status(400).json({
      status: 400,
      message: 'Dữ liệu không hợp lệ',
      error: error.details.map(err => err.message)
    });
  }
  next();
};

module.exports = {
  createDetectionSchema,
  updateDetectionSchema,
  UPDATABLE_FIELDS,
  validate
};
