const Joi = require('joi');

// [POST] /api/chat/conversations — bắt đầu (hoặc mở lại) 1 cuộc hội thoại
// với người dùng khác theo SĐT của họ. listing_id/order_id không bắt buộc vì
// module Listing/Order thật CHƯA có API (mới chỉ có bảng trong DB) — xem
// database/README_chat.md.
const startConversationSchema = Joi.object({
  peer_phone: Joi.string().trim().min(9).max(15).required().messages({
    'string.empty': 'Vui lòng nhập số điện thoại người muốn nhắn tin',
    'any.required': 'Vui lòng nhập số điện thoại người muốn nhắn tin'
  }),
  listing_id: Joi.string().uuid().optional().allow(null),
  order_id: Joi.string().uuid().optional().allow(null)
});

// [POST] /api/chat/conversations/:id/messages
// Tên field khớp đúng cột `message` trong bảng messages thật (không phải "content").
const sendMessageSchema = Joi.object({
  message: Joi.string().trim().min(1).max(2000).required().messages({
    'string.empty': 'Nội dung tin nhắn không được để trống',
    'string.max': 'Tin nhắn tối đa 2000 ký tự',
    'any.required': 'Vui lòng nhập nội dung tin nhắn'
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
  startConversationSchema,
  sendMessageSchema,
  validate
};
