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
const countBy = async (table, column) => {
  const result = await pool.query(
    `SELECT ${column} AS key, COUNT(*)::int AS count FROM ${table} GROUP BY ${column}`
  );
  return Object.fromEntries(result.rows.map(row => [row.key, row.count]));
};

/**
 * Số liệu tổng quan cho trang Thống Kê của web admin.
 * Giá trị giao dịch bỏ qua đơn CANCELLED / REJECTED.
 */
const getStats = async () => {
  const [usersByRole, usersByStatus, vesselsByStatus, batchesByStatus, ordersByStatus, revenue, speciesVolume, monthlyOrders] =
    await Promise.all([
      countBy('users', 'role'),
      countBy('users', 'status'),
      countBy('vessels', 'status'),
      countBy('seafood_batches', 'status'),
      countBy('orders', 'status'),
      pool.query(`
        SELECT COALESCE(SUM(total_amount), 0)::float AS total_value, COUNT(*)::int AS order_count
        FROM orders WHERE status NOT IN ('CANCELLED', 'REJECTED')
      `),
      pool.query(`
        SELECT s.name_vi AS species, SUM(b.quantity_kg)::float AS total_kg, COUNT(*)::int AS batch_count
        FROM seafood_batches b
        JOIN seafood_species s ON s.id = b.species_id
        GROUP BY s.name_vi
        ORDER BY total_kg DESC
      `),
      pool.query(`
        SELECT to_char(date_trunc('month', created_at), 'YYYY-MM') AS month,
               COUNT(*)::int AS order_count,
               COALESCE(SUM(total_amount), 0)::float AS total_value
        FROM orders
        WHERE status NOT IN ('CANCELLED', 'REJECTED')
          AND created_at >= date_trunc('month', NOW()) - INTERVAL '5 months'
        GROUP BY 1
        ORDER BY 1
      `)
    ]);

  return {
    users: { by_role: usersByRole, by_status: usersByStatus },
    vessels: { by_status: vesselsByStatus },
    batches: { by_status: batchesByStatus },
    orders: { by_status: ordersByStatus, ...revenue.rows[0] },
    species_volume: speciesVolume.rows,
    monthly_orders: monthlyOrders.rows
  };
};

module.exports = { listUsers, updateUser, getStats };
