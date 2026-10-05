const orderService = require('./order.service');

// Khớp enum order_status trong migrations/V1__init_schema.sql
const ORDER_STATUSES = ['PENDING', 'CONFIRMED', 'IN_TRANSIT', 'DELIVERED', 'CANCELLED', 'REJECTED'];

// [GET] /api/orders — Đơn hàng của tôi (ADMIN: toàn bộ đơn hàng)
const getMyOrders = async (req, res, next) => {
  try {
    const userId = req.user.role === 'ADMIN' ? null : req.user.id;
    const orders = await orderService.getOrdersByUser(userId);
    res.json({
      status: 200,
      message: 'Lấy danh sách đơn hàng thành công',
      metadata: orders
    });
  } catch (error) {
    next(error);
  }
};

// [PATCH] /api/orders/:id/status — ADMIN cập nhật trạng thái đơn
const updateOrderStatus = async (req, res, next) => {
  try {
    const { status } = req.body;
    if (!ORDER_STATUSES.includes(status)) {
      return res.status(400).json({
        status: 400,
        message: `Trạng thái không hợp lệ. Chỉ chấp nhận: ${ORDER_STATUSES.join(', ')}`
      });
    }

    const order = await orderService.updateOrderStatus(req.params.id, status);
    if (!order) {
      return res.status(404).json({ status: 404, message: 'Không tìm thấy đơn hàng' });
    }

    res.json({
      status: 200,
      message: 'Cập nhật trạng thái đơn hàng thành công',
      metadata: order
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { getMyOrders, updateOrderStatus };
