require('dotenv').config();

module.exports = {
  port: process.env.PORT || 5000,
  dbUrl: process.env.DATABASE_URL,
  jwtSecret: process.env.JWT_SECRET || 'super_secret_jwt_key_cho_seatrade_2026',

  // Số phút giữ mẻ cá cho đơn "Mua ngay" chờ thanh toán; hết hạn thì mẻ cá quay lại chợ.
  orderHoldMinutes: parseInt(process.env.ORDER_HOLD_MINUTES || '15', 10),

  // Thanh toán VNPay (mặc định trỏ sandbox). KHÔNG đặt HashSecret thật trong code — chỉ trong file .env.
  vnpay: {
    tmnCode: process.env.VNPAY_TMN_CODE || '',
    hashSecret: process.env.VNPAY_HASH_SECRET || '',
    url: process.env.VNPAY_URL || 'https://sandbox.vnpayment.vn/paymentv2/vpcpay.html',
    returnUrl: process.env.VNPAY_RETURN_URL || '',
    expireMinutes: parseInt(process.env.VNPAY_EXPIRE_MINUTES || '15', 10),
    confirmOnReturn: process.env.VNPAY_CONFIRM_ON_RETURN === 'true',
  },
};
