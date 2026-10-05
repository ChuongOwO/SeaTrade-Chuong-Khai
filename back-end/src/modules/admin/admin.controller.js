const adminService = require('./admin.service');

// [GET] /api/admin/users?search=&role=&status=
const getUsers = async (req, res, next) => {
  try {
    const users = await adminService.listUsers(req.query);
    res.json({
      status: 200,
      message: 'Lấy danh sách người dùng thành công',
      metadata: users
    });
  } catch (error) {
    next(error);
  }
};

// [PATCH] /api/admin/users/:id — đổi vai trò / khoá - mở khoá tài khoản
const updateUser = async (req, res, next) => {
  try {
    // Không cho admin tự hạ quyền hoặc tự khoá chính mình (tránh mất quyền quản trị)
    if (req.params.id === req.user.id) {
      return res.status(400).json({
        status: 400,
        message: 'Không thể tự thay đổi vai trò hoặc trạng thái của chính mình'
      });
    }

    const user = await adminService.updateUser(req.params.id, req.body);
    if (!user) {
      return res.status(404).json({ status: 404, message: 'Không tìm thấy người dùng' });
    }

    res.json({
      status: 200,
      message: 'Cập nhật người dùng thành công',
      metadata: user
    });
  } catch (error) {
    next(error);
  }
};

// [GET] /api/admin/stats
const getStats = async (req, res, next) => {
  try {
    const stats = await adminService.getStats();
    res.json({
      status: 200,
      message: 'Lấy số liệu thống kê thành công',
      metadata: stats
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { getUsers, updateUser, getStats };
