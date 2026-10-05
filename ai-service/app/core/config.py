import os
from pathlib import Path

# ai-service/  (thư mục gốc của service, cha 2 cấp của file này)
BASE_DIR = Path(__file__).resolve().parent.parent.parent


def _env_bool(name: str, default: bool) -> bool:
    return os.getenv(name, str(default)).strip().lower() in ("1", "true", "yes")


# Model YOLOv8 nhận diện hải sản (tầng 1). Hiện tại là seafood_model.pt (12 lớp
# biến thể); sau khi train lại theo training/README.md sẽ là model theo loài.
# Override bằng biến môi trường AI_MODEL_PATH để thử model khác.
MODEL_PATH = os.getenv("AI_MODEL_PATH", str(BASE_DIR / "ml-models" / "seafood_model.pt"))

# Model phân loại biến thể (tầng 2, tuỳ chọn) — xác định cá thu phấn / cá ngừ
# vằn... từ vùng ảnh detector đã cắt. File không tồn tại thì bỏ qua tầng 2.
CLASSIFIER_MODEL_PATH = os.getenv(
    "AI_CLASSIFIER_MODEL_PATH", str(BASE_DIR / "ml-models" / "variant_classifier.pt")
)
# Tầng 2 chỉ được ghi đè tên loài khi chắc chắn tối thiểu mức này
CLASSIFIER_MIN_CONFIDENCE = float(os.getenv("AI_CLASSIFIER_MIN_CONFIDENCE", "0.5"))

# Ngưỡng tin cậy tối thiểu để giữ 1 phát hiện — nâng từ 0.35 lên 0.4 để bớt
# nhận diện bừa (model hiện tại có precision ~0.76).
CONFIDENCE_THRESHOLD = float(os.getenv("AI_CONFIDENCE_THRESHOLD", "0.4"))

# Dưới ngưỡng này phát hiện vẫn trả về nhưng bị gắn is_uncertain = True để app
# yêu cầu người dùng xác nhận / chọn loài thủ công.
REVIEW_CONFIDENCE_THRESHOLD = float(os.getenv("AI_REVIEW_CONFIDENCE_THRESHOLD", "0.6"))

# NMS (Non-Maximum Suppression): ngưỡng IoU gộp các khung trùng nhau.
# agnostic = gộp khung trùng KHÁC lớp → 1 con cá không bị gắn 2 nhãn khác loài.
IOU_THRESHOLD = float(os.getenv("AI_IOU_THRESHOLD", "0.5"))
AGNOSTIC_NMS = _env_bool("AI_AGNOSTIC_NMS", True)

# Test-Time Augmentation: suy luận thêm trên ảnh lật/đổi tỉ lệ rồi gộp kết quả
# — chính xác hơn chút nhưng chậm ~2-3 lần, nên mặc định tắt khi chạy CPU.
USE_TTA = _env_bool("AI_USE_TTA", False)

# Kích thước ảnh đầu vào cho YOLOv8 — khớp với imgsz lúc train model.
IMAGE_SIZE = int(os.getenv("AI_IMAGE_SIZE", "640"))

# Danh sách origin được phép gọi API (CORS) — để "*" khi chạy dev/demo đồ án
# (mobile app + web admin gọi trực tiếp qua IP LAN). Khi triển khai thật nên
# giới hạn lại đúng domain/app thật.
CORS_ORIGINS = os.getenv("AI_CORS_ORIGINS", "*").split(",")

# Giới hạn dung lượng file ảnh upload (bytes) — đủ cho ảnh chụp từ điện thoại,
# tránh bị gửi nhầm file quá nặng làm chậm/crash service.
MAX_UPLOAD_BYTES = int(os.getenv("AI_MAX_UPLOAD_BYTES", str(10 * 1024 * 1024)))
