const paymentService = require('./payment.service');
const { postOrderMessageSafe } = require('../orders/order.chat');

// IP thật của người dùng (vnp_IpAddr). Có reverse proxy/ngrok thì lấy IP đầu tiên trong X-Forwarded-For.
const clientIp = (req) => {
  const forwarded = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim();
  return forwarded || req.headers['x-real-ip'] || req.socket?.remoteAddress || req.ip;
};

// Đơn vừa chuyển sang PAID qua VNPay -> gửi tin vào chat để 2 bên thấy ngay.
// Lỗi ở đây không được làm hỏng phản hồi cho VNPay — postOrderMessageSafe chỉ ghi log.
const announcePaid = (req, payment) =>
  postOrderMessageSafe(req, payment.order_id, 'buyer', {
    __type: 'PAYMENT_SUCCESS',
    payment_id: payment.id,
    amount: Number(payment.amount),
    method: 'VNPAY',
  });

// [POST] /api/payments/order/:orderId/confirm-received  body: { method: 'BANK_TRANSFER' | 'CASH' }
// Người bán xác nhận đã nhận tiền trả trực tiếp -> gửi tin xác nhận vào chat làm bằng chứng.
const confirmReceived = async (req, res, next) => {
  try {
    const payment = await paymentService.confirmReceived({
      orderId: req.params.orderId,
      sellerId: req.user.id,
      method: req.body?.method,
    });
    await postOrderMessageSafe(req, payment.order_id, 'seller', {
      __type: 'PAYMENT_RECEIVED',
      payment_id: payment.id,
      amount: Number(payment.amount),
      method: payment.payment_method,
    });
    res.status(201).json({ status: 201, message: 'Đã xác nhận nhận tiền', metadata: payment });
  } catch (err) {
    sendError(res, next, err);
  }
};

const sendError = (res, next, err) => {
  if (err.statusCode) return res.status(err.statusCode).json({ status: err.statusCode, message: err.message });
  return next(err);
};

// [POST] /api/payments/vnpay/create  body: { order_id }
const createVnpayPayment = async (req, res, next) => {
  try {
    const { order_id } = req.body || {};
    if (!order_id) return res.status(400).json({ status: 400, message: 'Thiếu order_id' });

    const data = await paymentService.createVnpayPayment({
      orderId: order_id,
      userId: req.user.id,
      ipAddr: clientIp(req),
    });
    res.status(201).json({ status: 201, message: 'Tạo liên kết thanh toán VNPay thành công', metadata: data });
  } catch (err) {
    sendError(res, next, err);
  }
};

// [GET] /api/payments/vnpay/ipn — VNPay gọi server-to-server, KHÔNG dùng JWT (bảo vệ bằng chữ ký HMAC).
const vnpayIpn = async (req, res) => {
  try {
    const result = await paymentService.handleIpn(req.query);
    res.json(result.rsp);
    if (result.justPaid) announcePaid(req, result.payment);
  } catch (err) {
    console.error('[VNPAY] IPN lỗi:', err);
    res.json(paymentService.IPN.UNKNOWN);
  }
};

const escapeHtml = (s) =>
  String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

// [GET] /api/payments/vnpay/return — người dùng được VNPay chuyển về. Trả trang HTML đơn giản;
// WebView trên mobile nhận biết URL này để tự đóng và hỏi lại trạng thái thật qua GET /api/payments/:id.
const vnpayReturn = async (req, res) => {
  let title = 'Không xác thực được kết quả thanh toán';
  let tone = '#b91c1c';
  try {
    const result = await paymentService.handleReturn(req.query);
    if (result.justPaid) announcePaid(req, result.payment);
    if (result.valid && result.payment && result.payment.status === 'PAID') {
      title = 'Thanh toán thành công';
      tone = '#15803d';
    } else if (result.valid && result.payment && result.payment.status === 'PENDING' && result.responseCode === '00') {
      title = 'Đã nhận thanh toán, đang chờ xác nhận';
      tone = '#b45309';
    } else if (result.valid) {
      title = 'Thanh toán không thành công hoặc đã bị huỷ';
    }
  } catch (err) {
    console.error('[VNPAY] Return lỗi:', err);
  }
  res.status(200).type('html').send(
    `<!doctype html><html lang="vi"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">` +
      `<title>Kết quả thanh toán</title></head><body style="font-family:system-ui,sans-serif;text-align:center;padding:48px 16px">` +
      `<h2 style="color:${tone}">${escapeHtml(title)}</h2><p>Bạn có thể quay lại ứng dụng SeaTrade.</p></body></html>`
  );
};

// [GET] /api/payments/order/:orderId — các khoản thanh toán của 1 đơn
const getPaymentsByOrder = async (req, res, next) => {
  try {
    const data = await paymentService.getPaymentsByOrder(req.params.orderId, req.user);
    res.json({ status: 200, message: 'Lấy thông tin thanh toán thành công', metadata: data });
  } catch (err) {
    sendError(res, next, err);
  }
};

// [GET] /api/payments/:id
const getPaymentById = async (req, res, next) => {
  try {
    const data = await paymentService.getPaymentById(req.params.id, req.user);
    res.json({ status: 200, message: 'Lấy thông tin thanh toán thành công', metadata: data });
  } catch (err) {
    sendError(res, next, err);
  }
};

module.exports = { createVnpayPayment, vnpayIpn, vnpayReturn, getPaymentsByOrder, getPaymentById, confirmReceived };
