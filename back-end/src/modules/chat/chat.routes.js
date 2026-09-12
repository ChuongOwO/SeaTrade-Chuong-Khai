const express = require('express');
const router = express.Router();
const chatController = require('./chat.controller');
const authMiddleware = require('../../middleware/auth.middleware');
const { startConversationSchema, sendMessageSchema, validate } = require('./chat.validation');

/**
 * @swagger
 * tags:
 *   name: Chat
 *   description: API Nhắn tin giữa người dùng (ngư dân/thương lái) — dựa trên bảng conversations/messages có sẵn trong DB
 */

// Toàn bộ route Chat đều yêu cầu đăng nhập
router.use(authMiddleware);

/**
 * @swagger
 * /api/chat/conversations:
 *   post:
 *     summary: Bắt đầu (hoặc mở lại) cuộc hội thoại với 1 người dùng khác theo SĐT
 *     tags: [Chat]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - peer_phone
 *             properties:
 *               peer_phone:
 *                 type: string
 *                 example: '0912345678'
 *               listing_id:
 *                 type: string
 *                 description: Gắn hội thoại vào 1 bài đăng (seafood_listings) cụ thể — chưa bắt buộc vì module Listing chưa có API
 *               order_id:
 *                 type: string
 *                 description: Gắn hội thoại vào 1 đơn hàng (orders) cụ thể — chưa bắt buộc vì module Order chưa có API
 *     responses:
 *       201:
 *         description: Trả về conversation (tạo mới hoặc đã có sẵn)
 *       404:
 *         description: Không tìm thấy người dùng với SĐT này
 *   get:
 *     summary: Lấy danh sách hội thoại của tôi
 *     tags: [Chat]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Danh sách hội thoại, sắp xếp theo hoạt động mới nhất (updated_at)
 */
router.post('/conversations', validate(startConversationSchema), chatController.startConversation);
router.get('/conversations', chatController.getMyConversations);

/**
 * @swagger
 * /api/chat/conversations/{id}/messages:
 *   get:
 *     summary: Lấy toàn bộ tin nhắn trong 1 cuộc hội thoại (tự đánh dấu đã đọc)
 *     tags: [Chat]
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
 *         description: Danh sách tin nhắn, sắp xếp cũ -> mới
 *       403:
 *         description: Bạn không thuộc cuộc hội thoại này
 *   post:
 *     summary: Gửi 1 tin nhắn vào cuộc hội thoại
 *     tags: [Chat]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - message
 *             properties:
 *               message:
 *                 type: string
 *                 example: 'Tôm còn tươi không anh?'
 *     responses:
 *       201:
 *         description: Gửi tin nhắn thành công
 *       403:
 *         description: Bạn không thuộc cuộc hội thoại này
 */
router.get('/conversations/:id/messages', chatController.getMessages);
router.post('/conversations/:id/messages', validate(sendMessageSchema), chatController.postMessage);

module.exports = router;
