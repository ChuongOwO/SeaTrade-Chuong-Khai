import Constants from 'expo-constants';
import { Platform } from 'react-native';

// Tách riêng phần suy ra IP LAN (dùng chung cho cả back-end Node và
// ai-service Python) khỏi việc ghép cổng — 2 service chạy trên CÙNG máy/LAN
// nhưng KHÁC cổng, xem AI_SERVICE_URL bên dưới.
const resolveLanIp = () => {
  let ip = '172.16.240.208'; // Fallback mặc định

  const debuggerHost =
    Constants.expoConfig?.hostUri ||
    Constants.manifest?.debuggerHost ||
    Constants.manifest2?.extra?.expoGo?.debuggerHost;

  if (debuggerHost) {
    ip = debuggerHost.split(':')[0];
  } else if (Platform.OS === 'android' && !Constants.expoConfig) {
    ip = '10.0.2.2'; // Giả lập Android
  }

  return ip;
};

const getApiUrl = () => `http://${resolveLanIp()}:5000`;

export const API_URL = getApiUrl();

// ai-service (Python FastAPI + YOLOv8, xem thư mục ai-service/ ở gốc dự án)
// chạy như 1 service RIÊNG BIỆT với back-end Node — cùng máy/LAN nhưng khác
// cổng. Mặc định uvicorn chạy ở cổng 8000:
//   uvicorn main:app --host 0.0.0.0 --port 8000
// Override bằng biến môi trường EXPO_PUBLIC_AI_SERVICE_PORT nếu teammate
// chạy ở cổng khác. Xem mobile/src/api/aiApi.js.
const AI_SERVICE_PORT = process.env.EXPO_PUBLIC_AI_SERVICE_PORT || '8000';
export const AI_SERVICE_URL = `http://${resolveLanIp()}:${AI_SERVICE_PORT}`;
export const API_AUTH_URL = `${API_URL}/api/auth`;
export const API_REGISTER_URL = `${API_AUTH_URL}/register`;
export const API_LOGIN_URL = `${API_AUTH_URL}/login`;
export const API_AVATAR_URL = `${API_AUTH_URL}/avatar`;

// Chức năng Chat (back-end/src/modules/chat) — xem mobile/src/api/chatApi.js
export const API_CHAT_CONVERSATIONS_URL = `${API_URL}/api/chat/conversations`;
export const chatMessagesUrl = (conversationId) => `${API_CHAT_CONVERSATIONS_URL}/${conversationId}/messages`;

// Thông báo (back-end/src/modules/notifications) — dùng bảng notifications
// chung, hiện tại chỉ dùng để đếm số tin nhắn chưa đọc cho chấm đỏ, xem
// mobile/src/api/notificationsApi.js + context/NotificationContext.js
export const API_NOTIFICATIONS_URL = `${API_URL}/api/notifications`;
export const API_NOTIFICATIONS_UNREAD_COUNT_URL = `${API_NOTIFICATIONS_URL}/unread-count`;

// Tàu & vị trí GPS (back-end/src/modules/vessels) — dùng cho Bản Đồ Hải Trình.
// GET /my-vessel lấy vessel_id của tàu mình; POST /:id/locations gửi vị trí
// GPS thật lên định kỳ. Xem mobile/src/api/vesselsApi.js + screens/HomeScreen.js.
export const API_VESSELS_URL = `${API_URL}/api/vessels`;
