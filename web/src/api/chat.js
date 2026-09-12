import { apiFetch } from './client';

// ============================================================================
// ⚠️ CHƯA XÁC NHẬN VỚI ĐỒNG ĐỘI ⚠️
//
// Tính đến thời điểm viết file này, back-end/src/modules/ chỉ có 4 module:
// ai, auth, seafood, vessels — KHÔNG có module chat/conversation/message nào,
// và server.js cũng chưa mount route nào tên chat/conversation. Vậy nên các
// endpoint dưới đây là THIẾT KẾ TẠM, đặt theo đúng quy ước REST mà các module
// khác đang dùng (VD: GET/POST /api/seafood/batches, /api/vessels...).
//
// Khi đồng đội xác nhận API chat thật (endpoint, tên field, có phải Bearer
// token không, REST hay Socket.IO...), CHỈ CẦN SỬA LẠI file này — phần UI ở
// ChatPanel.jsx gọi qua fetchMessages()/sendMessage() nên không cần đổi.
//
// Giả định tạm đang dùng:
//   - Mỗi đơn hàng (order) có 1 cuộc hội thoại riêng, gắn theo order_id.
//   - GET  /api/orders/:orderId/messages  -> { status, message, metadata: Message[] }
//   - POST /api/orders/:orderId/messages  body: { content } -> { metadata: Message }
//   - Message = { id, order_id, sender_id, content, created_at }
// ============================================================================

export async function fetchMessages(orderId) {
  const res = await apiFetch(`/api/orders/${orderId}/messages`);
  return res.metadata || [];
}

export async function sendMessage(orderId, content) {
  const res = await apiFetch(`/api/orders/${orderId}/messages`, {
    method: 'POST',
    body: { content },
  });
  return res.metadata;
}
