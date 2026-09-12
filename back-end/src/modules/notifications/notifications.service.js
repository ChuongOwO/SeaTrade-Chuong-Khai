const pool = require('../../config/database');

// Đếm số thông báo CHƯA ĐỌC của 1 user — dùng cho chấm đỏ trên mobile.
// Truyền `type` để chỉ đếm 1 loại (vd 'NEW_MESSAGE'); bỏ trống thì đếm hết.
const countUnread = async (userId, type = null) => {
  const result = await pool.query(
    `SELECT COUNT(*)::int AS count FROM notifications
     WHERE user_id = $1 AND is_read = FALSE
       AND ($2::varchar IS NULL OR notification_type = $2)`,
    [userId, type]
  );
  return result.rows[0].count;
};

// Danh sách thông báo của 1 user, mới nhất trước. Chưa có màn hình mobile nào
// dùng tới trong lần này (mobile mới chỉ cần đếm số để hiện chấm đỏ), để sẵn
// cho sau vì bảng notifications dùng chung được cho nhiều loại thông báo khác.
const listForUser = async (userId, limit = 50) => {
  const result = await pool.query(
    `SELECT id, title, content, notification_type, reference_id, is_read, created_at
     FROM notifications WHERE user_id = $1
     ORDER BY created_at DESC LIMIT $2`,
    [userId, limit]
  );
  return result.rows;
};

const markRead = async (id, userId) => {
  const result = await pool.query(
    `UPDATE notifications SET is_read = TRUE
     WHERE id = $1 AND user_id = $2
     RETURNING id, title, content, notification_type, reference_id, is_read, created_at`,
    [id, userId]
  );
  return result.rows[0];
};

module.exports = { countUnread, listForUser, markRead };
