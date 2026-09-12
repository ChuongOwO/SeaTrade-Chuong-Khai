const pool = require('../../config/database');

// Tìm user theo SĐT (dùng để bắt đầu 1 cuộc hội thoại mới bằng SĐT của đối tác)
const findUserByPhone = async (phone) => {
  const result = await pool.query(
    'SELECT id, phone, full_name, avatar_url, role FROM users WHERE phone = $1',
    [phone]
  );
  return result.rows[0];
};

// Tìm (hoặc tạo mới nếu chưa có) cuộc hội thoại giữa 2 user. Bảng conversations
// thật dùng buyer_id/seller_id (không đối xứng như user_a/user_b) nên khi tìm
// lại phải kiểm tra cả 2 chiều (A là buyer-B là seller, hoặc ngược lại) để
// không tạo trùng 2 conversation cho cùng 1 cặp người dùng.
// listingId/orderId để NULL khi bắt đầu chat trực tiếp qua SĐT (chưa gắn vào
// 1 bài đăng/đơn hàng cụ thể nào — 2 module đó backend chưa có API).
const findOrCreateConversation = async (myId, peerId, listingId = null, orderId = null) => {
  const existing = await pool.query(
    `SELECT * FROM conversations
     WHERE ((buyer_id = $1 AND seller_id = $2) OR (buyer_id = $2 AND seller_id = $1))
       AND listing_id IS NOT DISTINCT FROM $3
       AND order_id IS NOT DISTINCT FROM $4`,
    [myId, peerId, listingId, orderId]
  );
  if (existing.rows[0]) return existing.rows[0];

  // Người bắt đầu cuộc trò chuyện được ghi là buyer_id theo quy ước đơn giản —
  // khi chưa gắn với 1 giao dịch cụ thể thì nhãn buyer/seller chỉ mang tính
  // hình thức để khớp đúng cấu trúc bảng thật, không ảnh hưởng chức năng chat.
  const inserted = await pool.query(
    `INSERT INTO conversations (buyer_id, seller_id, listing_id, order_id)
     VALUES ($1, $2, $3, $4)
     RETURNING *`,
    [myId, peerId, listingId, orderId]
  );
  return inserted.rows[0];
};

const checkParticipant = async (conversationId, userId) => {
  const result = await pool.query(
    'SELECT id FROM conversations WHERE id = $1 AND (buyer_id = $2 OR seller_id = $2)',
    [conversationId, userId]
  );
  return result.rows.length > 0;
};

// Danh sách hội thoại của 1 user, kèm thông tin người còn lại + tin nhắn gần nhất,
// sắp xếp theo hoạt động mới nhất trước (updated_at được tự cập nhật bởi trigger
// trg_conversations_updated_at mỗi khi có tin nhắn mới — xem createMessage()).
const listConversationsForUser = async (userId) => {
  const query = `
    SELECT
      c.id, c.listing_id, c.order_id, c.created_at, c.updated_at,
      CASE WHEN c.buyer_id = $1 THEN c.seller_id ELSE c.buyer_id END AS peer_id,
      json_build_object(
        'id', peer.id, 'full_name', peer.full_name,
        'phone', peer.phone, 'avatar_url', peer.avatar_url
      ) AS peer,
      lm.message AS last_message,
      lm.sender_id AS last_message_sender_id
    FROM conversations c
    JOIN users peer ON peer.id = CASE WHEN c.buyer_id = $1 THEN c.seller_id ELSE c.buyer_id END
    LEFT JOIN LATERAL (
      SELECT message, sender_id FROM messages
      WHERE conversation_id = c.id
      ORDER BY created_at DESC
      LIMIT 1
    ) lm ON true
    WHERE c.buyer_id = $1 OR c.seller_id = $1
    ORDER BY c.updated_at DESC
  `;
  const result = await pool.query(query, [userId]);
  return result.rows;
};

const listMessages = async (conversationId) => {
  const result = await pool.query(
    `SELECT id, conversation_id, sender_id, message, is_read, created_at
     FROM messages WHERE conversation_id = $1
     ORDER BY created_at ASC`,
    [conversationId]
  );
  return result.rows;
};

// Đánh dấu đã đọc mọi tin nhắn KHÔNG phải do chính mình gửi trong hội thoại
// này — tận dụng đúng cột is_read có sẵn trong bảng thật.
const markMessagesRead = async (conversationId, readerId) => {
  await pool.query(
    `UPDATE messages SET is_read = TRUE
     WHERE conversation_id = $1 AND sender_id <> $2 AND is_read = FALSE`,
    [conversationId, readerId]
  );
};

const createMessage = async (conversationId, senderId, message) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const inserted = await client.query(
      `INSERT INTO messages (conversation_id, sender_id, message)
       VALUES ($1, $2, $3)
       RETURNING id, conversation_id, sender_id, message, is_read, created_at`,
      [conversationId, senderId, message]
    );
    // Bảng thật có trigger trg_conversations_updated_at BEFORE UPDATE, chỉ cần
    // chạm 1 câu UPDATE là updated_at tự set lại = CURRENT_TIMESTAMP.
    await client.query(
      'UPDATE conversations SET updated_at = CURRENT_TIMESTAMP WHERE id = $1',
      [conversationId]
    );
    await client.query('COMMIT');
    return inserted.rows[0];
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
};

module.exports = {
  findUserByPhone,
  findOrCreateConversation,
  checkParticipant,
  listConversationsForUser,
  listMessages,
  markMessagesRead,
  createMessage
};
