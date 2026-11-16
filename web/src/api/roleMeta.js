// Ánh xạ giữa "role" thật lưu trong DB (bảng users, xem back-end/src/modules/auth)
// và cách web hiển thị/điều hướng theo vai trò.
//
// Lưu ý quan trọng: back-end HIỆN TẠI không giới hạn giá trị role bằng CHECK
// constraint hay Joi validation nào ở /api/auth/register hay /api/auth/login
// (auth.controller.js chỉ có `const userRole = role || 'FISHERMAN'`, không có
// validate() middleware như forgot-password). Swagger doc ghi enum
// [FISHERMAN, COLLECTOR, TRADER] nhưng đó chỉ là mô tả, không phải ràng buộc thật.
// Nên về lý thuyết role có thể là chuỗi bất kỳ — ROLE_META dưới đây map các giá
// trị đã biết, giá trị lạ sẽ fallback về FISHERMAN (xem buildUserFromBackend).
export const ROLE_META = {
  FISHERMAN: {
    label: 'Thuyền Trưởng Tàu Đánh Bắt',
    defaultTab: 'sea-map',
  },
  TRADER: {
    label: 'Tàu Thu Gom / Thương Lái',
    defaultTab: 'sea-map',
  },
  COLLECTOR: {
    label: 'Tàu Thu Gom / Thương Lái',
    defaultTab: 'sea-map',
  },
  ADMIN: {
    label: 'Quản Trị Viên',
    defaultTab: 'admin',
  },
};

// Chuyển user object trả về từ backend (auth.controller.js: register/login/getMe)
// thành user object mà App.jsx / Navbar.jsx đang cần (name, roleLabel, defaultTab).
export function buildUserFromBackend(backendUser) {
  const roleKey = (backendUser.role || 'FISHERMAN').toUpperCase();
  const meta = ROLE_META[roleKey] || ROLE_META.FISHERMAN;
  return {
    id: backendUser.id,
    phone: backendUser.phone,
    name: backendUser.full_name,
    role: roleKey,
    roleLabel: meta.label,
    defaultTab: meta.defaultTab,
  };
}
