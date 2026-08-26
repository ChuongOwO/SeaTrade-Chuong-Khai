const express = require('express');
const router = express.Router();
const vesselController = require('./vessel.controller');
const { createVesselSchema, updateVesselSchema, validate } = require('./vessel.validation');
const authMiddleware = require('../../middleware/auth.middleware');

// Áp dụng middleware auth cho TOÀN BỘ các route của Vessels
router.use(authMiddleware);

/**
 * @swagger
 * tags:
 *   name: Vessels
 *   description: API Quản lý Tàu thuyền
 */

/**
 * @swagger
 * /api/vessels:
 *   post:
 *     summary: Đăng ký tàu mới
 *     tags: [Vessels]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - vessel_code
 *               - vessel_name
 *             properties:
 *               vessel_code:
 *                 type: string
 *                 example: 'SG-12345'
 *               vessel_name:
 *                 type: string
 *                 example: 'Tàu Cá Sài Gòn'
 *               vessel_type:
 *                 type: string
 *                 enum: [FISHING, COLLECTION, TRANSPORT]
 *                 example: 'FISHING'
 *               capacity_kg:
 *                 type: number
 *                 example: 5000
 *               registration_number:
 *                 type: string
 *                 example: 'REG-9999'
 *     responses:
 *       201:
 *         description: Đăng ký tàu thành công
 *       400:
 *         description: Dữ liệu không hợp lệ (Validation Error)
 *       409:
 *         description: Mã tàu đã tồn tại
 */
router.post('/', validate(createVesselSchema), vesselController.createVessel);

/**
 * @swagger
 * /api/vessels:
 *   get:
 *     summary: Lấy danh sách tàu của người dùng hiện tại
 *     tags: [Vessels]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Trả về danh sách tàu
 */
router.get('/', vesselController.getMyVessels);

/**
 * @swagger
 * /api/vessels/{id}:
 *   get:
 *     summary: Xem chi tiết 1 con tàu
 *     tags: [Vessels]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: UUID của con tàu
 *     responses:
 *       200:
 *         description: Chi tiết tàu
 *       404:
 *         description: Không tìm thấy hoặc Không có quyền truy cập
 */
router.get('/:id', vesselController.getVesselById);

/**
 * @swagger
 * /api/vessels/{id}:
 *   put:
 *     summary: Cập nhật thông tin tàu
 *     tags: [Vessels]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: UUID của con tàu
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               vessel_name:
 *                 type: string
 *                 example: 'Tàu Cá Sài Gòn Mới'
 *               vessel_type:
 *                 type: string
 *                 enum: [FISHING, COLLECTION, TRANSPORT]
 *               capacity_kg:
 *                 type: number
 *                 example: 6000
 *               status:
 *                 type: string
 *                 enum: [ACTIVE, INACTIVE, MAINTENANCE]
 *                 example: 'MAINTENANCE'
 *     responses:
 *       200:
 *         description: Cập nhật thành công
 *       400:
 *         description: Dữ liệu cập nhật không hợp lệ
 *       404:
 *         description: Không tìm thấy hoặc Không có quyền truy cập
 */
router.put('/:id', validate(updateVesselSchema), vesselController.updateVessel);

/**
 * @swagger
 * /api/vessels/{id}:
 *   delete:
 *     summary: Xóa tàu
 *     tags: [Vessels]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: UUID của con tàu
 *     responses:
 *       200:
 *         description: Xóa thành công
 *       404:
 *         description: Không tìm thấy hoặc Không có quyền truy cập
 */
router.delete('/:id', vesselController.deleteVessel);

module.exports = router;
