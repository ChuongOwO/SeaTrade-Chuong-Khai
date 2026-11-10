import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_PAYMENTS_URL } from '../config/api';

// Thanh toán VNPay. Số tiền do back-end lấy từ DB — app chỉ gửi order_id.

async function request(path, options = {}) {
  const token = await AsyncStorage.getItem('userToken');
  const response = await fetch(`${API_PAYMENTS_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
  let data = null;
  try {
    data = await response.json();
  } catch {
    // không có JSON body
  }
  if (!response.ok) {
    const err = new Error(data?.message || `Lỗi HTTP ${response.status}`);
    err.status = response.status;
    throw err;
  }
  return data.metadata;
}

// -> { payment_id, amount, expires_at, payment_url }
export const createVnpayPayment = (orderId) =>
  request('/vnpay/create', { method: 'POST', body: JSON.stringify({ order_id: orderId }) });

// -> { id, order_id, amount, status, response_code, paid_at, is_expired, ... }
export const fetchPayment = (paymentId) => request(`/${paymentId}`);

// -> { order_id, order_status, is_buyer, paid, can_pay, payments[] }
export const fetchOrderPayments = (orderId) => request(`/order/${orderId}`);

// Người bán xác nhận đã nhận tiền trả trực tiếp. method: 'BANK_TRANSFER' | 'CASH'
export const confirmPaymentReceived = (orderId, method) =>
  request(`/order/${orderId}/confirm-received`, { method: 'POST', body: JSON.stringify({ method }) });
