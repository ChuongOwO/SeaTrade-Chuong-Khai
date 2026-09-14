import { apiFetch } from './client';

// Vị trí GPS mới nhất của tất cả tàu đang hoạt động — dùng cho Bản Đồ Hải
// Trình (MaritimeMap.jsx). Khớp trực tiếp back-end/src/modules/vessels/
// vessel.controller.js (GET /api/vessels/locations) — đã đọc code thật,
// không phải thiết kế tạm như web/src/api/chat.js.
export async function fetchVesselsLocations() {
  const res = await apiFetch('/api/vessels/locations');
  return res.metadata || [];
}
