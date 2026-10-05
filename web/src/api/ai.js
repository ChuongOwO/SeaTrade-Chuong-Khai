// Gọi thẳng ai-service (Python FastAPI + YOLOv8, thư mục ai-service/) — khác
// cổng với back-end Node và không dùng JWT, giống mobile/src/api/aiApi.js.
const AI_SERVICE_URL = import.meta.env.VITE_AI_SERVICE_URL || 'http://localhost:8000';

// Trả về ClassificationResponse (ai-service/app/models/schemas.py):
// { success, image_width, image_height, count, detections[], processing_time_ms, model_version }
export async function classifySeafoodImage(file) {
  const formData = new FormData();
  formData.append('file', file);

  let response;
  try {
    response = await fetch(`${AI_SERVICE_URL}/api/v1/classify`, { method: 'POST', body: formData });
  } catch {
    throw new Error(`Không kết nối được tới AI Service (${AI_SERVICE_URL}). Kiểm tra ai-service đã chạy (uvicorn) chưa.`);
  }

  const data = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(data?.detail || `Lỗi AI Service (HTTP ${response.status})`);
  }
  return data;
}
