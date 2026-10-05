const Joi = require('joi');

// Khớp enum user_role / user_status trong migrations/V1__init_schema.sql
const USER_ROLES = ['FISHERMAN', 'COLLECTOR', 'TRADER', 'ADMIN'];
const USER_STATUSES = ['ACTIVE', 'INACTIVE', 'BANNED'];

const listUsersQuerySchema = Joi.object({
  search: Joi.string().trim().max(100).allow(''),
  role: Joi.string().valid(...USER_ROLES),
  status: Joi.string().valid(...USER_STATUSES)
});

const updateUserSchema = Joi.object({
  role: Joi.string().valid(...USER_ROLES),
  status: Joi.string().valid(...USER_STATUSES)
}).or('role', 'status').messages({
  'object.missing': 'Cần truyền ít nhất role hoặc status'
});

// source = 'body' | 'query'
const validate = (schema, source = 'body') => (req, res, next) => {
  const { error } = schema.validate(req[source], { abortEarly: false });
  if (error) {
    return res.status(400).json({
      status: 400,
      message: 'Dữ liệu không hợp lệ',
      error: error.details.map(err => err.message)
    });
  }
  next();
};

module.exports = { listUsersQuerySchema, updateUserSchema, validate };
