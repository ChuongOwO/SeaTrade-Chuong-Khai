const express = require('express');
const router = express.Router();
const imageController = require('./image.controller');
const { createImageSchema, updateImageSchema, validate } = require('./image.validation');
const authMiddleware = require('../../middleware/auth.middleware');

// Áp dụng middleware auth cho TOÀN BỘ các route
router.use(authMiddleware);

/**
 * @swagger
 * tags:
 *   name: Seafood Images
 *   description: API Quản lý URL ảnh của lô hàng hải sản
 */

/**
 * @swagger
 * /api/seafood/images:
 *   post:
 *     summary: Thêm metadata ảnh mới cho lô hàng (yêu cầu quyền chủ tàu)
 *     tags: [Seafood Images]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - batch_id
 *               - image_url
 *             properties:
 *               batch_id:
 *                 type: string
 *                 format: uuid
 *                 example: '123e4567-e89b-12d3-a456-426614174000'
 *               image_url:
 *                 type: string
 *                 format: uri
 *                 example: 'https://example.com/image.jpg'
 *               thumbnail_url:
 *                 type: string
 *                 format: uri
 *                 example: 'https://example.com/thumb.jpg'
 *               captured_at:
 *                 type: string
 *                 format: date-time
 *     responses:
 *       201:
 *         description: Thêm ảnh thành công
 *       400:
 *         description: Dữ liệu không hợp lệ
 *       403:
 *         description: Lô hàng không tồn tại hoặc không có quyền thao tác
 */
router.post('/', validate(createImageSchema), imageController.createImage);

/**
 * @swagger
 * /api/seafood/images/batch/{batchId}:
 *   get:
 *     summary: Lấy danh sách ảnh của 1 lô hàng
 *     tags: [Seafood Images]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: batchId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Lấy danh sách ảnh thành công
 *       403:
 *         description: Lô hàng không tồn tại hoặc không có quyền xem
 */
router.get('/batch/:batchId', imageController.getImagesByBatchId);

/**
 * @swagger
 * /api/seafood/images/{id}:
 *   get:
 *     summary: Xem chi tiết metadata 1 ảnh
 *     tags: [Seafood Images]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Chi tiết ảnh
 *       404:
 *         description: Không tìm thấy ảnh hoặc không có quyền truy cập
 */
router.get('/:id', imageController.getImageById);

/**
 * @swagger
 * /api/seafood/images/{id}:
 *   put:
 *     summary: Cập nhật thông tin metadata ảnh
 *     tags: [Seafood Images]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               image_url:
 *                 type: string
 *                 format: uri
 *               thumbnail_url:
 *                 type: string
 *                 format: uri
 *               captured_at:
 *                 type: string
 *                 format: date-time
 *     responses:
 *       200:
 *         description: Cập nhật thành công
 *       400:
 *         description: Dữ liệu không hợp lệ
 *       404:
 *         description: Không tìm thấy hoặc không có quyền cập nhật
 */
router.put('/:id', validate(updateImageSchema), imageController.updateImage);

/**
 * @swagger
 * /api/seafood/images/{id}:
 *   delete:
 *     summary: Xóa một ảnh
 *     tags: [Seafood Images]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Xóa thành công
 *       404:
 *         description: Không tìm thấy ảnh hoặc không có quyền xóa
 */
router.delete('/:id', imageController.deleteImage);

module.exports = router;
