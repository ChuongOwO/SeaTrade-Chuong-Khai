const bcrypt = require('bcryptjs');
const pool = require('../../config/database');
const { generateOtp, hashOtp, verifyOtp, generateResetToken, sendOtpNotification } = require('../../services/otp.service');

const OTP_EXPIRY_MINUTES = 5;
const MAX_OTP_ATTEMPTS = 5;
const RESET_TOKEN_EXPIRY_MINUTES = 15;
const MAX_OTP_REQUESTS_PER_HOUR = 5;

// ============================================================
// [POST] /api/auth/forgot-password
// ============================================================
const forgotPassword = async (req, res, next) => {
  const { phone } = req.body;

  // Generic response để tránh account enumeration
  const GENERIC_RESPONSE = {
    status: 200,
    message: 'Tài khoản tồn tại, mã OTP đã được gửi đến số điện thoại của bạn.'
  };

  try {
    // 1. Tìm user theo phone
    const userResult = await pool.query('SELECT id, phone FROM users WHERE phone = $1', [phone]);

    // Nếu user không tồn tại → vẫn trả generic response (tránh account enumeration)
    if (userResult.rows.length === 0) {
      return res.json(GENERIC_RESPONSE);
    }

    const user = userResult.rows[0];

    // 2. Rate limiting: đếm số OTP request trong 1 giờ qua
    const recentRequests = await pool.query(
      `SELECT COUNT(*) FROM password_reset_tokens 
       WHERE user_id = $1 AND created_at > NOW() - INTERVAL '1 hour'`,
      [user.id]
    );
    if (parseInt(recentRequests.rows[0].count) >= MAX_OTP_REQUESTS_PER_HOUR) {
      return res.status(429).json({
        status: 429,
        message: 'Bạn đã yêu cầu quá nhiều lần. Vui lòng thử lại sau 1 giờ.'
      });
    }

    // 3. Vô hiệu hóa tất cả OTP cũ chưa dùng của user này
    await pool.query(
      `UPDATE password_reset_tokens SET used = true 
       WHERE user_id = $1 AND used = false`,
      [user.id]
    );

    // 4. Generate OTP và hash
    const otp = generateOtp();
    const otp_hash = hashOtp(otp);
    const expires_at = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);

    // 5. Lưu vào DB
    await pool.query(
      `INSERT INTO password_reset_tokens (user_id, otp_hash, expires_at)
       VALUES ($1, $2, $3)`,
      [user.id, otp_hash, expires_at]
    );

    // 6. Gửi OTP (stub hiện tại, thay bằng SMS thật sau)
    await sendOtpNotification({ phone: user.phone, otp });

    // Hỗ trợ test: trả về OTP trong response nếu đang ở môi trường DEV
    if (process.env.NODE_ENV !== 'production') {
      return res.json({
        ...GENERIC_RESPONSE,
        dev_otp: otp
      });
    }

    return res.json(GENERIC_RESPONSE);

  } catch (error) {
    next(error);
  }
};

// ============================================================
// [POST] /api/auth/verify-reset-otp
// ============================================================
const verifyResetOtp = async (req, res, next) => {
  const { phone, otp } = req.body;

  try {
    // 1. Tìm user
    const userResult = await pool.query('SELECT id FROM users WHERE phone = $1', [phone]);
    if (userResult.rows.length === 0) {
      return res.status(400).json({
        status: 400,
        message: 'OTP không hợp lệ hoặc đã hết hạn'
      });
    }
    const user = userResult.rows[0];

    // 2. Lấy OTP token hợp lệ mới nhất của user
    const tokenResult = await pool.query(
      `SELECT id, otp_hash, expires_at, attempts, used 
       FROM password_reset_tokens
       WHERE user_id = $1 AND used = false
       ORDER BY created_at DESC LIMIT 1`,
      [user.id]
    );

    if (tokenResult.rows.length === 0) {
      return res.status(400).json({
        status: 400,
        message: 'OTP không hợp lệ hoặc đã hết hạn'
      });
    }

    const tokenRow = tokenResult.rows[0];

    // 3. Kiểm tra hết hạn
    if (new Date() > new Date(tokenRow.expires_at)) {
      return res.status(400).json({
        status: 400,
        message: 'OTP đã hết hạn. Vui lòng yêu cầu OTP mới.'
      });
    }

    // 4. Kiểm tra số lần thử
    if (tokenRow.attempts >= MAX_OTP_ATTEMPTS) {
      return res.status(429).json({
        status: 429,
        message: 'Bạn đã nhập sai OTP quá nhiều lần. Vui lòng yêu cầu OTP mới.'
      });
    }

    // 5. Verify OTP
    const isValid = verifyOtp(otp, tokenRow.otp_hash);
    if (!isValid) {
      // Tăng attempts
      await pool.query(
        'UPDATE password_reset_tokens SET attempts = attempts + 1 WHERE id = $1',
        [tokenRow.id]
      );
      return res.status(400).json({
        status: 400,
        message: `OTP không đúng. Còn ${MAX_OTP_ATTEMPTS - tokenRow.attempts - 1} lần thử.`
      });
    }

    // 6. OTP đúng → tạo reset token ngắn hạn (không mark used ở đây, chờ đến reset-password)
    const resetToken = generateResetToken();
    const resetTokenExpiry = new Date(Date.now() + RESET_TOKEN_EXPIRY_MINUTES * 60 * 1000);

    await pool.query(
      `UPDATE password_reset_tokens 
       SET reset_token = $1, reset_token_expires_at = $2
       WHERE id = $3`,
      [resetToken, resetTokenExpiry, tokenRow.id]
    );

    return res.json({
      status: 200,
      message: 'Xác thực OTP thành công',
      metadata: {
        resetToken,
        expiresAt: resetTokenExpiry
      }
    });

  } catch (error) {
    next(error);
  }
};

// ============================================================
// [POST] /api/auth/reset-password
// ============================================================
const resetPassword = async (req, res, next) => {
  const { resetToken, newPassword } = req.body;

  try {
    // 1. Tìm token hợp lệ
    const tokenResult = await pool.query(
      `SELECT id, user_id, reset_token_expires_at, used
       FROM password_reset_tokens
       WHERE reset_token = $1`,
      [resetToken]
    );

    if (tokenResult.rows.length === 0) {
      return res.status(400).json({
        status: 400,
        message: 'Reset token không hợp lệ hoặc đã được sử dụng'
      });
    }

    const tokenRow = tokenResult.rows[0];

    // 2. Kiểm tra đã dùng
    if (tokenRow.used) {
      return res.status(400).json({
        status: 400,
        message: 'Reset token đã được sử dụng. Vui lòng yêu cầu OTP mới.'
      });
    }

    // 3. Kiểm tra hết hạn
    if (!tokenRow.reset_token_expires_at || new Date() > new Date(tokenRow.reset_token_expires_at)) {
      return res.status(400).json({
        status: 400,
        message: 'Reset token đã hết hạn. Vui lòng yêu cầu OTP mới.'
      });
    }

    // 4. Hash mật khẩu mới — dùng cùng cơ chế bcrypt như register
    const salt = await bcrypt.genSalt(10);
    const password_hash = await bcrypt.hash(newPassword, salt);

    // 5. Cập nhật mật khẩu trong bảng users
    await pool.query(
      'UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2',
      [password_hash, tokenRow.user_id]
    );

    // 6. Mark token as used để không dùng lại được
    await pool.query(
      'UPDATE password_reset_tokens SET used = true WHERE id = $1',
      [tokenRow.id]
    );

    return res.json({
      status: 200,
      message: 'Đặt lại mật khẩu thành công. Vui lòng đăng nhập với mật khẩu mới.'
    });

  } catch (error) {
    next(error);
  }
};

module.exports = {
  forgotPassword,
  verifyResetOtp,
  resetPassword
};
