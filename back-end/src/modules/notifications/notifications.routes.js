const express = require('express');
const router = express.Router();
const notificationsController = require('./notifications.controller');
const authMiddleware = require('../../middleware/auth.middleware');

/**
 * @swagger
 * tags:
 *   name: Notifications
 *   description: API thông báo chung (bảng notifications có sẵn trong schema thật) — hiện dùng cho thông báo tin nhắn mới, mở rộng được cho đơn hàng/offer sau này mà không đổi cấu trúc
 */

// Toàn bộ route Notifications đều yêu cầu đăng nhập
router.use(authMiddleware);

/**
 * @swagger
 * /api/notifications/unread-count:
 *   get:
 *     summary: Đếm số thông báo chưa đọc của tôi (dùng cho chấm đỏ trên mobile)
 *     tags: [Notifications]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: type
 *         required: false
 *         schema:
 *           type: string
 *         description: Lọc theo notification_type, ví dụ 'NEW_MESSAGE'. Bỏ trống để đếm tất cả loại.
 *     responses:
 *       200:
 *         description: Trả về { count }
 */
router.get('/unread-count', notificationsController.getUnreadCount);

/**
 * @swagger
 * /api/notifications:
 *   get:
 *     summary: Lấy danh sách thông báo của tôi (mới nhất trước)
 *     tags: [Notifications]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Danh sách thông báo
 */
router.get('/', notificationsController.getMyNotifications);

/**
 * @swagger
 * /api/notifications/{id}/read:
 *   patch:
 *     summary: Đánh dấu 1 thông báo đã đọc
 *     tags: [Notifications]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Đã đánh dấu đã đọc
 *       404:
 *         description: Không tìm thấy thông báo
 */
router.patch('/:id/read', notificationsController.markRead);

module.exports = router;
