/**
 * Script tạo hoặc cấp quyền ADMIN cho tài khoản SeaTrade
 * Sử dụng:
 *   node src/scripts/create_admin.js [số_điện_thoại] [mật_khẩu] [họ_tên] [email]
 * Mặc định:
 *   SĐT: 0900000000
 *   Mật khẩu: admin123
 */

const bcrypt = require('bcryptjs');
const pool = require('../config/database');

async function createAdmin() {
  const phone = process.argv[2] || '0900000000';
  const password = process.argv[3] || 'admin123';
  const fullName = process.argv[4] || 'Quản trị viên SeaTrade';
  const email = process.argv[5] || 'admin@seatrade.vn';

  try {
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    // Kiểm tra xem số điện thoại đã tồn tại chưa
    const existing = await pool.query('SELECT id, phone, role, status FROM users WHERE phone = $1', [phone]);

    if (existing.rows.length > 0) {
      await pool.query(
        `UPDATE users 
         SET password_hash = $1, role = 'ADMIN', status = 'ACTIVE', full_name = $2, email = COALESCE($3, email), updated_at = NOW()
         WHERE phone = $4`,
        [passwordHash, fullName, email, phone]
      );
      console.log(`\n✅ Đã cập nhật tài khoản ${phone} thành vai trò ADMIN thành công!`);
    } else {
      await pool.query(
        `INSERT INTO users (phone, email, password_hash, full_name, role, status)
         VALUES ($1, $2, $3, $4, 'ADMIN', 'ACTIVE')`,
        [phone, email, passwordHash, fullName]
      );
      console.log(`\n✅ Đã tạo mới tài khoản ADMIN thành công!`);
    }

    console.log('-------------------------------------------');
    console.log(`📱 Số điện thoại : ${phone}`);
    console.log(`🔑 Mật khẩu      : ${password}`);
    console.log(`👤 Họ tên        : ${fullName}`);
    console.log(`📧 Email         : ${email}`);
    console.log(`👑 Vai trò       : ADMIN`);
    console.log(`⚡ Trạng thái    : ACTIVE`);
    console.log('-------------------------------------------');
    console.log('👉 Bạn có thể dùng thông tin trên để đăng nhập trực tiếp trên Web.');
  } catch (err) {
    console.error('❌ Lỗi khi tạo/cập nhật tài khoản Admin:', err.message);
  } finally {
    await pool.end();
  }
}

createAdmin();

