import { apiFetch } from './client';

// back-end/src/modules/orders — ADMIN nhận toàn bộ đơn hàng, các vai trò khác
// chỉ nhận đơn mình là người mua hoặc người bán.
export async function fetchOrders() {
  const res = await apiFetch('/api/orders');
  return res.metadata || [];
}

// Chỉ ADMIN gọi được (requireRole('ADMIN') ở order.routes.js)
export async function updateOrderStatus(id, status) {
  const res = await apiFetch(`/api/orders/${id}/status`, { method: 'PATCH', body: { status } });
  return res.metadata;
}
