import { apiFetch, setToken } from './client';

// Khớp đúng với back-end/src/modules/auth/auth.routes.js + auth.controller.js thật
// (không phải thiết kế giả định — đã đọc trực tiếp code backend).

// POST /api/auth/register — yêu cầu bắt buộc: phone, password, full_name.
export async function registerAccount({ phone, password, full_name, role, email }) {
  const res = await apiFetch('/api/auth/register', {
    method: 'POST',
    body: { phone, password, full_name, role, email },
  });
  // auth.controller.js trả về: { status, message, metadata: { user, token } }
  setToken(res.metadata.token);
  return res.metadata.user;
}

// POST /api/auth/login — yêu cầu: phone, password.
export async function loginAccount({ phone, password }) {
  const res = await apiFetch('/api/auth/login', {
    method: 'POST',
    body: { phone, password },
  });
  setToken(res.metadata.token);
  return res.metadata.user;
}

// GET /api/auth/me — cần Bearer token, dùng để tự đăng nhập lại khi F5 trang.
export async function fetchCurrentUser() {
  const res = await apiFetch('/api/auth/me');
  return res.metadata;
}

export function logoutAccount() {
  setToken(null);
}
