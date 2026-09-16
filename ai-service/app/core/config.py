import os
from pathlib import Path

# ai-service/  (thư mục gốc của service, cha 2 cấp của file này)
BASE_DIR = Path(__file__).resolve().parent.parent.parent

# Đường dẫn tới model YOLOv8 đã train riêng cho tôm giống. Có thể override
# bằng biến môi trường AI_MODEL_PATH để thử model khác (VD: yolov8n.pt gốc,
# hoặc ml-models/shrimp_model_old.pt) mà không cần sửa code.
MODEL_PATH = os.getenv("AI_MODEL_PATH", str(BASE_DIR / "ml-models" / "shrimp_model.pt"))

# Ngưỡng độ tin cậy tối thiểu để 1 phát hiện được coi là hợp lệ — loại bỏ bớt
# các phát hiện nhiễu (false positive) có độ tin cậy quá thấp. 0.35 là mức
# khởi điểm hợp lý cho YOLOv8, có thể tinh chỉnh lại sau khi test thực tế.
CONFIDENCE_THRESHOLD = float(os.getenv("AI_CONFIDENCE_THRESHOLD", "0.35"))

# Kích thước ảnh đầu vào cho YOLOv8 (ảnh sẽ được resize về hình vuông này
# trước khi đưa vào model) — khớp với imgsz lúc train model trên Roboflow.
IMAGE_SIZE = int(os.getenv("AI_IMAGE_SIZE", "640"))

# Danh sách origin được phép gọi API (CORS) — để "*" khi chạy dev/demo đồ án
# (mobile app + web admin gọi trực tiếp qua IP LAN). Khi triển khai thật nên
# giới hạn lại đúng domain/app thật.
CORS_ORIGINS = os.getenv("AI_CORS_ORIGINS", "*").split(",")

# Giới hạn dung lượng file ảnh upload (bytes) — đủ cho ảnh chụp từ điện thoại,
# tránh bị gửi nhầm file quá nặng làm chậm/crash service.
MAX_UPLOAD_BYTES = int(os.getenv("AI_MAX_UPLOAD_BYTES", str(10 * 1024 * 1024)))
