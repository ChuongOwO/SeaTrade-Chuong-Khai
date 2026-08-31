const express = require('express');
const router = express.Router();
const speciesController = require('./species.controller');
const { createSpeciesSchema, updateSpeciesSchema, validate } = require('./species.validation');
const authMiddleware = require('../../middleware/auth.middleware');

// Áp dụng middleware auth cho TOÀN BỘ các route
router.use(authMiddleware);

/**
 * @swagger
 * tags:
 *   name: Seafood Species
 *   description: API Quản lý danh mục Loài hải sản
 */

/**
 * @swagger
 * /api/seafood/species:
 *   post:
 *     summary: Thêm mới một loài hải sản
 *     tags: [Seafood Species]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name_vi
 *             properties:
 *               name_vi:
 *                 type: string
 *                 example: 'Cá ngừ'
 *               name_en:
 *                 type: string
 *                 example: 'Tuna'
 *               scientific_name:
 *                 type: string
 *                 example: 'Thunnus'
 *               description:
 *                 type: string
 *                 example: 'Các loài cá ngừ phổ biến'
 *               image_url:
 *                 type: string
 *                 example: 'https://example.com/tuna.jpg'
 *               status:
 *                 type: boolean
 *                 example: true
 *     responses:
 *       201:
 *         description: Thêm mới thành công
 *       400:
 *         description: Dữ liệu không hợp lệ
 *       409:
 *         description: Tên tiếng Việt đã tồn tại
 */
router.post('/', validate(createSpeciesSchema), speciesController.createSpecies);

/**
 * @swagger
 * /api/seafood/species:
 *   get:
 *     summary: Lấy danh sách loài hải sản
 *     tags: [Seafood Species]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: boolean
 *         description: Lọc theo trạng thái (true/false)
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Tìm kiếm theo tên (vi/en)
 *     responses:
 *       200:
 *         description: Trả về danh sách loài hải sản
 */
router.get('/', speciesController.getAllSpecies);

/**
 * @swagger
 * /api/seafood/species/{id}:
 *   get:
 *     summary: Xem chi tiết 1 loài hải sản
 *     tags: [Seafood Species]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: UUID của loài hải sản
 *     responses:
 *       200:
 *         description: Chi tiết loài
 *       404:
 *         description: Không tìm thấy
 */
router.get('/:id', speciesController.getSpeciesById);

/**
 * @swagger
 * /api/seafood/species/{id}:
 *   put:
 *     summary: Cập nhật thông tin loài hải sản
 *     tags: [Seafood Species]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: UUID của loài hải sản
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name_vi:
 *                 type: string
 *               name_en:
 *                 type: string
 *               scientific_name:
 *                 type: string
 *               description:
 *                 type: string
 *               image_url:
 *                 type: string
 *               status:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Cập nhật thành công
 *       400:
 *         description: Dữ liệu không hợp lệ
 *       404:
 *         description: Không tìm thấy
 *       409:
 *         description: Tên tiếng Việt đã tồn tại
 */
router.put('/:id', validate(updateSpeciesSchema), speciesController.updateSpecies);

/**
 * @swagger
 * /api/seafood/species/{id}:
 *   delete:
 *     summary: Xóa một loài hải sản
 *     tags: [Seafood Species]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: UUID của loài hải sản
 *     responses:
 *       200:
 *         description: Xóa thành công
 *       404:
 *         description: Không tìm thấy
 *       409:
 *         description: Không thể xóa vì đang được tham chiếu (ON DELETE RESTRICT)
 */
router.delete('/:id', speciesController.deleteSpecies);

module.exports = router;
