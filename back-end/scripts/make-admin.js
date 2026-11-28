
require('dotenv').config();
const { Pool } = require('pg');

async function main() {
  const phone = process.argv[2];
  if (!phone) {
    console.error('Thiếu số điện thoại. Ví dụ: node scripts/make-admin.js 0987654321');
    process.exit(1);
  }
  if (!process.env.DATABASE_URL) {
    console.error('Thiếu DATABASE_URL.');
    process.exit(1);
  }

  const host = new URL(process.env.DATABASE_URL).host;
  console.log(`Kết nối tới: ${host}`);

  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  try {
    const { rows } = await pool.query(
      "UPDATE users SET role = 'ADMIN' WHERE phone = $1 RETURNING id, phone, full_name, role",
      [phone]
    );
    if (rows.length === 0) {
      console.error(`Không có tài khoản nào với số điện thoại ${phone}. Hãy đăng ký trước.`);
      process.exit(1);
    }
    console.log('Đã nâng lên ADMIN:', rows[0]);
  } finally {
    await pool.end();
  }
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
