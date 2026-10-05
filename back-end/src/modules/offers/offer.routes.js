const express = require('express');
const router = express.Router();
const offerController = require('./offer.controller');
const authMiddleware = require('../../middleware/auth.middleware');

router.use(authMiddleware);

// Tạo đề xuất giá mới
router.post('/', offerController.createOffer);

// Chấp nhận offer
router.post('/:id/accept', offerController.acceptOffer);

// Từ chối offer
router.post('/:id/reject', offerController.rejectOffer);

// Trả giá (counter-offer)
router.post('/:id/counter', offerController.counterOffer);

module.exports = router;
