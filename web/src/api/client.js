// Lớp gọi API dùng chung cho toàn bộ web app (SeaTrade AI).
//
// Trước bản này, web hoàn toàn không gọi API back-end thật (xem lịch sử: LoginScreen.jsx
// cũ chỉ là role-picker, không có fetch/axios nào trong toàn bộ src/). File này là lớp
// gọi API "thật" đầu tiên trong dự án, nên các phần khác (posts/orders/vessels...) muốn
// nối vào back-end sau này có thể tái sử dụng apiFetch() bên dưới.
//
// Base URL đọc từ biến môi trường VITE_API_BASE_URL (Vite), mặc định trỏ về
// http://localhost:5000 — khớp với PORT mặc định trong back-end/src/config/env.js.
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

const TOKEN_STORAGE_KEY = 'seatrade_auth_token';

export function getToken() {
  try {
    return localStorage.getItem(TOKEN_STORAGE_KEY);
  } catch {
    // Trình duyệt chặn localStorage (chế độ ẩn danh nghiêm ngặt...) -> coi như chưa đăng nhập
    return null;
  }
}

export function setToken(token) {
  try {
    if (token) localStorage.setItem(TOKEN_STORAGE_KEY, token);
    else localStorage.removeItem(TOKEN_STORAGE_KEY);
  } catch {
    // Không lưu được thì thôi, chỉ ảnh hưởng việc giữ đăng nhập qua F5
  }
}

export class ApiError extends Error {
  constructor(message, status, data) {
    super(message);
    this.name = 'ApiError';
    this.status = status; // 0 = lỗi mạng/không kết nối được tới server
    this.data = data;
  }
}

/**
 * Gọi API back-end, tự đính kèm JWT (nếu đã đăng nhập) qua header
 * `Authorization: Bearer <token>` — đúng định dạng auth.middleware.js đang kiểm tra.
 * Lỗi trả về là ApiError với message tiếng Việt lấy thẳng từ response backend
 * (backend luôn trả { status, message, ... } theo pattern trong auth.controller.js).
 */
export async function apiFetch(path, { method = 'GET', body, headers = {}, isFormData = false } = {}) {
  const token = getToken();

  const finalHeaders = { ...headers };
  if (!isFormData) finalHeaders['Content-Type'] = 'application/json';
  if (token) finalHeaders['Authorization'] = `Bearer ${token}`;

  let response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      method,
      headers: finalHeaders,
      body: body === undefined ? undefined : (isFormData ? body : JSON.stringify(body)),
    });
  } catch (networkError) {
    throw new ApiError(
      `Không kết nối được tới máy chủ (${API_BASE_URL}). Kiểm tra back-end đã chạy chưa.`,
      0,
      null
    );
  }

  let data = null;
  try {
    data = await response.json();
  } catch {
    // Response không có JSON body (VD: 204 No Content) -> bỏ qua, coi data = null
  }

  if (!response.ok) {
    throw new ApiError(
      data?.message || `Lỗi không xác định (HTTP ${response.status})`,
      response.status,
      data
    );
  }

  return data;
}
