// Middleware RBAC (Role-Based Access Control) dùng chung cho các route cần
// giới hạn theo vai trò (role) của tài khoản đăng nhập.
//
// LUÔN gắn SAU authMiddleware trong chuỗi middleware của route, vì cần
// req.user đã được auth.middleware.js giải mã từ JWT (req.user.role có sẵn vì
// auth.controller.js ký token bằng { id: user.id, role: user.role }).
//
// Cách dùng (ví dụ áp cho 1 route chỉ Admin được gọi):
//   const authMiddleware = require('../../middleware/auth.middleware');
//   const requireRole = require('../../middleware/role.middleware');
//   router.get('/admin-only', authMiddleware, requireRole('ADMIN'), controller.fn);
//
// Cho phép nhiều vai trò cùng lúc:
//   requireRole('ADMIN', 'TRADER')
const requireRole = (...allowedRoles) => (req, res, next) => {
  if (!req.user || !req.user.role) {
    // Không có req.user nghĩa là quên gắn authMiddleware trước middleware này,
    // hoặc token không mang role -> coi như chưa xác thực.
    return res.status(401).json({
      status: 401,
      message: 'Không tìm thấy thông tin vai trò (Unauthorized)'
    });
  }

  if (!allowedRoles.includes(req.user.role)) {
    return res.status(403).json({
      status: 403,
      message: `Vai trò '${req.user.role}' không có quyền truy cập chức năng này`
    });
  }

  next();
};

module.exports = requireRole;
