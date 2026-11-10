import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_URL } from '../config/api';

// Mua ngay cả mẻ theo giá niêm yết. Back-end giữ mẻ cá ~15 phút chờ thanh toán.
// -> { order: { id, total_amount, hold_expires_at, ... }, conversation_id }
export async function buyNow(batchId) {
  const token = await AsyncStorage.getItem('userToken');
  const response = await fetch(`${API_URL}/api/orders/buy-now`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ batch_id: batchId }),
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
