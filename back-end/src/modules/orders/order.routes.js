const express = require('express');
const router = express.Router();
const orderController = require('./order.controller');
const authMiddleware = require('../../middleware/auth.middleware');
const requireRole = require('../../middleware/role.middleware');

router.use(authMiddleware);

// Lấy danh sách đơn hàng của tôi
router.get('/', orderController.getMyOrders);

// Mua ngay cả mẻ theo giá niêm yết  body: { batch_id }
router.post('/buy-now', orderController.buyNow);

router.patch('/:id/status', requireRole('ADMIN'), orderController.updateOrderStatus);

module.exports = router;
