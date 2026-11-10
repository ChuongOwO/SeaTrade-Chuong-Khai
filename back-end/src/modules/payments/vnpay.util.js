const crypto = require('crypto');
const env = require('../../config/env');

/**
 * Tiện ích ký / xác thực chuẩn VNPay PAY v2.1.0.
 * Quy tắc (theo tài liệu sandbox.vnpayment.vn/apis/docs/thanh-toan-pay):
 *  - Sắp xếp tham số vnp_* theo tên tăng dần, nối dạng key=value bằng '&'
 *  - key & value được URL-encode (khoảng trắng -> '+'), vnp_SecureHash không nằm trong chuỗi ký
 *  - Ký HMAC-SHA512 bằng vnp_HashSecret, xuất hex
 */

const encode = (value) => encodeURIComponent(String(value)).replace(/%20/g, '+');

// Chỉ lấy tham số vnp_*, bỏ 2 trường hash và giá trị null/undefined.
const buildSignData = (params) =>
  Object.keys(params)
    .filter((k) => k.startsWith('vnp_') && k !== 'vnp_SecureHash' && k !== 'vnp_SecureHashType')
    .filter((k) => params[k] !== undefined && params[k] !== null)
    .sort()
    .map((k) => `${encode(k)}=${encode(params[k])}`)
    .join('&');

const hmacSha512 = (data) =>
  crypto.createHmac('sha512', env.vnpay.hashSecret).update(Buffer.from(data, 'utf-8')).digest('hex');

// So sánh chống timing attack, không phân biệt hoa/thường.
const safeEqual = (a, b) => {
  const bufA = Buffer.from(String(a || '').toLowerCase());
  const bufB = Buffer.from(String(b || '').toLowerCase());
  return bufA.length === bufB.length && crypto.timingSafeEqual(bufA, bufB);
};

/** Xác thực chữ ký của tham số VNPay gửi về (IPN hoặc Return URL). */
const verifyParams = (query) => safeEqual(hmacSha512(buildSignData(query)), query.vnp_SecureHash);

// yyyyMMddHHmmss theo giờ Việt Nam (GMT+7), đúng yêu cầu của VNPay.
const formatVnTime = (date = new Date()) =>
  new Date(date.getTime() + 7 * 60 * 60 * 1000).toISOString().replace(/[-:T]/g, '').slice(0, 14);

const normalizeIp = (ip) => {
  if (!ip) return '127.0.0.1';
  if (ip === '::1') return '127.0.0.1';
  return ip.replace(/^::ffff:/, '');
};

/**
 * Tạo URL thanh toán. amountVnd là số tiền VND nguyên (chưa nhân 100).
 * txnRef phải duy nhất cho mỗi lần thanh toán.
 */
const buildPaymentUrl = ({ txnRef, amountVnd, orderInfo, ipAddr, createDate, expireDate }) => {
  const params = {
    vnp_Version: '2.1.0',
    vnp_Command: 'pay',
    vnp_TmnCode: env.vnpay.tmnCode,
    vnp_Amount: Math.round(amountVnd) * 100,
    vnp_CreateDate: createDate,
    vnp_CurrCode: 'VND',
    vnp_IpAddr: normalizeIp(ipAddr),
    vnp_Locale: 'vn',
    vnp_OrderInfo: orderInfo, // tiếng Việt không dấu, không ký tự đặc biệt
    vnp_OrderType: 'other',
    vnp_ReturnUrl: env.vnpay.returnUrl,
    vnp_ExpireDate: expireDate,
    vnp_TxnRef: txnRef,
  };
  const signData = buildSignData(params);
  return `${env.vnpay.url}?${signData}&vnp_SecureHash=${hmacSha512(signData)}`;
};

module.exports = { buildPaymentUrl, verifyParams, formatVnTime, normalizeIp, buildSignData, hmacSha512 };
