const Joi = require('joi');

const createVesselSchema = Joi.object({
  vessel_code: Joi.string().max(50).required().messages({
    'string.empty': 'Mã tàu không được để trống',
    'any.required': 'Mã tàu là bắt buộc'
  }),
  vessel_name: Joi.string().max(100).required().messages({
    'string.empty': 'Tên tàu không được để trống',
    'any.required': 'Tên tàu là bắt buộc'
  }),
  vessel_type: Joi.string().valid('FISHING', 'COLLECTION', 'TRANSPORT').default('FISHING'),
  capacity_kg: Joi.number().min(0).default(0),
  registration_number: Joi.string().max(50).allow('', null),
  status: Joi.string().valid('ACTIVE', 'INACTIVE', 'MAINTENANCE').default('ACTIVE')
});

const updateVesselSchema = Joi.object({
  vessel_name: Joi.string().max(100),
  vessel_type: Joi.string().valid('FISHING', 'COLLECTION', 'TRANSPORT'),
  capacity_kg: Joi.number().min(0),
  registration_number: Joi.string().max(50).allow('', null),
  status: Joi.string().valid('ACTIVE', 'INACTIVE', 'MAINTENANCE')
});

// Ghi nhận 1 vị trí GPS mới cho tàu — dùng khi Mobile App gửi định kỳ vị trí
// thật lên server (xem vessel.routes.js: POST /api/vessels/:id/locations).
const addLocationSchema = Joi.object({
  latitude: Joi.number().min(-90).max(90).required().messages({
    'any.required': 'Vĩ độ (latitude) là bắt buộc',
    'number.base': 'Vĩ độ phải là số'
  }),
  longitude: Joi.number().min(-180).max(180).required().messages({
    'any.required': 'Kinh độ (longitude) là bắt buộc',
    'number.base': 'Kinh độ phải là số'
  }),
  speed: Joi.number().min(0).default(0),
  heading: Joi.number().min(0).max(360).default(0)
});

const validate = (schema) => (req, res, next) => {
  const { error } = schema.validate(req.body, { abortEarly: false });
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
  createVesselSchema,
  updateVesselSchema,
  addLocationSchema,
  validate
};
