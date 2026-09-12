const chatService = require('./chat.service');

// [POST] /api/chat/conversations — bắt đầu/mở lại hội thoại với 1 người khác qua SĐT
const startConversation = async (req, res, next) => {
  try {
    const { peer_phone, listing_id, order_id } = req.body;
    const myId = req.user.id;

    const peer = await chatService.findUserByPhone(peer_phone);
    if (!peer) {
      return res.status(404).json({ status: 404, message: 'Không tìm thấy người dùng với số điện thoại này' });
    }
    if (peer.id === myId) {
      return res.status(400).json({ status: 400, message: 'Không thể tự nhắn tin với chính mình' });
    }

    const conversation = await chatService.findOrCreateConversation(
      myId, peer.id, listing_id || null, order_id || null
    );

    res.status(201).json({
      status: 201,
      message: 'Đã sẵn sàng hội thoại',
      metadata: { ...conversation, peer }
    });
  } catch (error) {
    next(error);
  }
};

// [GET] /api/chat/conversations — danh sách hội thoại của tôi
const getMyConversations = async (req, res, next) => {
  try {
    const conversations = await chatService.listConversationsForUser(req.user.id);
    res.json({
      status: 200,
      message: 'Lấy danh sách hội thoại thành công',
      metadata: conversations
    });
  } catch (error) {
    next(error);
  }
};

// [GET] /api/chat/conversations/:id/messages — kèm tự đánh dấu đã đọc
const getMessages = async (req, res, next) => {
  try {
    const { id } = req.params;
    const isParticipant = await chatService.checkParticipant(id, req.user.id);
    if (!isParticipant) {
      return res.status(403).json({ status: 403, message: 'Bạn không thuộc cuộc hội thoại này' });
    }

    const messages = await chatService.listMessages(id);
    await chatService.markMessagesRead(id, req.user.id);

    res.json({
      status: 200,
      message: 'Lấy tin nhắn thành công',
      metadata: messages
    });
  } catch (error) {
    next(error);
  }
};

// [POST] /api/chat/conversations/:id/messages
const postMessage = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { message } = req.body;

    const isParticipant = await chatService.checkParticipant(id, req.user.id);
    if (!isParticipant) {
      return res.status(403).json({ status: 403, message: 'Bạn không thuộc cuộc hội thoại này' });
    }

    const created = await chatService.createMessage(id, req.user.id, message);
    res.status(201).json({
      status: 201,
      message: 'Gửi tin nhắn thành công',
      metadata: created
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  startConversation,
  getMyConversations,
  getMessages,
  postMessage
};
