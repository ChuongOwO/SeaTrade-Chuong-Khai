const express = require('express');
const router = express.Router();
const authController = require('./auth.controller');
const authMiddleware = require('../../middleware/auth.middleware');

/**
 * @swagger
 * tags:
 *   name: Auth
 *   description: API Quản lý Xác thực Người dùng
 */

/**
 * @swagger
 * /api/auth/register:
 *   post:
 *     summary: Đăng ký tài khoản mới
 *     tags: [Auth]
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - phone
 *               - password
 *               - full_name
 *             properties:
 *               phone:
 *                 type: string
 *                 example: '0912345678'
 *               email:
 *                 type: string
 *                 example: 'test@example.com'
 *               password:
 *                 type: string
 *                 example: '123456'
 *               full_name:
 *                 type: string
 *                 example: 'Nguyễn Văn A'
 *               role:
 *                 type: string
 *                 enum: [FISHERMAN, COLLECTOR, TRADER]
 *                 example: 'FISHERMAN'
 *     responses:
 *       201:
 *         description: Đăng ký thành công
 */
router.post('/register', authController.register);

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: Đăng nhập hệ thống
 *     tags: [Auth]
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - phone
 *               - password
 *             properties:
 *               phone:
 *                 type: string
 *                 example: '0912345678'
 *               password:
 *                 type: string
 *                 example: '123456'
 *     responses:
 *       200:
 *         description: Đăng nhập thành công, trả về token
 *       401:
 *         description: Sai số điện thoại hoặc mật khẩu
 */
router.post('/login', authController.login);

/**
 * @swagger
 * /api/auth/me:
 *   get:
 *     summary: Lấy thông tin cá nhân của người dùng hiện tại
 *     tags: [Auth]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Trả về thông tin chi tiết user
 *       401:
 *         description: Không có Token hoặc Token không hợp lệ
 */
router.get('/me', authMiddleware, authController.getMe);

module.exports = router;
