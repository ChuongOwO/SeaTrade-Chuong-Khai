import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_VESSELS_URL } from '../config/api';

// Lớp gọi API Tàu & Vị trí GPS — viết theo đúng phong cách raw fetch() + đọc
// token từ AsyncStorage đang dùng chung toàn app (xem chatApi.js). Khớp trực
// tiếp với back-end/src/modules/vessels/* (đã đọc code thật, không phải giả định).

async function authHeaders() {
  const token = await AsyncStorage.getItem('userToken');
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

async function handleResponse(response) {
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
  return data;
}

// Tàu của user hiện tại kèm vị trí GPS mới nhất (GET /api/vessels/my-vessel).
// Trả về null nếu user chưa đăng ký tàu nào (backend trả 404 trong trường hợp
// này — coi là bình thường, không phải lỗi).
export async function fetchMyVessel() {
  const response = await fetch(`${API_VESSELS_URL}/my-vessel`, {
    headers: await authHeaders(),
  });
  if (response.status === 404) return null;
  const data = await handleResponse(response);
  return data.metadata;
}

// Gửi 1 vị trí GPS mới lên server cho tàu của mình
// (POST /api/vessels/:id/locations) — gọi định kỳ khi có GPS thật, xem
// HomeScreen.js (throttle theo LOCATION_SEND_INTERVAL_MS để tránh spam API).
export async function postVesselLocation(vesselId, { latitude, longitude, speed = 0, heading = 0 }) {
  const response = await fetch(`${API_VESSELS_URL}/${vesselId}/locations`, {
    method: 'POST',
    headers: await authHeaders(),
    body: JSON.stringify({ latitude, longitude, speed, heading }),
  });
  const data = await handleResponse(response);
  return data.metadata;
}
