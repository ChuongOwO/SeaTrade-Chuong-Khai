const crypto = require('crypto');

// ============================================================
// OTP Service — abstraction layer để sau dễ plug in SMS/Email
// ============================================================

// Generate 6-digit OTP
const generateOtp = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// Hash OTP bằng SHA-256 (không cần bcrypt vì OTP là 6 số ngẫu nhiên đã đủ entropy với expiry)
const hashOtp = (otp) => {
  return crypto.createHash('sha256').update(otp).digest('hex');
};

// Verify OTP: hash input rồi compare với stored hash
const verifyOtp = (plainOtp, storedHash) => {
  const inputHash = hashOtp(plainOtp);
  return inputHash === storedHash;
};

// Generate secure reset token (32 bytes = 64 hex chars)
const generateResetToken = () => {
  return crypto.randomBytes(32).toString('hex');
};

// =============================================================
// Notification Stub — thay bằng SMS/Email provider thật sau này
// =============================================================

const sendOtpNotification = async ({ phone, otp }) => {
  // TODO: Tích hợp Twilio / VNPT SMS / Firebase / SendGrid tại đây
  // Hiện tại: log OTP ra console CHỈ khi development
  if (process.env.NODE_ENV !== 'production') {
    console.log(`[DEV OTP] Gửi OTP ${otp} đến SĐT ${phone}`);
    console.log(`[DEV OTP] ⚠️  OTP này chỉ hiển thị trong môi trường development!`);
  }
  // Trả về true để simulate thành công
  return true;
};

module.exports = {
  generateOtp,
  hashOtp,
  verifyOtp,
  generateResetToken,
  sendOtpNotification
};
