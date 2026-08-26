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
  validate
};
