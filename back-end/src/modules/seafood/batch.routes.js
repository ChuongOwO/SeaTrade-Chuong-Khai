const express = require('express');
const router = express.Router();
const batchController = require('./batch.controller');
const { createBatchSchema, updateBatchSchema, validate } = require('./batch.validation');
const authMiddleware = require('../../middleware/auth.middleware');

// Áp dụng middleware auth cho TOÀN BỘ các route
router.use(authMiddleware);

/**
 * @swagger
 * tags:
 *   name: Seafood Batches
 *   description: API Quản lý Lô hàng đánh bắt (yêu cầu quyền chủ tàu)
 */

/**
 * @swagger
 * /api/seafood/batches:
 *   post:
 *     summary: Tạo một lô hàng mới (gắn vào tàu của User)
 *     tags: [Seafood Batches]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - vessel_id
 *               - species_id
 *               - quantity_kg
 *             properties:
 *               vessel_id:
 *                 type: string
 *                 format: uuid
 *               species_id:
 *                 type: string
 *                 format: uuid
 *               quantity_kg:
 *                 type: number
 *               estimated_quantity_kg:
 *                 type: number
 *               catch_time:
 *                 type: string
 *                 format: date-time
 *               latitude:
 *                 type: number
 *               longitude:
 *                 type: number
 *               quality_level:
 *                 type: string
 *                 enum: [PREMIUM, GOOD, NORMAL, LOW]
 *               freshness_score:
 *                 type: number
 *                 minimum: 0
 *                 maximum: 100
 *               size_min_cm:
 *                 type: number
 *               size_max_cm:
 *                 type: number
 *               status:
 *                 type: string
 *                 enum: [AVAILABLE, RESERVED, SOLD, EXPIRED]
 *     responses:
 *       201:
 *         description: Tạo thành công
 *       400:
 *         description: Dữ liệu không hợp lệ
 *       403:
 *         description: Không có quyền thao tác trên tàu này
 *       404:
 *         description: Loài hải sản không tồn tại
 */
router.post('/', validate(createBatchSchema), batchController.createBatch);

/**
 * @swagger
 * /api/seafood/batches:
 *   get:
 *     summary: Lấy danh sách lô hàng của User hiện tại
 *     tags: [Seafood Batches]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: species_id
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: query
 *         name: vessel_id
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *       - in: query
 *         name: quality_level
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Trả về danh sách lô hàng
 */
router.get('/', batchController.getBatches);

/**
 * @swagger
 * /api/seafood/batches/{id}:
 *   get:
 *     summary: Xem chi tiết 1 lô hàng
 *     tags: [Seafood Batches]
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
 *         description: Chi tiết lô hàng
 *       404:
 *         description: Không tìm thấy hoặc không có quyền truy cập
 */
router.get('/:id', batchController.getBatchById);

/**
 * @swagger
 * /api/seafood/batches/{id}:
 *   put:
 *     summary: Cập nhật thông tin lô hàng
 *     tags: [Seafood Batches]
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
 *               species_id:
 *                 type: string
 *                 format: uuid
 *               quantity_kg:
 *                 type: number
 *               estimated_quantity_kg:
 *                 type: number
 *               catch_time:
 *                 type: string
 *                 format: date-time
 *               latitude:
 *                 type: number
 *               longitude:
 *                 type: number
 *               quality_level:
 *                 type: string
 *                 enum: [PREMIUM, GOOD, NORMAL, LOW]
 *               freshness_score:
 *                 type: number
 *                 minimum: 0
 *                 maximum: 100
 *               size_min_cm:
 *                 type: number
 *               size_max_cm:
 *                 type: number
 *               status:
 *                 type: string
 *                 enum: [AVAILABLE, RESERVED, SOLD, EXPIRED]
 *     responses:
 *       200:
 *         description: Cập nhật thành công
 *       404:
 *         description: Không tìm thấy hoặc không có quyền truy cập
 */
router.put('/:id', validate(updateBatchSchema), batchController.updateBatch);

/**
 * @swagger
 * /api/seafood/batches/{id}:
 *   delete:
 *     summary: Xóa một lô hàng
 *     tags: [Seafood Batches]
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
 *         description: Không tìm thấy hoặc không có quyền truy cập
 *       409:
 *         description: Không thể xóa vì có dữ liệu phụ thuộc
 */
router.delete('/:id', batchController.deleteBatch);

module.exports = router;
