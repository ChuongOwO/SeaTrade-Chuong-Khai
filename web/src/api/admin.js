import { apiFetch } from './client';

// back-end/src/modules/admin — chỉ tài khoản ADMIN gọi được.

// filters: { search, role, status } — bỏ qua field rỗng
export async function fetchUsers(filters = {}) {
  const params = new URLSearchParams(
    Object.entries(filters).filter(([, value]) => value)
  );
  const query = params.toString();
  const res = await apiFetch(`/api/admin/users${query ? `?${query}` : ''}`);
  return res.metadata || [];
}

// changes: { role?, status? }
export async function updateUser(id, changes) {
  const res = await apiFetch(`/api/admin/users/${id}`, { method: 'PATCH', body: changes });
  return res.metadata;
}

export async function fetchAdminStats() {
  const res = await apiFetch('/api/admin/stats');
  return res.metadata;
}
