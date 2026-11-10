const crypto = require('crypto');
const pool = require('../../config/database');
const env = require('../../config/env');
const vnpay = require('./vnpay.util');
const orderService = require('../orders/order.service');

const httpError = (statusCode, message) => Object.assign(new Error(message), { statusCode });

// Mã phản hồi IPN theo tài liệu VNPay (00/02 => VNPay dừng gọi lại; 01/04/97/99 => VNPay gọi lại tối đa 10 lần, cách 5 phút).
const IPN = {
  OK: { RspCode: '00', Message: 'Confirm Success' },
  NOT_FOUND: { RspCode: '01', Message: 'Order not found' },
  ALREADY: { RspCode: '02', Message: 'Order already confirmed' },
  BAD_AMOUNT: { RspCode: '04', Message: 'Invalid amount' },
  BAD_SIGNATURE: { RspCode: '97', Message: 'Invalid signature' },
  UNKNOWN: { RspCode: '99', Message: 'Unknown error' },
};

const MAX_AMOUNT_VND = 9999999999; // vnp_Amount tối đa 12 chữ số sau khi nhân 100
const MIN_HOLD_LEFT_MS = 60 * 1000; // còn dưới 1 phút giữ hàng thì không tạo link mới
const DIRECT_METHODS = ['BANK_TRANSFER', 'CASH']; // người bán tự xác nhận đã nhận tiền

const shortId = (uuid) => String(uuid).replace(/-/g, '').slice(0, 8);

const makeTxnRef = (orderId, createDate) =>
  `${shortId(orderId)}${createDate}${crypto.randomBytes(2).toString('hex')}`;

const urlForPayment = (payment, orderId, ipAddr) =>
  vnpay.buildPaymentUrl({
    txnRef: payment.transaction_code,
    amountVnd: Number(payment.amount),
    orderInfo: `Thanh toan don hang ${shortId(orderId)}`,
    ipAddr,
    createDate: payment.vnp_create_date,
    expireDate: vnpay.formatVnTime(new Date(payment.expires_at)),
  });

/**
 * Người mua bấm "Thanh toán" -> tạo (hoặc dùng lại) khoản thanh toán PENDING và trả URL VNPay.
 * Số tiền LUÔN lấy từ DB, không nhận từ client.
 */
const assertConfigured = () => {
  const { tmnCode, hashSecret, url, returnUrl } = env.vnpay;
  if (!tmnCode || !hashSecret || !url || !returnUrl) {
    throw httpError(503, 'Thanh toán VNPay chưa được cấu hình trên máy chủ (thiếu VNPAY_* trong .env)');
  }
};

const createVnpayPayment = async ({ orderId, userId, ipAddr }) => {
  assertConfigured();
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Khoá đơn để 2 lần bấm đồng thời không tạo 2 khoản thanh toán.
    const orderRes = await client.query(
      'SELECT id, buyer_id, seller_id, total_amount, status, hold_expires_at FROM orders WHERE id = $1 FOR UPDATE',
      [orderId]
    );
    const order = orderRes.rows[0];
    if (!order) throw httpError(404, 'Không tìm thấy đơn hàng');
    if (order.buyer_id !== userId) throw httpError(403, 'Chỉ người mua mới được thanh toán đơn này');
    if (order.status !== 'CONFIRMED') {
      throw httpError(409, `Đơn hàng đang ở trạng thái ${order.status}, không thể thanh toán`);
    }

    const amountVnd = Math.round(Number(order.total_amount));
    if (!(amountVnd > 0) || amountVnd > MAX_AMOUNT_VND) {
      throw httpError(422, 'Số tiền đơn hàng không hợp lệ để thanh toán qua VNPay');
    }

    const paid = await client.query(
      "SELECT 1 FROM payments WHERE order_id = $1 AND status = 'PAID' LIMIT 1",
      [orderId]
    );
    if (paid.rowCount > 0) throw httpError(409, 'Đơn hàng này đã được thanh toán');

    // Đơn "Mua ngay" chỉ thanh toán được khi mẻ cá còn đang được giữ cho mình.
    const holdUntil = order.hold_expires_at ? new Date(order.hold_expires_at) : null;
    if (holdUntil && holdUntil.getTime() - Date.now() < MIN_HOLD_LEFT_MS) {
      throw httpError(409, 'Đã hết thời gian giữ hàng cho đơn Mua ngay này. Vui lòng mua lại trên chợ.');
    }

    // Còn khoản PENDING chưa hết hạn -> dùng lại (cùng TxnRef) để tránh người dùng trả 2 lần.
    const pending = await client.query(
      `SELECT * FROM payments
       WHERE order_id = $1 AND status = 'PENDING' AND payment_method = 'VNPAY' AND expires_at > NOW()
       ORDER BY created_at DESC LIMIT 1`,
      [orderId]
    );
    let payment = pending.rows[0];

    if (!payment) {
      const now = new Date();
      const createDate = vnpay.formatVnTime(now);
      let expiresAt = new Date(now.getTime() + env.vnpay.expireMinutes * 60 * 1000);
      if (holdUntil && holdUntil < expiresAt) expiresAt = holdUntil;
      const inserted = await client.query(
        `INSERT INTO payments (order_id, amount, payment_method, status, transaction_code, vnp_create_date, expires_at)
         VALUES ($1, $2, 'VNPAY', 'PENDING', $3, $4, $5)
         RETURNING *`,
        [orderId, amountVnd, makeTxnRef(orderId, createDate), createDate, expiresAt]
      );
      payment = inserted.rows[0];
    }

    await client.query('COMMIT');
    return {
      payment_id: payment.id,
      amount: Number(payment.amount),
      expires_at: payment.expires_at,
      payment_url: urlForPayment(payment, orderId, ipAddr),
    };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
};

/**
 * Xử lý kết quả VNPay trả về (dùng chung cho IPN và Return URL).
 * Idempotent: gọi nhiều lần với cùng giao dịch chỉ ghi nhận 1 lần (khoá dòng payments FOR UPDATE).
 * Trả về { rsp, payment } — rsp là mã phản hồi IPN.
 */
const applyGatewayResult = async (params) => {
  if (!vnpay.verifyParams(params)) return { rsp: IPN.BAD_SIGNATURE };
  if (params.vnp_TmnCode !== env.vnpay.tmnCode) return { rsp: IPN.UNKNOWN };

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const found = await client.query(
      'SELECT * FROM payments WHERE transaction_code = $1 FOR UPDATE',
      [String(params.vnp_TxnRef || '')]
    );
    const payment = found.rows[0];
    if (!payment) {
      await client.query('ROLLBACK');
      return { rsp: IPN.NOT_FOUND };
    }

    if (Number(params.vnp_Amount) !== Math.round(Number(payment.amount)) * 100) {
      await client.query('ROLLBACK');
      return { rsp: IPN.BAD_AMOUNT, payment };
    }

    if (payment.status !== 'PENDING') {
      await client.query('ROLLBACK');
      return { rsp: IPN.ALREADY, payment };
    }

    // Thành công khi CẢ HAI mã đều '00' (theo khuyến nghị trong tài liệu VNPay).
    const success = params.vnp_ResponseCode === '00' && params.vnp_TransactionStatus === '00';
    let newStatus = success ? 'PAID' : 'FAILED';
    let duplicatePaid = false;
    let refundRequired = false;

    if (success) {
      const lockedOrder = await client.query('SELECT status FROM orders WHERE id = $1 FOR UPDATE', [payment.order_id]);
      const other = await client.query(
        "SELECT 1 FROM payments WHERE order_id = $1 AND status = 'PAID' LIMIT 1",
        [payment.order_id]
      );
      if (lockedOrder.rows[0]?.status === 'CANCELLED') {
        newStatus = 'FAILED';
        refundRequired = true;
        console.error(`[VNPAY] ĐƠN ĐÃ HUỶ nhưng vẫn nhận tiền: đơn ${payment.order_id}, txn ${payment.transaction_code} — cần hoàn tiền thủ công`);
      } else if (other.rowCount > 0) {
        // Hiếm: đơn đã có khoản PAID khác nhưng khoản này cũng bị trừ tiền -> cần hoàn tiền thủ công.
        newStatus = 'FAILED';
        duplicatePaid = true;
        console.error(`[VNPAY] TRẢ TIỀN TRÙNG cho đơn ${payment.order_id}, txn ${payment.transaction_code} — cần hoàn tiền thủ công`);
      }
    }

    const updated = await client.query(
      `UPDATE payments
       SET status = $1, gateway_txn_no = $2, bank_code = $3, response_code = $4, txn_status = $5,
           paid_at = $6, raw_callback = $7, updated_at = NOW()
       WHERE id = $8
       RETURNING *`,
      [
        newStatus,
        params.vnp_TransactionNo || null,
        params.vnp_BankCode || null,
        params.vnp_ResponseCode || null,
        params.vnp_TransactionStatus || null,
        newStatus === 'PAID' ? new Date() : null,
        JSON.stringify({ ...params, duplicate_paid: duplicatePaid, refund_required: refundRequired }),
        payment.id,
      ]
    );

    if (newStatus === 'PAID') {
      await orderService.finalizePaidOrder(client, payment.order_id);
      const orderRes = await client.query('SELECT id, buyer_id, seller_id FROM orders WHERE id = $1', [payment.order_id]);
      const order = orderRes.rows[0];
      const amountText = Number(payment.amount).toLocaleString('vi-VN');
      await client.query(
        `INSERT INTO notifications (user_id, title, content, notification_type, reference_id)
         VALUES ($1, $2, $3, 'PAYMENT', $5), ($4, $6, $7, 'PAYMENT', $5)`,
        [
          order.buyer_id,
          'Thanh toán thành công',
          `Bạn đã thanh toán ${amountText}đ cho đơn hàng qua VNPay.`,
          order.seller_id,
          order.id,
          'Đơn hàng đã được thanh toán',
          `Người mua đã thanh toán ${amountText}đ qua VNPay. Bạn có thể chuẩn bị giao hàng.`,
        ]
      );
    }

    await client.query('COMMIT');
    // Với khoản trả trùng vẫn phản hồi 00 để VNPay không gọi lại; tiền cần hoàn thủ công (đã log).
    return { rsp: IPN.OK, payment: updated.rows[0], justPaid: newStatus === 'PAID' };
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[VNPAY] applyGatewayResult lỗi:', err);
    return { rsp: IPN.UNKNOWN };
  } finally {
    client.release();
  }
};

/** IPN: VNPay gọi server-to-server — nguồn xác nhận chính. Trả { rsp, payment, justPaid }. */
const handleIpn = (query) => applyGatewayResult(query);

/**
 * Return URL: trình duyệt/WebView của người dùng quay về.
 * Chữ ký hợp lệ + khớp TxnRef/số tiền là đủ tin cậy (không ai giả mạo được nếu không có HashSecret).
 * Mặc định CHỈ hiển thị kết quả; bật VNPAY_CONFIRM_ON_RETURN=true khi dev không có IPN công khai
 * để Return URL cũng ghi nhận (vẫn idempotent, dùng chung logic với IPN).
 */
const handleReturn = async (query) => {
  if (!vnpay.verifyParams(query)) return { valid: false };
  const applied = env.vnpay.confirmOnReturn ? await applyGatewayResult(query) : {};
  const res = await pool.query(
    'SELECT id, order_id, amount, status, response_code FROM payments WHERE transaction_code = $1',
    [String(query.vnp_TxnRef || '')]
  );
  return {
    valid: true,
    payment: res.rows[0] || null,
    responseCode: query.vnp_ResponseCode,
    justPaid: Boolean(applied.justPaid),
  };
};

/**
 * Người bán bấm "Đã nhận tiền". Chỉ người bán xác nhận được — họ là bên nhận tiền nên không có
 * động cơ xác nhận khống.
 *  - Đơn CHƯA trả (người mua trả thẳng bằng QR / tiền mặt): ghi 1 khoản PAID theo `method`
 *    (index uq_payments_one_paid_per_order chặn trùng).
 *  - Đơn ĐÃ trả qua VNPay: chỉ ghi nhận người bán đã xác nhận (seller_confirmed_at), không cần `method`.
 * Trả về khoản thanh toán đã được xác nhận.
 */
const confirmReceived = async ({ orderId, sellerId, method }) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const orderRes = await client.query(
      'SELECT id, buyer_id, seller_id, total_amount, status FROM orders WHERE id = $1 FOR UPDATE',
      [orderId]
    );
    const order = orderRes.rows[0];
    if (!order) throw httpError(404, 'Không tìm thấy đơn hàng');
    if (order.seller_id !== sellerId) throw httpError(403, 'Chỉ người bán mới xác nhận được đã nhận tiền');
    if (!CONFIRMABLE_STATUSES.includes(order.status)) {
      throw httpError(409, `Đơn hàng đang ở trạng thái ${order.status}, không thể xác nhận thanh toán`);
    }

    const paidRes = await client.query(
      "SELECT * FROM payments WHERE order_id = $1 AND status = 'PAID' LIMIT 1 FOR UPDATE",
      [orderId]
    );
    let payment = paidRes.rows[0];

    if (payment) {
      if (payment.seller_confirmed_at) throw httpError(409, 'Bạn đã xác nhận nhận tiền cho đơn này rồi');
      const updated = await client.query(
        'UPDATE payments SET seller_confirmed_at = NOW(), updated_at = NOW() WHERE id = $1 RETURNING *',
        [payment.id]
      );
      payment = updated.rows[0];
    } else {
      if (!DIRECT_METHODS.includes(method)) {
        throw httpError(400, `Phương thức không hợp lệ. Chỉ chấp nhận: ${DIRECT_METHODS.join(', ')}`);
      }
      const inserted = await client.query(
        `INSERT INTO payments (order_id, amount, payment_method, status, paid_at, seller_confirmed_at, raw_callback)
         VALUES ($1, $2, $3, 'PAID', NOW(), NOW(), $4)
         RETURNING *`,
        [orderId, order.total_amount, method, JSON.stringify({ confirmed_by_seller: sellerId })]
      );
      payment = inserted.rows[0];
      await orderService.finalizePaidOrder(client, orderId);
    }

    const amountText = Number(payment.amount).toLocaleString('vi-VN');
    await client.query(
      `INSERT INTO notifications (user_id, title, content, notification_type, reference_id)
       VALUES ($1, 'Người bán đã xác nhận nhận tiền', $2, 'PAYMENT', $3)`,
      [order.buyer_id, `Người bán xác nhận đã nhận ${amountText}đ và sẽ chuẩn bị giao hàng.`, orderId]
    );

    await client.query('COMMIT');
    return payment;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
};

const CONFIRMABLE_STATUSES = ['CONFIRMED', 'IN_TRANSIT', 'DELIVERED'];

const assertCanView = (row, user) => {
  if (!row) throw httpError(404, 'Không tìm thấy dữ liệu thanh toán');
  const allowed = user.role === 'ADMIN' || row.buyer_id === user.id || row.seller_id === user.id;
  if (!allowed) throw httpError(403, 'Bạn không có quyền xem thanh toán này');
};

const PAYMENT_COLUMNS = `p.id, p.order_id, p.amount, p.payment_method, p.status, p.transaction_code,
  p.bank_code, p.response_code, p.paid_at, p.created_at, p.expires_at, p.seller_confirmed_at,
  (p.status = 'PENDING' AND p.expires_at IS NOT NULL AND p.expires_at < NOW()) AS is_expired`;

const getPaymentById = async (paymentId, user) => {
  const res = await pool.query(
    `SELECT ${PAYMENT_COLUMNS}, o.buyer_id, o.seller_id
     FROM payments p JOIN orders o ON o.id = p.order_id WHERE p.id = $1`,
    [paymentId]
  );
  assertCanView(res.rows[0], user);
  const { buyer_id, seller_id, ...payment } = res.rows[0];
  return payment;
};

const getPaymentsByOrder = async (orderId, user) => {
  const orderRes = await pool.query(
    'SELECT id, buyer_id, seller_id, status, total_amount, purchase_type, hold_expires_at FROM orders WHERE id = $1',
    [orderId]
  );
  const order = orderRes.rows[0];
  assertCanView(order, user);
  const res = await pool.query(
    `SELECT ${PAYMENT_COLUMNS} FROM payments p WHERE p.order_id = $1 ORDER BY p.created_at DESC`,
    [orderId]
  );
  const paidPayment = res.rows.find((p) => p.status === 'PAID');
  const paid = Boolean(paidPayment);
  const isBuyer = order.buyer_id === user.id;
  const isSeller = order.seller_id === user.id;
  const holdExpired = order.hold_expires_at && new Date(order.hold_expires_at).getTime() - Date.now() < MIN_HOLD_LEFT_MS;
  return {
    order_id: order.id,
    order_status: order.status,
    purchase_type: order.purchase_type,
    hold_expires_at: order.hold_expires_at,
    total_amount: Number(order.total_amount),
    is_buyer: isBuyer,
    is_seller: isSeller,
    paid,
    paid_method: paidPayment?.payment_method || null,
    seller_confirmed: Boolean(paidPayment?.seller_confirmed_at),
    can_pay: isBuyer && order.status === 'CONFIRMED' && !paid && !holdExpired,
    // Chưa trả: người bán ghi nhận tiền trả trực tiếp. Đã trả (VNPay): người bán xác nhận đã nhận.
    can_confirm_received: isSeller && CONFIRMABLE_STATUSES.includes(order.status)
      && !(paidPayment && paidPayment.seller_confirmed_at),
    payments: res.rows,
  };
};

module.exports = {
  createVnpayPayment,
  handleIpn,
  handleReturn,
  getPaymentById,
  getPaymentsByOrder,
  confirmReceived,
  IPN,
};
