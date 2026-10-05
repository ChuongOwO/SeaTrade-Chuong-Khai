const express = require('express');
const router = express.Router();
const orderController = require('./order.controller');
const authMiddleware = require('../../middleware/auth.middleware');

router.use(authMiddleware);

// Lấy danh sách đơn hàng của tôi
router.get('/', orderController.getMyOrders);

module.exports = router;
