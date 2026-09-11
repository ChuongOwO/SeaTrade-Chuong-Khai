const express = require('express');
const router = express.Router();
const aiController = require('./ai.controller');
const { createDetectionSchema, updateDetectionSchema, validate } = require('./ai.validation');
const authMiddleware = require('../../middleware/auth.middleware');

// Áp dụng auth cho toàn bộ route
router.use(authMiddleware);

/**
 * @swagger
 * tags:
 *   name: AI Detections
 *   description: API lưu trữ kết quả AI nhận dạng hải sản từ ảnh
 */

/**
 * @swagger
 * /api/ai/detections:
 *   post:
 *     summary: Tạo kết quả AI detection cho một ảnh
 *     tags: [AI Detections]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - image_id
 *               - model_version
 *             properties:
 *               image_id:
 *                 type: string
 *                 format: uuid
 *                 example: '123e4567-e89b-12d3-a456-426614174000'
 *               model_version:
 *                 type: string
 *                 example: 'seafood-v1.0'
 *               species_id:
 *                 type: string
 *                 format: uuid
 *               confidence:
 *                 type: number
 *                 minimum: 0
 *                 maximum: 1
 *                 example: 0.96
 *               bbox_x:
 *                 type: number
 *                 example: 10
 *               bbox_y:
 *                 type: number
 *                 example: 20
 *               bbox_width:
 *                 type: number
 *                 minimum: 0
 *                 example: 200
 *               bbox_height:
 *                 type: number
 *                 minimum: 0
 *                 example: 150
 *               estimated_size_cm:
 *                 type: number
 *                 example: 42
 *               quality_score:
 *                 type: number
 *                 minimum: 0
 *                 maximum: 100
 *                 example: 91
 *               freshness_score:
 *                 type: number
 *                 minimum: 0
 *                 maximum: 100
 *                 example: 94
 *     responses:
 *       201:
 *         description: Tạo detection thành công
 *       400:
 *         description: Dữ liệu không hợp lệ
 *       403:
 *         description: Không có quyền tạo detection cho ảnh này
 *       404:
 *         description: Loài hải sản không tồn tại
 */
router.post('/', validate(createDetectionSchema), aiController.createDetection);

/**
 * @swagger
 * /api/ai/detections/image/{imageId}:
 *   get:
 *     summary: Lấy tất cả AI detections của một ảnh
 *     tags: [AI Detections]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: imageId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: UUID của ảnh
 *     responses:
 *       200:
 *         description: Danh sách detections
 *       403:
 *         description: Không có quyền xem detections của ảnh này
 */
router.get('/image/:imageId', aiController.getDetectionsByImageId);

/**
 * @swagger
 * /api/ai/detections/{id}:
 *   get:
 *     summary: Xem chi tiết một AI detection
 *     tags: [AI Detections]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: UUID của detection
 *     responses:
 *       200:
 *         description: Chi tiết detection (bao gồm thông tin species)
 *       404:
 *         description: Không tìm thấy hoặc không có quyền truy cập
 */
router.get('/:id', aiController.getDetectionById);

/**
 * @swagger
 * /api/ai/detections/{id}:
 *   put:
 *     summary: Cập nhật kết quả AI detection
 *     tags: [AI Detections]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: UUID của detection
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             minProperties: 1
 *             properties:
 *               model_version:
 *                 type: string
 *               species_id:
 *                 type: string
 *                 format: uuid
 *               confidence:
 *                 type: number
 *                 minimum: 0
 *                 maximum: 1
 *               bbox_x:
 *                 type: number
 *               bbox_y:
 *                 type: number
 *               bbox_width:
 *                 type: number
 *                 minimum: 0
 *               bbox_height:
 *                 type: number
 *                 minimum: 0
 *               estimated_size_cm:
 *                 type: number
 *               quality_score:
 *                 type: number
 *                 minimum: 0
 *                 maximum: 100
 *               freshness_score:
 *                 type: number
 *                 minimum: 0
 *                 maximum: 100
 *     responses:
 *       200:
 *         description: Cập nhật thành công
 *       400:
 *         description: Dữ liệu không hợp lệ hoặc không có field nào được cung cấp
 *       404:
 *         description: Không tìm thấy hoặc không có quyền cập nhật
 */
router.put('/:id', validate(updateDetectionSchema), aiController.updateDetection);

/**
 * @swagger
 * /api/ai/detections/{id}:
 *   delete:
 *     summary: Xóa một AI detection
 *     tags: [AI Detections]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: UUID của detection
 *     responses:
 *       200:
 *         description: Xóa thành công
 *       404:
 *         description: Không tìm thấy hoặc không có quyền xóa
 */
router.delete('/:id', aiController.deleteDetection);

module.exports = router;
