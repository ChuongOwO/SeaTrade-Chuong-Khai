const Joi = require('joi');

// [POST] /api/auth/forgot-password
const forgotPasswordSchema = Joi.object({
  phone: Joi.string().trim().min(9).max(15).required().messages({
    'string.empty': 'Số điện thoại không được để trống',
    'any.required': 'Vui lòng nhập số điện thoại'
  })
});

// [POST] /api/auth/verify-reset-otp
const verifyOtpSchema = Joi.object({
  phone: Joi.string().trim().min(9).max(15).required(),
  otp: Joi.string().pattern(/^\d{6}$/).required().messages({
    'string.pattern.base': 'OTP phải là 6 chữ số',
    'any.required': 'Vui lòng nhập OTP'
  })
});

// [POST] /api/auth/reset-password
const resetPasswordSchema = Joi.object({
  resetToken: Joi.string().required().messages({
    'any.required': 'Reset token không hợp lệ'
  }),
  newPassword: Joi.string().min(6).required().messages({
    'string.min': 'Mật khẩu mới phải có ít nhất 6 ký tự',
    'any.required': 'Vui lòng nhập mật khẩu mới'
  }),
  confirmPassword: Joi.any().equal(Joi.ref('newPassword')).required().messages({
    'any.only': 'Xác nhận mật khẩu không khớp'
  })
});

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
  forgotPasswordSchema,
  verifyOtpSchema,
  resetPasswordSchema,
  validate
};
