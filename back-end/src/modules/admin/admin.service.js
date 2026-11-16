const pool = require('../../config/database');

/**
 * Danh sách tài khoản (không trả password_hash) kèm số tàu đang sở hữu.
 * Mọi bộ lọc đều tuỳ chọn: search khớp tên / SĐT / email.
 */
const listUsers = async ({ search, role, status }) => {
  const query = `
    SELECT
      u.id, u.full_name, u.phone, u.email, u.avatar_url, u.role, u.status,
      u.created_at, u.updated_at,
      COUNT(v.id)::int AS vessel_count
    FROM users u
    LEFT JOIN vessels v ON v.owner_id = u.id
    WHERE ($1::text IS NULL OR u.full_name ILIKE $1 OR u.phone ILIKE $1 OR u.email ILIKE $1)
      AND ($2::user_role IS NULL OR u.role = $2)
      AND ($3::user_status IS NULL OR u.status = $3)
    GROUP BY u.id
    ORDER BY u.created_at DESC
  `;
  const values = [search ? `%${search}%` : null, role || null, status || null];
  const result = await pool.query(query, values);
  return result.rows;
};

// Chỉ cập nhật field được truyền (role / status), field còn lại giữ nguyên
const updateUser = async (userId, { role, status }) => {
  const result = await pool.query(
    `UPDATE users
     SET role = COALESCE($1::user_role, role),
         status = COALESCE($2::user_status, status),
         updated_at = NOW()
     WHERE id = $3
     RETURNING id, full_name, phone, email, role, status, updated_at`,
    [role || null, status || null, userId]
  );
  return result.rows[0] || null;
};

// table/column là hằng số nội bộ (không lấy từ request) nên ghép chuỗi an toàn
const countBy = async (table, column, whereClause = '', params = []) => {
  const query = `SELECT ${column} AS key, COUNT(*)::int AS count FROM ${table} ${whereClause ? 'WHERE ' + whereClause : ''} GROUP BY ${column}`;
  const result = await pool.query(query, params);
  return Object.fromEntries(result.rows.map(row => [row.key, row.count]));
};

/**
 * Tạo điều kiện lọc thời gian theo period / startDate / endDate
 */
const buildDateFilter = (field = 'created_at', { period = 'all', startDate, endDate } = {}) => {
  const conditions = [];
  const params = [];
  let idx = 1;

  if (startDate) {
    conditions.push(`${field} >= $${idx++}`);
    params.push(new Date(startDate));
  }
  if (endDate) {
    conditions.push(`${field} <= $${idx++}`);
    params.push(new Date(endDate));
  }

  if (!startDate && !endDate) {
    if (period === 'today') {
      conditions.push(`${field} >= CURRENT_DATE`);
    } else if (period === '7days') {
      conditions.push(`${field} >= NOW() - INTERVAL '7 days'`);
    } else if (period === '30days') {
      conditions.push(`${field} >= NOW() - INTERVAL '30 days'`);
    }
  }

  return {
    whereSql: conditions.length > 0 ? conditions.join(' AND ') : '',
    andSql: conditions.length > 0 ? ` AND ${conditions.join(' AND ')}` : '',
    params,
    period
  };
};

/**
 * Số liệu tổng quan cho trang Thống Kê của web admin.
 * Giá trị giao dịch bỏ qua đơn CANCELLED / REJECTED.
 * Hỗ trợ lọc theo period ('all' | 'today' | '7days' | '30days') hoặc startDate / endDate.
 */
const getStats = async (filters = {}) => {
  const dateFilter = buildDateFilter('created_at', filters);
  const { andSql, params, period } = dateFilter;

  // Lọc doanh thu và đơn hàng
  const revenueQuery = `
    SELECT COALESCE(SUM(total_amount), 0)::float AS total_value, COUNT(*)::int AS order_count
    FROM orders
    WHERE status NOT IN ('CANCELLED', 'REJECTED') ${andSql}
  `;

  // Sản lượng theo loài
  const batchDateFilter = buildDateFilter('b.created_at', filters);
  const speciesVolumeQuery = `
    SELECT s.name_vi AS species, SUM(b.quantity_kg)::float AS total_kg, COUNT(*)::int AS batch_count
    FROM seafood_batches b
    JOIN seafood_species s ON s.id = b.species_id
    ${batchDateFilter.whereSql ? 'WHERE ' + batchDateFilter.whereSql : ''}
    GROUP BY s.name_vi
    ORDER BY total_kg DESC
  `;

  // Biểu đồ xu hướng theo ngày hoặc theo tháng tuỳ theo period
  let trendQuery;
  if (period === 'today' || period === '7days') {
    trendQuery = `
      SELECT to_char(date_trunc('day', created_at), 'DD/MM') AS month,
             COUNT(*)::int AS order_count,
             COALESCE(SUM(total_amount), 0)::float AS total_value
      FROM orders
      WHERE status NOT IN ('CANCELLED', 'REJECTED') ${andSql}
      GROUP BY 1, date_trunc('day', created_at)
      ORDER BY date_trunc('day', created_at) ASC
    `;
  } else {
    trendQuery = `
      SELECT to_char(date_trunc('month', created_at), 'YYYY-MM') AS month,
             COUNT(*)::int AS order_count,
             COALESCE(SUM(total_amount), 0)::float AS total_value
      FROM orders
      WHERE status NOT IN ('CANCELLED', 'REJECTED') ${andSql}
      GROUP BY 1, date_trunc('month', created_at)
      ORDER BY date_trunc('month', created_at) ASC
    `;
  }

  const [
    usersByRole,
    usersByStatus,
    vesselsByStatus,
    batchesByStatus,
    ordersByStatus,
    revenue,
    speciesVolume,
    monthlyOrders
  ] = await Promise.all([
    countBy('users', 'role'),
    countBy('users', 'status'),
    countBy('vessels', 'status'),
    countBy('seafood_batches', 'status', dateFilter.whereSql, params),
    countBy('orders', 'status', dateFilter.whereSql, params),
    pool.query(revenueQuery, params),
    pool.query(speciesVolumeQuery, batchDateFilter.params),
    pool.query(trendQuery, params)
  ]);

  return {
    period: filters.period || 'all',
    users: { by_role: usersByRole, by_status: usersByStatus },
    vessels: { by_status: vesselsByStatus },
    batches: { by_status: batchesByStatus },
    orders: { by_status: ordersByStatus, ...revenue.rows[0] },
    species_volume: speciesVolume.rows,
    monthly_orders: monthlyOrders.rows
  };
};

module.exports = { listUsers, updateUser, getStats };
