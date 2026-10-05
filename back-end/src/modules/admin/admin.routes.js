const express = require('express');
const router = express.Router();
const adminController = require('./admin.controller');
const { listUsersQuerySchema, updateUserSchema, validate } = require('./admin.validation');
const authMiddleware = require('../../middleware/auth.middleware');
const requireRole = require('../../middleware/role.middleware');

// Toàn bộ route quản trị chỉ dành cho ADMIN
router.use(authMiddleware, requireRole('ADMIN'));

/**
 * @swagger
 * /api/admin/users:
 *   get:
 *     summary: Danh sách người dùng (ADMIN)
 *     tags: [Admin]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: search
 *         schema: { type: string }
 *       - in: query
 *         name: role
 *         schema: { type: string, enum: [FISHERMAN, COLLECTOR, TRADER, ADMIN] }
 *       - in: query
 *         name: status
 *         schema: { type: string, enum: [ACTIVE, INACTIVE, BANNED] }
 *     responses:
 *       200:
 *         description: Danh sách người dùng
 */
router.get('/users', validate(listUsersQuerySchema, 'query'), adminController.getUsers);

/**
 * @swagger
 * /api/admin/users/{id}:
 *   patch:
 *     summary: Đổi vai trò / trạng thái người dùng (ADMIN)
 *     tags: [Admin]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               role: { type: string, enum: [FISHERMAN, COLLECTOR, TRADER, ADMIN] }
 *               status: { type: string, enum: [ACTIVE, INACTIVE, BANNED] }
 *     responses:
 *       200:
 *         description: Cập nhật thành công
 */
router.patch('/users/:id', validate(updateUserSchema), adminController.updateUser);

/**
 * @swagger
 * /api/admin/stats:
 *   get:
 *     summary: Số liệu thống kê tổng quan (ADMIN)
 *     tags: [Admin]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Thống kê người dùng, tàu, mẻ cá, đơn hàng
 */
router.get('/stats', adminController.getStats);

module.exports = router;
