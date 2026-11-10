// Câu xem trước cho danh sách hội thoại. Tin hệ thống được lưu dạng JSON có __type
// (xem ChatThread.js parseMessageContent) — không hiển thị nguyên chuỗi JSON cho người dùng.
// Giữ đồng bộ với mobile/src/utils/messagePreview.js.

const formatVND = (n) => `${Number(n || 0).toLocaleString('vi-VN')}đ`;

const PREVIEWS = {
  IMAGE: () => '📷 Hình ảnh',
  LOCATION: () => '📍 Vị trí tàu',
  PRICE_OFFER: (d) => `${d.is_counter ? '💬 Trả giá' : '💰 Đề xuất giá'}: ${formatVND(d.price_per_kg)}/kg × ${d.quantity_kg}kg`,
  OFFER_ACCEPTED: (d) => `✅ Đã chốt đơn ${formatVND(d.total)}`,
  OFFER_REJECTED: () => '❌ Đã từ chối đề xuất giá',
  BUY_NOW_ORDER: (d) => `⚡ Mua ngay cả mẻ ${formatVND(d.total)}`,
  PAYMENT_SUCCESS: (d) => `💳 Đã thanh toán ${formatVND(d.amount)} qua VNPay`,
  PAYMENT_RECEIVED: (d) => `💵 Người bán đã xác nhận nhận ${formatVND(d.amount)}`,
};

function previewMessage(raw) {
  if (!raw) return 'Chưa có tin nhắn';
  if (!raw.startsWith('{')) return raw;
  try {
    const data = JSON.parse(raw);
    const build = PREVIEWS[data.__type];
    return build ? build(data) : 'Tin nhắn đính kèm';
  } catch {
    return raw;
  }
}

module.exports = { previewMessage };
