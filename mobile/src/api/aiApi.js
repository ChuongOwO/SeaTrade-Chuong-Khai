import { File } from 'expo-file-system';
import { AI_SERVICE_URL } from '../config/api';

// Lớp gọi ai-service (Python FastAPI + YOLOv8, xem thư mục ai-service/ ở gốc
// dự án) — TÁCH BIỆT hoàn toàn với back-end Node (API_URL trong config/api.js):
// khác ngôn ngữ, khác cổng, và ai-service KHÔNG có middleware xác thực JWT
// (chỉ dùng nội bộ trong LAN của tàu/thương lái khi demo/đồ án), nên ở đây
// không gắn Authorization header như chatApi.js/vesselsApi.js.
const CLASSIFY_URL = `${AI_SERVICE_URL}/api/v1/classify`;

// UploadType.MULTIPART của expo-file-system (SDK 57) — dùng thẳng giá trị số
// (1) thay vì import UploadType, vì API File-based này còn khá mới (SDK 57
// đổi hẳn cách dùng expo-file-system so với các bản trước, xem AGENTS.md:
// "Expo HAS CHANGED"), tránh sai tên export không cần thiết.
const UPLOAD_TYPE_MULTIPART = 1;

// imageUri: uri ảnh trả về từ expo-image-picker (ImagePicker.launchCameraAsync(),
// xem screens/CameraScreen.js) — dạng file://...
// Trả về nguyên response JSON của ai-service (xem ai-service/app/models/schemas.py
// ClassificationResponse): { success, image_width, image_height, count, detections, ... }
export async function classifySeafoodImage(imageUri) {
  let response;
  try {
    // Dùng File.upload() (expo-file-system) thay vì fetch() + FormData thủ
    // công — cách cũ hay bị "Network request failed" âm thầm khi upload file
    // qua multipart trên bản React Native/Expo mới (New Architecture), vì
    // fetch polyfill xử lý FormData chứa file chưa ổn định. File.upload() là
    // API upload CHÍNH THỨC của Expo, dùng code native để đóng gói multipart
    // nên ổn định hơn nhiều — xem docs.expo.dev/versions/v57.0.0/sdk/filesystem.
    const file = new File(imageUri);
    response = await file.upload(CLASSIFY_URL, {
      httpMethod: 'POST',
      uploadType: UPLOAD_TYPE_MULTIPART,
      fieldName: 'file',
      mimeType: 'image/jpeg',
    });
  } catch (err) {
    // Lỗi mạng (ai-service chưa bật, sai IP/cổng, điện thoại không cùng
    // Wi-Fi với máy chạy ai-service...) — bọc lại thành lỗi dễ hiểu cho
    // người dùng thay vì lỗi kỹ thuật khó hiểu.
    const wrapped = new Error(
      'Không kết nối được tới AI Service. Kiểm tra ai-service đã chạy (uvicorn) và điện thoại có cùng mạng Wi-Fi với máy chủ chưa.'
    );
    wrapped.cause = err;
    throw wrapped;
  }

  let data = null;
  try {
    data = JSON.parse(response.body);
  } catch {
    // không có JSON body hợp lệ (VD lỗi 500 dạng HTML mặc định)
  }

  if (response.status < 200 || response.status >= 300) {
    const err = new Error(data?.detail || `Lỗi AI Service (HTTP ${response.status})`);
    err.status = response.status;
    throw err;
  }

  return data;
}
