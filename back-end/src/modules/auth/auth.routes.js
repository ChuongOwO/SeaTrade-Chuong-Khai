const express = require('express');
const router = express.Router();
const authController = require('./auth.controller');
const passwordController = require('./password.controller');
const authMiddleware = require('../../middleware/auth.middleware');
const upload = require('../../middleware/upload.middleware');
const { forgotPasswordSchema, verifyOtpSchema, resetPasswordSchema, validate } = require('./auth.validation');

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

/**
 * @swagger
 * /api/auth/avatar:
 *   post:
 *     summary: Tải lên ảnh đại diện
 *     tags: [Auth]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               avatar:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: Cập nhật ảnh đại diện thành công
 */
router.post('/avatar', authMiddleware, upload.single('avatar'), authController.uploadAvatar);

/**
 * @swagger
 * /api/auth/forgot-password:
 *   post:
 *     summary: Yêu cầu gửi OTP quên mật khẩu
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
 *             properties:
 *               phone:
 *                 type: string
 *                 example: '0912345678'
 *     responses:
 *       200:
 *         description: Trả response chung (tránh account enumeration)
 *       400:
 *         description: Dữ liệu không hợp lệ
 *       429:
 *         description: Vượt quá giới hạn yêu cầu OTP
 */
router.post('/forgot-password', validate(forgotPasswordSchema), passwordController.forgotPassword);

/**
 * @swagger
 * /api/auth/verify-reset-otp:
 *   post:
 *     summary: Xác thực OTP và nhận reset token
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
 *               - otp
 *             properties:
 *               phone:
 *                 type: string
 *                 example: '0912345678'
 *               otp:
 *                 type: string
 *                 example: '123456'
 *                 description: Mã OTP 6 chữ số
 *     responses:
 *       200:
 *         description: OTP đúng, trả về resetToken
 *       400:
 *         description: OTP sai hoặc hết hạn
 *       429:
 *         description: Vượt quá số lần thử OTP
 */
router.post('/verify-reset-otp', validate(verifyOtpSchema), passwordController.verifyResetOtp);

/**
 * @swagger
 * /api/auth/reset-password:
 *   post:
 *     summary: Đặt mật khẩu mới sau khi xác thực OTP
 *     tags: [Auth]
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - resetToken
 *               - newPassword
 *               - confirmPassword
 *             properties:
 *               resetToken:
 *                 type: string
 *                 description: Token nhận được từ /verify-reset-otp
 *               newPassword:
 *                 type: string
 *                 example: 'NewPass123!'
 *                 description: Mật khẩu mới (tối thiểu 6 ký tự)
 *               confirmPassword:
 *                 type: string
 *                 example: 'NewPass123!'
 *                 description: Nhập lại mật khẩu mới
 *     responses:
 *       200:
 *         description: Đặt lại mật khẩu thành công
 *       400:
 *         description: Token không hợp lệ, hết hạn, hoặc đã dùng
 */
router.post('/reset-password', validate(resetPasswordSchema), passwordController.resetPassword);

module.exports = router;
