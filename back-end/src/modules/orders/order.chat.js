const pool = require('../../config/database');
const chatService = require('../chat/chat.service');

/**
 * Gửi tin hệ thống của 1 đơn hàng vào chat giữa người mua và người bán (làm bằng chứng cho cả 2 bên),
 * rồi phát Socket.io để app cập nhật ngay.
 * Đơn thương lượng dùng hội thoại của offer; đơn Mua ngay dùng (hoặc tạo) hội thoại giữa 2 người.
 * from: 'buyer' | 'seller' — ai là người gửi tin.
 */
const postOrderMessage = async (req, orderId, from, payload) => {
  const res = await pool.query(
    `SELECT o.buyer_id, o.seller_id, f.conversation_id
     FROM orders o LEFT JOIN offers f ON f.id = o.accepted_offer_id
     WHERE o.id = $1`,
    [orderId]
  );
  const order = res.rows[0];
  if (!order) return null;

  const conversationId =
    order.conversation_id ||
    (await chatService.findOrCreateConversation(order.buyer_id, order.seller_id)).id;
  const senderId = from === 'seller' ? order.seller_id : order.buyer_id;
  const created = await chatService.createMessage(
    conversationId,
    senderId,
    JSON.stringify({ ...payload, order_id: orderId })
  );

  const io = req.app.get('io');
  if (io) {
    io.emit(`new_message_${conversationId}`, created);
    io.emit(`payment_updated_${orderId}`, { order_id: orderId });
  }
  return conversationId;
};

/** Như postOrderMessage nhưng không làm hỏng request chính nếu gửi tin lỗi — chỉ ghi log. */
const postOrderMessageSafe = async (...args) => {
  try {
    return await postOrderMessage(...args);
  } catch (err) {
    console.error('[ORDER] Không gửi được tin vào chat:', err.message);
    return null;
  }
};

module.exports = { postOrderMessage, postOrderMessageSafe };
