const express = require('express');
const router = express.Router();
const adminController = require('./admin.controller');
const agentController = require('./agent/agent.controller');
const {
  listUsersQuerySchema, updateUserSchema, agentChatSchema, agentConfirmSchema, validate
} = require('./admin.validation');
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

/**
 * @swagger
 * /api/admin/agent/chat:
 *   post:
 *     summary: Hỏi Trợ lý AI (ADMIN) — tra cứu dữ liệu, đề xuất thao tác cần xác nhận
 *     tags: [Admin]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [message]
 *             properties:
 *               conversationId: { type: string, format: uuid, nullable: true }
 *               message: { type: string }
 *     responses:
 *       200:
 *         description: "{ conversationId, reply, pendingActions? }"
 */
router.post('/agent/chat', validate(agentChatSchema), agentController.chat);

/**
 * @swagger
 * /api/admin/agent/confirm:
 *   post:
 *     summary: Duyệt / từ chối các thao tác Trợ lý AI đề xuất (ADMIN)
 *     tags: [Admin]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [conversationId, decisions]
 *             properties:
 *               conversationId: { type: string, format: uuid }
 *               decisions:
 *                 type: object
 *                 additionalProperties: { type: boolean }
 *     responses:
 *       200:
 *         description: "{ conversationId, executed, reply, pendingActions? }"
 */
router.post('/agent/confirm', validate(agentConfirmSchema), agentController.confirm);

module.exports = router;
