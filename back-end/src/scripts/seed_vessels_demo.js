/**
 * Seed dữ liệu demo: 3 tàu trên vùng biển Vũng Tàu
 * Chạy: node src/scripts/seed_vessels_demo.js
 *
 * Script an toàn: chỉ insert location nếu tàu tồn tại,
 * KHÔNG xóa dữ liệu hiện tại.
 */

const pool = require('../config/database');

// Tọa độ vùng biển Vũng Tàu (demo)
const DEMO_VESSELS = [
  {
    id:         '4cc06754-e3ea-4200-92ff-4c0afb6a242f', // Tàu đã có trong DB
    vessel_name: 'Tàu Cá Sài Gòn',
    lat: 10.3240,
    lng: 107.1240,
  },
];

// Thêm 2 tàu demo mới (có owner là user đã có)
const EXTRA_VESSELS = [
  {
    vessel_code: 'VT-DEMO-02',
    vessel_name: 'Ngư Ký Vũng Tàu',
    vessel_type: 'FISHING',
    lat: 10.4010,
    lng: 107.2350,
  },
  {
    vessel_code: 'VT-DEMO-03',
    vessel_name: 'Thu Gom Biển Đông',
    vessel_type: 'COLLECTOR',
    lat: 10.2580,
    lng: 107.0820,
  },
];

async function seed() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Lấy user đầu tiên để dùng làm owner
    const userRes = await client.query('SELECT id FROM users LIMIT 1');
    if (!userRes.rows[0]) {
      console.log('❌ Chưa có user nào trong database. Hãy đăng ký user trước.');
      await client.query('ROLLBACK');
      return;
    }
    const owner_id = userRes.rows[0].id;
    console.log('👤 Owner ID:', owner_id);

    // Tạo tàu extra nếu chưa tồn tại
    const allVesselIds = [];

    // Tàu đã tồn tại
    for (const v of DEMO_VESSELS) {
      const check = await client.query('SELECT id FROM vessels WHERE id = $1', [v.id]);
      if (check.rows[0]) {
        allVesselIds.push({ id: v.id, lat: v.lat, lng: v.lng, name: v.vessel_name });
        console.log(`✅ Tàu đã tồn tại: ${v.vessel_name}`);
      } else {
        console.log(`⚠️  Không tìm thấy tàu ID ${v.id}, bỏ qua.`);
      }
    }

    // Tàu mới
    for (const v of EXTRA_VESSELS) {
      const check = await client.query('SELECT id FROM vessels WHERE vessel_code = $1', [v.vessel_code]);
      if (check.rows[0]) {
        allVesselIds.push({ id: check.rows[0].id, lat: v.lat, lng: v.lng, name: v.vessel_name });
        console.log(`✅ Tàu extra đã tồn tại: ${v.vessel_name}`);
      } else {
        const insert = await client.query(
          `INSERT INTO vessels (owner_id, vessel_code, vessel_name, vessel_type, status)
           VALUES ($1, $2, $3, $4, 'ACTIVE') RETURNING id`,
          [owner_id, v.vessel_code, v.vessel_name, v.vessel_type]
        );
        allVesselIds.push({ id: insert.rows[0].id, lat: v.lat, lng: v.lng, name: v.vessel_name });
        console.log(`🆕 Đã tạo tàu mới: ${v.vessel_name} (${insert.rows[0].id})`);
      }
    }

    // Insert vị trí GPS cho từng tàu
    for (const v of allVesselIds) {
      await client.query(
        `INSERT INTO vessel_locations (vessel_id, location, speed, heading, recorded_at)
         VALUES ($1, ST_GeographyFromText('POINT(' || $2 || ' ' || $3 || ')'), $4, $5, NOW())`,
        [v.id, v.lng, v.lat, 5.2, 45]
      );
      console.log(`📍 Đã thêm vị trí cho ${v.name}: (${v.lat}, ${v.lng})`);
    }

    await client.query('COMMIT');
    console.log('\n✅ Seed dữ liệu demo hoàn tất!');
    console.log('📋 Danh sách tàu:');
    allVesselIds.forEach(v => console.log(`  - ${v.name}: (${v.lat}, ${v.lng})`));

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Lỗi seed:', err.message);
  } finally {
    client.release();
    pool.end();
  }
}

seed();
