require('dotenv').config({ path: 'f:/Do-an-tot-nghiep/back-end/.env' });
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function clearData() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    // Clear chat, offers, orders, and seafood_listings
    await client.query('TRUNCATE TABLE messages CASCADE;');
    await client.query('TRUNCATE TABLE offers CASCADE;');
    await client.query('TRUNCATE TABLE conversations CASCADE;');
    await client.query('TRUNCATE TABLE order_items CASCADE;');
    await client.query('TRUNCATE TABLE orders CASCADE;');
    await client.query('TRUNCATE TABLE seafood_listings CASCADE;');
    // Set seafood_batches back to AVAILABLE just in case
    await client.query(`UPDATE seafood_batches SET status = 'AVAILABLE'`);

    await client.query('COMMIT');
    console.log('✅ Đã xóa thành công toàn bộ dữ liệu Chat, Lịch sử giao dịch và Đề xuất giá!');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Lỗi khi xóa dữ liệu:', error);
  } finally {
    client.release();
    pool.end();
  }
}

clearData();
