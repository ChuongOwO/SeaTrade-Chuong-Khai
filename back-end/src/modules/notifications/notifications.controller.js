const notificationsService = require('./notifications.service');

// [GET] /api/notifications/unread-count?type=NEW_MESSAGE (type tùy chọn)
const getUnreadCount = async (req, res, next) => {
  try {
    const type = req.query.type || null;
    const count = await notificationsService.countUnread(req.user.id, type);
    res.json({
      status: 200,
      message: 'Lấy số thông báo chưa đọc thành công',
      metadata: { count }
    });
  } catch (error) {
    next(error);
  }
};

// [GET] /api/notifications — danh sách thông báo của tôi
const getMyNotifications = async (req, res, next) => {
  try {
    const notifications = await notificationsService.listForUser(req.user.id);
    res.json({
      status: 200,
      message: 'Lấy danh sách thông báo thành công',
      metadata: notifications
    });
  } catch (error) {
    next(error);
  }
};

// [PATCH] /api/notifications/:id/read
const markRead = async (req, res, next) => {
  try {
    const { id } = req.params;
    const notification = await notificationsService.markRead(id, req.user.id);
    if (!notification) {
      return res.status(404).json({ status: 404, message: 'Không tìm thấy thông báo' });
    }
    res.json({
      status: 200,
      message: 'Đã đánh dấu đã đọc',
      metadata: notification
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { getUnreadCount, getMyNotifications, markRead };
