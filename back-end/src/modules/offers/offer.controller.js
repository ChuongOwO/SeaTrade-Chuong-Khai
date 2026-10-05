const offerService = require('./offer.service');
const orderService = require('../orders/order.service');
const listingService = require('../listings/listing.service');
const chatService = require('../chat/chat.service');

// [POST] /api/offers — Tạo đề xuất giá mới
const createOffer = async (req, res, next) => {
  try {
    const myId = req.user.id;
    const { conversation_id, batch_id, seller_id, quantity_kg, price_per_kg, message } = req.body;

    // Kiểm tra tham gia conversation
    const isParticipant = await chatService.checkParticipant(conversation_id, myId);
    if (!isParticipant) {
      return res.status(403).json({ status: 403, message: 'Bạn không thuộc cuộc hội thoại này' });
    }

    // Tìm hoặc tạo listing từ batch
    const listing = await listingService.findOrCreateListingForBatch(batch_id, seller_id);

    // Gắn listing_id vào conversation (nếu chưa có)
    const pool = require('../../config/database');
    await pool.query(
      'UPDATE conversations SET listing_id = $1, updated_at = NOW() WHERE id = $2 AND listing_id IS NULL',
      [listing.id, conversation_id]
    );

    // Tạo offer
    const offer = await offerService.createOffer({
      conversationId: conversation_id,
      listingId: listing.id,
      buyerId: myId,
      sellerId: seller_id,
      quantity_kg,
      price_per_kg,
      message
    });

    // Gửi tin nhắn đặc biệt vào chat
    const listingInfo = await listingService.getListingById(listing.id);
    const offerMessage = JSON.stringify({
      __type: 'PRICE_OFFER',
      offer_id: offer.id,
      price_per_kg: parseFloat(price_per_kg),
      quantity_kg: parseFloat(quantity_kg),
      total: parseFloat(price_per_kg) * parseFloat(quantity_kg),
      status: 'PENDING',
      species_name: listingInfo?.species_name || 'Hải sản',
      from_user_id: myId
    });
    const createdMsg = await chatService.createMessage(conversation_id, myId, offerMessage);
    const io = req.app.get('io');
    if (io) io.emit(`new_message_${conversation_id}`, createdMsg);

    res.status(201).json({
      status: 201,
      message: 'Đề xuất giá thành công',
      metadata: offer
    });
  } catch (error) {
    next(error);
  }
};

// [POST] /api/offers/:id/accept — Chấp nhận offer
const acceptOffer = async (req, res, next) => {
  try {
    const offerId = req.params.id;
    const myId = req.user.id;

    const offer = await offerService.getOfferById(offerId);
    if (!offer) {
      return res.status(404).json({ status: 404, message: 'Không tìm thấy đề xuất' });
    }

    // Chỉ seller mới được accept
    if (offer.seller_id !== myId && offer.buyer_id !== myId) {
      return res.status(403).json({ status: 403, message: 'Bạn không có quyền xử lý đề xuất này' });
    }

    const accepted = await offerService.acceptOffer(offerId);

    // Tạo đơn hàng tự động
    const order = await orderService.createOrderFromOffer(accepted);

    // Gửi tin nhắn xác nhận vào chat
    const total = parseFloat(accepted.quantity_kg) * parseFloat(accepted.price_per_kg);
    const confirmMessage = JSON.stringify({
      __type: 'OFFER_ACCEPTED',
      offer_id: accepted.id,
      order_id: order.id,
      price_per_kg: parseFloat(accepted.price_per_kg),
      quantity_kg: parseFloat(accepted.quantity_kg),
      total,
      species_name: offer.species_name || 'Hải sản'
    });
    const createdMsg = await chatService.createMessage(accepted.conversation_id, myId, confirmMessage);

    // Gửi sự kiện realtime
    const io = req.app.get('io');
    if (io) io.emit(`new_message_${accepted.conversation_id}`, createdMsg);

    res.json({
      status: 200,
      message: 'Đã chấp nhận thỏa thuận và tạo đơn hàng',
      metadata: { offer: accepted, order }
    });
  } catch (error) {
    next(error);
  }
};

// [POST] /api/offers/:id/reject — Từ chối offer
const rejectOffer = async (req, res, next) => {
  try {
    const offerId = req.params.id;
    const myId = req.user.id;

    const offer = await offerService.getOfferById(offerId);
    if (!offer) {
      return res.status(404).json({ status: 404, message: 'Không tìm thấy đề xuất' });
    }
    if (offer.seller_id !== myId && offer.buyer_id !== myId) {
      return res.status(403).json({ status: 403, message: 'Bạn không có quyền xử lý đề xuất này' });
    }

    const rejected = await offerService.rejectOffer(offerId);

    // Gửi tin nhắn từ chối vào chat
    const rejectMsg = JSON.stringify({
      __type: 'OFFER_REJECTED',
      offer_id: rejected.id,
      price_per_kg: parseFloat(rejected.price_per_kg),
      quantity_kg: parseFloat(rejected.quantity_kg),
      species_name: offer.species_name || 'Hải sản'
    });
    const createdMsg = await chatService.createMessage(rejected.conversation_id, myId, rejectMsg);

    // Gửi sự kiện realtime
    const io = req.app.get('io');
    if (io) io.emit(`new_message_${rejected.conversation_id}`, createdMsg);

    res.json({
      status: 200,
      message: 'Đã từ chối đề xuất',
      metadata: rejected
    });
  } catch (error) {
    next(error);
  }
};

// [POST] /api/offers/:id/counter — Trả giá
const counterOffer = async (req, res, next) => {
  try {
    const offerId = req.params.id;
    const myId = req.user.id;
    const { price_per_kg, quantity_kg, message } = req.body;

    const offer = await offerService.getOfferById(offerId);
    if (!offer) {
      return res.status(404).json({ status: 404, message: 'Không tìm thấy đề xuất' });
    }
    if (offer.seller_id !== myId && offer.buyer_id !== myId) {
      return res.status(403).json({ status: 403, message: 'Bạn không có quyền trả giá đề xuất này' });
    }

    const newOffer = await offerService.counterOffer(offerId, { price_per_kg, quantity_kg, message });

    // Lấy thông tin listing
    const listingInfo = await listingService.getListingById(newOffer.listing_id);

    // Gửi tin nhắn counter vào chat
    const counterMsg = JSON.stringify({
      __type: 'PRICE_OFFER',
      offer_id: newOffer.id,
      price_per_kg: parseFloat(price_per_kg),
      quantity_kg: parseFloat(quantity_kg || offer.quantity_kg),
      total: parseFloat(price_per_kg) * parseFloat(quantity_kg || offer.quantity_kg),
      status: 'PENDING',
      species_name: listingInfo?.species_name || offer.species_name || 'Hải sản',
      is_counter: true,
      from_user_id: myId
    });
    const createdMsg = await chatService.createMessage(newOffer.conversation_id, myId, counterMsg);

    // Gửi sự kiện realtime
    const io = req.app.get('io');
    if (io) io.emit(`new_message_${newOffer.conversation_id}`, createdMsg);

    res.status(201).json({
      status: 201,
      message: 'Đã gửi giá trả lại',
      metadata: newOffer
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { createOffer, acceptOffer, rejectOffer, counterOffer };
