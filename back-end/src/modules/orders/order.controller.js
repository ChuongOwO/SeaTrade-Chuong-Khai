const orderService = require('./order.service');

// [GET] /api/orders — Lấy danh sách đơn hàng của tôi
const getMyOrders = async (req, res, next) => {
  try {
    const orders = await orderService.getOrdersByUser(req.user.id);
    res.json({
      status: 200,
      message: 'Lấy danh sách đơn hàng thành công',
      metadata: orders
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { getMyOrders };
