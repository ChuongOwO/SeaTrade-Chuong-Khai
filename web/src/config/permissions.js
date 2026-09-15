// Bảng phân quyền RBAC (Role-Based Access Control) phía web admin — nguồn
// DUY NHẤT quyết định vai trò nào được dùng tab nào trong sidebar.
//
// Navbar.jsx tra bảng này để ẩn/hiện mục menu, App.jsx tra lại lần nữa trước
// khi render nội dung tab (phòng trường hợp activeTab bị set sai vì lý do gì
// đó) — cả 2 nơi dùng chung 1 bảng để tránh lặp/lệch logic phân quyền.
//
// Đây là RBAC đơn giản (không phân cấp vai trò, không điều kiện ngữ cảnh):
// quyền chỉ phụ thuộc trực tiếp vào cột `role` của tài khoản.
export const ROLE_ALLOWED_TABS = {
  // Admin: toàn quyền quản trị hệ thống.
  ADMIN: ['admin', 'orders', 'fleet', 'analytics', 'mobile', 'ai-vision', 'sea-map', 'user-manual'],
  // Thuyền trưởng tàu đánh bắt: chỉ dùng các công cụ tác nghiệp của mình,
  // không thấy các trang quản trị hệ thống (Web Admin/Đơn Hàng/Đội Tàu/Thống Kê).
  FISHERMAN: ['mobile', 'ai-vision', 'sea-map', 'user-manual'],
  // Tàu thu gom / thương lái: tương tự Fisherman.
  TRADER: ['mobile', 'ai-vision', 'sea-map', 'user-manual'],
  // COLLECTOR dùng chung giao diện với TRADER (xem web/src/api/roleMeta.js).
  COLLECTOR: ['mobile', 'ai-vision', 'sea-map', 'user-manual'],
};

const DEFAULT_ALLOWED_TABS = ROLE_ALLOWED_TABS.FISHERMAN;

export function getAllowedTabs(role) {
  return ROLE_ALLOWED_TABS[role] || DEFAULT_ALLOWED_TABS;
}

export function canAccessTab(role, tabId) {
  return getAllowedTabs(role).includes(tabId);
}
