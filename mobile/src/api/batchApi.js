import { File } from 'expo-file-system';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_URL } from '../config/api';

// Giống aiApi.js: upload multipart bằng File.upload() của expo-file-system
// (ổn định hơn fetch + FormData trên React Native New Architecture).
const UPLOAD_TYPE_MULTIPART = 1;

// Đăng bán mẻ hải sản ngay từ ảnh vừa quét AI
// (back-end: POST /api/seafood/batches/from-scan — 1 transaction tạo mẻ cá,
// lưu ảnh, lưu kết quả AI và tin đăng bán có giá).
// fields: { vessel_id, species_id, quantity_kg, price_per_kg, quality_level,
//           latitude, longitude, ai_model_version, ai_confidence, ai_x1..ai_y2 }
export async function publishBatchFromScan(photoUri, fields) {
  const token = await AsyncStorage.getItem('userToken');

  // Multipart chỉ gửi được chuỗi — bỏ field rỗng, ép số sang chuỗi
  const parameters = Object.fromEntries(
    Object.entries(fields)
      .filter(([, value]) => value !== null && value !== undefined && value !== '')
      .map(([key, value]) => [key, String(value)])
  );

  let response;
  try {
    response = await new File(photoUri).upload(`${API_URL}/api/seafood/batches/from-scan`, {
      httpMethod: 'POST',
      uploadType: UPLOAD_TYPE_MULTIPART,
      fieldName: 'image',
      mimeType: 'image/jpeg',
      headers: { Authorization: `Bearer ${token}` },
      parameters,
    });
  } catch (err) {
    const wrapped = new Error('Không kết nối được tới máy chủ. Kiểm tra mạng rồi thử lại.');
    wrapped.cause = err;
    throw wrapped;
  }

  let data = null;
  try {
    data = JSON.parse(response.body);
  } catch {
    // body không phải JSON
  }

  if (response.status < 200 || response.status >= 300) {
    const detail = data?.error?.length ? `\n${data.error.join('\n')}` : '';
    throw new Error((data?.message || `Đăng bán thất bại (HTTP ${response.status})`) + detail);
  }
  return data.metadata;
}
