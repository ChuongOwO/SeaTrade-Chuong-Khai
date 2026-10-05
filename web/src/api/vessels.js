import { apiFetch } from './client';

// Vị trí GPS mới nhất của tất cả tàu đang hoạt động — dùng cho Bản Đồ Hải
// Trình (MaritimeMap.jsx). Khớp trực tiếp back-end/src/modules/vessels/
// vessel.controller.js (GET /api/vessels/locations) — đã đọc code thật,
// không phải thiết kế tạm như web/src/api/chat.js.
export async function fetchVesselsLocations() {
  const res = await apiFetch('/api/vessels/locations');
  return res.metadata || [];
}

// CRUD tàu — back-end/src/modules/vessels. Với tài khoản ADMIN, GET /api/vessels
// trả về toàn bộ tàu (kèm owner_name, owner_phone, vị trí mới nhất); các vai
// trò khác chỉ nhận tàu của chính mình.
export async function fetchVessels() {
  const res = await apiFetch('/api/vessels');
  return res.metadata || [];
}

export async function createVessel(data) {
  const res = await apiFetch('/api/vessels', { method: 'POST', body: data });
  return res.metadata;
}

export async function updateVessel(id, data) {
  const res = await apiFetch(`/api/vessels/${id}`, { method: 'PUT', body: data });
  return res.metadata;
}

export async function deleteVessel(id) {
  await apiFetch(`/api/vessels/${id}`, { method: 'DELETE' });
}
