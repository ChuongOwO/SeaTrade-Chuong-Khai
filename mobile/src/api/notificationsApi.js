import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_NOTIFICATIONS_UNREAD_COUNT_URL } from '../config/api';

async function authHeaders() {
  const token = await AsyncStorage.getItem('userToken');
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

// Chỉ cần SỐ LƯỢNG tin nhắn chưa đọc để quyết định hiện chấm đỏ hay không
// (xem context/NotificationContext.js) — chưa cần màn danh sách thông báo
// đầy đủ trong lần này. Lọc type=NEW_MESSAGE vì bảng notifications dùng
// chung cho nhiều loại, ở đây chỉ quan tâm tin nhắn.
export async function fetchUnreadMessageCount() {
  const response = await fetch(`${API_NOTIFICATIONS_UNREAD_COUNT_URL}?type=NEW_MESSAGE`, {
    headers: await authHeaders(),
  });
  if (!response.ok) {
    throw new Error(`Lỗi HTTP ${response.status}`);
  }
  const data = await response.json();
  return data?.metadata?.count || 0;
}
