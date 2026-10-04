const express = require('express');
const router = express.Router();
const vesselController = require('./vessel.controller');
const { createVesselSchema, updateVesselSchema, addLocationSchema, validate } = require('./vessel.validation');
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
 * /api/vessels/locations:
 *   get:
 *     summary: Lấy vị trí hiện tại của tất cả tàu đang hoạt động
 *     tags: [Vessels]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Danh sách tàu kèm tọa độ GPS mới nhất
 *         content:
 *           application/json:
 *             example:
 *               status: 200
 *               metadata:
 *                 - vessel_id: uuid
 *                   vessel_name: 'Tàu Cá A'
 *                   latitude: 10.324
 *                   longitude: 107.124
 *                   status: ACTIVE
 *                   recorded_at: '2026-09-07T08:00:00Z'
 *       401:
 *         description: Chưa đăng nhập
 */
router.get('/locations', vesselController.getVesselsLocations);

/**
 * @swagger
 * /api/vessels/my-vessel:
 *   get:
 *     summary: Lấy thông tin tàu của user hiện tại kèm vị trí GPS mới nhất
 *     tags: [Vessels]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Thông tin tàu và vị trí
 *       404:
 *         description: User chưa đăng ký tàu nào
 *       401:
 *         description: Chưa đăng nhập
 */
router.get('/my-vessel', vesselController.getMyVesselInfo);

/**
 * @swagger
 * /api/vessels/{id}/locations:
 *   post:
 *     summary: Ghi nhận vị trí GPS mới cho tàu (Mobile App gửi định kỳ vị trí thật)
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
 *         description: UUID của con tàu (phải thuộc quyền sở hữu của user đang đăng nhập)
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - latitude
 *               - longitude
 *             properties:
 *               latitude:
 *                 type: number
 *                 example: 10.324
 *               longitude:
 *                 type: number
 *                 example: 107.124
 *               speed:
 *                 type: number
 *                 description: Tốc độ (hải lý/h)
 *                 example: 5.2
 *               heading:
 *                 type: number
 *                 description: Hướng đi (độ, 0-360)
 *                 example: 45
 *     responses:
 *       201:
 *         description: Ghi nhận vị trí thành công
 *       400:
 *         description: Dữ liệu không hợp lệ
 *       404:
 *         description: Không tìm thấy tàu hoặc không có quyền
 */
router.post('/:id/locations', validate(addLocationSchema), vesselController.addVesselLocation);

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

// Đã di chuyển lên trên

/**
 * @swagger
 * /api/vessels/{targetVesselId}/navigation:
 *   get:
 *     summary: Tính khoảng cách và hướng đi từ tàu hiện tại đến tàu mục tiêu
 *     tags: [Vessels]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: targetVesselId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: UUID của tàu mục tiêu
 *     responses:
 *       200:
 *         description: Thông tin dẫn đường
 *         content:
 *           application/json:
 *             example:
 *               status: 200
 *               metadata:
 *                 current_vessel: { vessel_id: uuid, vessel_name: 'Tàu A', latitude: 10.32, longitude: 107.12 }
 *                 target_vessel: { vessel_id: uuid, vessel_name: 'Tàu B', latitude: 10.40, longitude: 107.20 }
 *                 distance_m: 13200
 *                 distance_km: 13.2
 *                 bearing: 47.3
 *                 bearing_text: 'Đông Bắc'
 *       400:
 *         description: Tàu mục tiêu là chính mình
 *       401:
 *         description: Chưa đăng nhập
 *       404:
 *         description: Không tìm thấy tàu / chưa có tàu
 *       422:
 *         description: Tàu chưa có vị trí GPS
 */
router.get('/:targetVesselId/navigation', vesselController.getNavigationToVessel);

module.exports = router;
