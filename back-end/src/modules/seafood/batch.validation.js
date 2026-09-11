const Joi = require('joi');

const qualityLevels = ['PREMIUM', 'GOOD', 'NORMAL', 'LOW'];
const batchStatuses = ['AVAILABLE', 'RESERVED', 'SOLD', 'EXPIRED'];

const createBatchSchema = Joi.object({
  vessel_id: Joi.string().uuid().required(),
  species_id: Joi.string().uuid().required(),
  quantity_kg: Joi.number().positive().required(),
  estimated_quantity_kg: Joi.number().positive().allow(null),
  catch_time: Joi.date().iso().allow(null),
  latitude: Joi.number().min(-90).max(90).allow(null),
  longitude: Joi.number().min(-180).max(180).allow(null),
  quality_level: Joi.string().valid(...qualityLevels).allow(null),
  freshness_score: Joi.number().min(0).max(100).allow(null),
  size_min_cm: Joi.number().positive().allow(null),
  size_max_cm: Joi.number().positive().allow(null),
  status: Joi.string().valid(...batchStatuses).default('AVAILABLE')
}).custom((value, helpers) => {
  if (value.size_min_cm && value.size_max_cm && value.size_max_cm < value.size_min_cm) {
    return helpers.error('any.invalid', { message: 'size_max_cm phải lớn hơn hoặc bằng size_min_cm' });
  }
  return value;
});

const updateBatchSchema = Joi.object({
  species_id: Joi.string().uuid(),
  quantity_kg: Joi.number().positive(),
  estimated_quantity_kg: Joi.number().positive().allow(null),
  catch_time: Joi.date().iso().allow(null),
  latitude: Joi.number().min(-90).max(90).allow(null),
  longitude: Joi.number().min(-180).max(180).allow(null),
  quality_level: Joi.string().valid(...qualityLevels).allow(null),
  freshness_score: Joi.number().min(0).max(100).allow(null),
  size_min_cm: Joi.number().positive().allow(null),
  size_max_cm: Joi.number().positive().allow(null),
  status: Joi.string().valid(...batchStatuses)
}).custom((value, helpers) => {
  if (value.size_min_cm && value.size_max_cm && value.size_max_cm < value.size_min_cm) {
    return helpers.error('any.invalid', { message: 'size_max_cm phải lớn hơn hoặc bằng size_min_cm' });
  }
  return value;
});

const validate = (schema) => (req, res, next) => {
  const { error } = schema.validate(req.body, { abortEarly: false });
  if (error) {
    return res.status(400).json({
      status: 400,
      message: 'Dữ liệu không hợp lệ',
      error: error.details.map(err => err.message || err.context.message)
    });
  }
  next();
};

module.exports = {
  createBatchSchema,
  updateBatchSchema,
  validate
};
