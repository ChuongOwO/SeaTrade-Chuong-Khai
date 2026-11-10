const express = require('express');
const router = express.Router();
const paymentController = require('./payment.controller');
const authMiddleware = require('../../middleware/auth.middleware');

// --- Route công khai: VNPay / trình duyệt gọi, bảo vệ bằng chữ ký HMAC-SHA512 (không dùng JWT) ---
router.get('/vnpay/ipn', paymentController.vnpayIpn);
router.get('/vnpay/return', paymentController.vnpayReturn);

// --- Route cần đăng nhập ---
router.post('/vnpay/create', authMiddleware, paymentController.createVnpayPayment);
router.get('/order/:orderId', authMiddleware, paymentController.getPaymentsByOrder);
router.post('/order/:orderId/confirm-received', authMiddleware, paymentController.confirmReceived);
router.get('/:id', authMiddleware, paymentController.getPaymentById);

module.exports = router;
