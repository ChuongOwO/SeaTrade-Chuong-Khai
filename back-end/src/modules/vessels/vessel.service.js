const pool = require('../../config/database');

const NULLABLE_FIELDS = ['capacity_kg', 'registration_number', 'phone'];

const createVessel = async (owner_id, vesselData) => {
  const { vessel_code, vessel_name, vessel_type, capacity_kg, registration_number, phone, status } = vesselData;
  const insertQuery = `
    INSERT INTO vessels (owner_id, vessel_code, vessel_name, vessel_type, capacity_kg, registration_number, phone, status)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    RETURNING *
  `;
  // capacity_kg: DB có CHECK (capacity_kg IS NULL OR capacity_kg > 0) nên 0 phải lưu thành NULL;
  // registration_number UNIQUE nên chuỗi rỗng cũng lưu NULL để không đụng nhau.
  const values = [owner_id, vessel_code, vessel_name, vessel_type || 'FISHING', capacity_kg || null, registration_number || null, phone || null, status || 'ACTIVE'];
  const result = await pool.query(insertQuery, values);
  return result.rows[0];
};

const getVesselsByOwner = async (owner_id) => {
  const query = 'SELECT * FROM vessels WHERE owner_id = $1 ORDER BY created_at DESC';
  const result = await pool.query(query, [owner_id]);
  return result.rows;
};

/**
 * Toàn bộ tàu trong hệ thống kèm thông tin chủ tàu + vị trí GPS mới nhất —
 * dùng cho trang Quản Lý Đội Tàu của ADMIN trên web.
 */
const getAllVessels = async () => {
  const query = `
    SELECT
      v.*,
      u.full_name AS owner_name,
      u.phone     AS owner_phone,
      ST_X(vl.location::geometry) AS longitude,
      ST_Y(vl.location::geometry) AS latitude,
      vl.speed,
      vl.heading,
      vl.recorded_at
    FROM vessels v
    JOIN users u ON u.id = v.owner_id
    LEFT JOIN (
      SELECT DISTINCT ON (vessel_id) vessel_id, location, speed, heading, recorded_at
      FROM vessel_locations
      ORDER BY vessel_id, recorded_at DESC
    ) vl ON vl.vessel_id = v.id
    ORDER BY v.created_at DESC
  `;
  const result = await pool.query(query);
  return result.rows;
};

// owner_id = null nghĩa là không giới hạn chủ tàu (ADMIN thao tác trên mọi tàu).
const getVesselByIdAndOwner = async (vessel_id, owner_id) => {
  if (owner_id === null) {
    const result = await pool.query('SELECT * FROM vessels WHERE id = $1', [vessel_id]);
    return result.rows[0];
  }
  const query = 'SELECT * FROM vessels WHERE id = $1 AND owner_id = $2';
  const result = await pool.query(query, [vessel_id, owner_id]);
  return result.rows[0];
};

const findUserIdByPhone = async (phone) => {
  const result = await pool.query('SELECT id FROM users WHERE phone = $1', [phone]);
  return result.rows[0]?.id || null;
};

const updateVessel = async (vessel_id, owner_id, updateData) => {
  const vessel = await getVesselByIdAndOwner(vessel_id, owner_id);
  if (!vessel) return null;

  if (Object.keys(updateData).length === 0) return vessel;

  let updateQuery = 'UPDATE vessels SET ';
  const values = [];
  let index = 1;

  for (const [key, value] of Object.entries(updateData)) {
    updateQuery += `${key} = $${index}, `;
    // Giống createVessel: 0 / chuỗi rỗng lưu thành NULL để không vi phạm CHECK/UNIQUE
    values.push(NULLABLE_FIELDS.includes(key) && !value ? null : value);
    index++;
  }

  updateQuery += `updated_at = NOW() WHERE id = $${index} RETURNING *`;
  values.push(vessel_id);

  const result = await pool.query(updateQuery, values);
  return result.rows[0];
};

const deleteVessel = async (vessel_id, owner_id) => {
  const vessel = await getVesselByIdAndOwner(vessel_id, owner_id);
  if (!vessel) return null;

  const query = 'DELETE FROM vessels WHERE id = $1 RETURNING id';
  const result = await pool.query(query, [vessel_id]);
  return result.rows[0];
};

const checkVesselCodeExists = async (vessel_code) => {
  const query = 'SELECT id FROM vessels WHERE vessel_code = $1';
  const result = await pool.query(query, [vessel_code]);
  return result.rows.length > 0;
};

/**
 * Lấy vị trí mới nhất của tất cả các tàu đang hoạt động.
 * Dùng DISTINCT ON để lấy bản ghi mới nhất mỗi tàu.
 */
const getAllVesselsWithLocation = async () => {
  const query = `
    SELECT
      v.id            AS vessel_id,
      v.vessel_name,
      v.vessel_type,
      v.status,
      ST_X(vl.location::geometry) AS longitude,
      ST_Y(vl.location::geometry) AS latitude,
      vl.speed,
      vl.heading,
      vl.recorded_at
    FROM vessels v
    INNER JOIN (
      SELECT DISTINCT ON (vessel_id)
        vessel_id,
        location,
        speed,
        heading,
        recorded_at
      FROM vessel_locations
      ORDER BY vessel_id, recorded_at DESC
    ) vl ON v.id = vl.vessel_id
    WHERE v.status = 'ACTIVE'
    ORDER BY vl.recorded_at DESC
  `;
  const result = await pool.query(query);
  return result.rows;
};

/**
 * Lấy tàu hiện tại của user (tàu đầu tiên thuộc sở hữu của user + vị trí mới nhất).
 */
const getCurrentUserVessel = async (owner_id) => {
  const query = `
    SELECT
      v.id            AS vessel_id,
      v.vessel_name,
      v.vessel_type,
      v.status,
      ST_X(vl.location::geometry) AS longitude,
      ST_Y(vl.location::geometry) AS latitude,
      vl.speed,
      vl.heading,
      vl.recorded_at
    FROM vessels v
    LEFT JOIN (
      SELECT DISTINCT ON (vessel_id)
        vessel_id,
        location,
        speed,
        heading,
        recorded_at
      FROM vessel_locations
      ORDER BY vessel_id, recorded_at DESC
    ) vl ON v.id = vl.vessel_id
    WHERE v.owner_id = $1
    ORDER BY v.created_at ASC
    LIMIT 1
  `;
  const result = await pool.query(query, [owner_id]);
  return result.rows[0] || null;
};

/**
 * Tính khoảng cách (mét) và bearing giữa 2 tấu bằng PostGIS.
 * Trả về đầy đủ thông tin current + target + distance + bearing.
 */
const getNavigationInfo = async (owner_id, target_vessel_id, custom_lat = null, custom_lng = null) => {
  let currentVessel = null;

  if (custom_lat && custom_lng) {
    currentVessel = {
      vessel_id: 'me',
      vessel_name: 'Vị trí hiện tại',
      latitude: parseFloat(custom_lat),
      longitude: parseFloat(custom_lng)
    };
  } else {
    currentVessel = await getCurrentUserVessel(owner_id);
    if (!currentVessel) {
      throw { code: 'NO_CURRENT_VESSEL', message: 'Bạn chưa có tàu nào được đăng ký' };
    }
    if (!currentVessel.latitude) {
      throw { code: 'NO_CURRENT_LOCATION', message: 'Tàu của bạn chưa có vị trí GPS' };
    }
    if (currentVessel.vessel_id === target_vessel_id) {
      throw { code: 'SAME_VESSEL', message: 'Không thể dẫn đường tới chính tàu của bạn' };
    }
  }

  // Lấy tàu mục tiêu + vị trí mới nhất
  const targetQuery = `
    SELECT
      v.id            AS vessel_id,
      v.vessel_name,
      v.vessel_type,
      ST_X(vl.location::geometry) AS longitude,
      ST_Y(vl.location::geometry) AS latitude,
      vl.recorded_at,
      -- Tính khoảng cách bằng PostGIS (mét)
      ST_Distance(
        ST_GeographyFromText('POINT(' || $2 || ' ' || $3 || ')'),
        vl.location
      ) AS distance_m
    FROM vessels v
    INNER JOIN (
      SELECT DISTINCT ON (vessel_id)
        vessel_id, location, recorded_at
      FROM vessel_locations
      ORDER BY vessel_id, recorded_at DESC
    ) vl ON v.id = vl.vessel_id
    WHERE v.id = $1
  `;
  const targetResult = await pool.query(targetQuery, [
    target_vessel_id,
    currentVessel.longitude,
    currentVessel.latitude
  ]);

  if (!targetResult.rows[0]) {
    throw { code: 'TARGET_NOT_FOUND', message: 'Không tìm thấy tàu mục tiêu' };
  }
  const target = targetResult.rows[0];
  if (!target.latitude) {
    throw { code: 'NO_TARGET_LOCATION', message: 'Tàu mục tiêu chưa có vị trí GPS' };
  }

  // Tính bearing (góc hướng đi)
  const bearing = calculateBearing(
    currentVessel.latitude, currentVessel.longitude,
    target.latitude, target.longitude
  );

  const distanceM = parseFloat(target.distance_m);

  return {
    current_vessel: {
      vessel_id: currentVessel.vessel_id,
      vessel_name: currentVessel.vessel_name,
      latitude: parseFloat(currentVessel.latitude),
      longitude: parseFloat(currentVessel.longitude),
    },
    target_vessel: {
      vessel_id: target.vessel_id,
      vessel_name: target.vessel_name,
      latitude: parseFloat(target.latitude),
      longitude: parseFloat(target.longitude),
    },
    distance_m: Math.round(distanceM),
    distance_km: parseFloat((distanceM / 1000).toFixed(2)),
    bearing: parseFloat(bearing.toFixed(1)),
    bearing_text: bearingToText(bearing),
  };
};

/** Tính bearing từ điểm 1 đến điểm 2 (0° = Bắc, 90° = Đông) */
const calculateBearing = (lat1, lon1, lat2, lon2) => {
  const toRad = (d) => (d * Math.PI) / 180;
  const dLon = toRad(lon2 - lon1);
  const y = Math.sin(dLon) * Math.cos(toRad(lat2));
  const x =
    Math.cos(toRad(lat1)) * Math.sin(toRad(lat2)) -
    Math.sin(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.cos(dLon);
  return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
};

/**
 * Ghi nhận 1 vị trí GPS mới cho tàu — dùng khi Mobile App gửi định kỳ vị trí
 * thật (xem mobile/src/screens/HomeScreen.js). Chỉ chủ tàu (owner) mới được
 * ghi vị trí cho tàu của chính mình.
 * Trả về null nếu không tìm thấy tàu hoặc không phải chủ tàu.
 */
const addVesselLocation = async (vessel_id, owner_id, { latitude, longitude, speed, heading }) => {
  const vessel = await getVesselByIdAndOwner(vessel_id, owner_id);
  if (!vessel) return null;

  const query = `
    INSERT INTO vessel_locations (vessel_id, location, speed, heading, recorded_at)
    VALUES ($1, ST_GeographyFromText('POINT(' || $2 || ' ' || $3 || ')'), $4, $5, NOW())
    RETURNING
      id, vessel_id, speed, heading, recorded_at,
      ST_X(location::geometry) AS longitude,
      ST_Y(location::geometry) AS latitude
  `;
  const result = await pool.query(query, [vessel_id, longitude, latitude, speed || 0, heading || 0]);
  return result.rows[0];
};

/** Chuyển bearing sang chữ tiếng Việt */
const bearingToText = (bearing) => {
  if (bearing < 22.5 || bearing >= 337.5) return 'Bắc';
  if (bearing < 67.5)  return 'Đông Bắc';
  if (bearing < 112.5) return 'Đông';
  if (bearing < 157.5) return 'Đông Nam';
  if (bearing < 202.5) return 'Nam';
  if (bearing < 247.5) return 'Tây Nam';
  if (bearing < 292.5) return 'Tây';
  return 'Tây Bắc';
};

module.exports = {
  createVessel,
  getVesselsByOwner,
  getAllVessels,
  getVesselByIdAndOwner,
  findUserIdByPhone,
  updateVessel,
  deleteVessel,
  checkVesselCodeExists,
  getAllVesselsWithLocation,
  getCurrentUserVessel,
  getNavigationInfo,
  addVesselLocation,
};
