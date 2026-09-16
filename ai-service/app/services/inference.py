import time
from functools import lru_cache

from ultralytics import YOLO

from app.core.config import CONFIDENCE_THRESHOLD, IMAGE_SIZE, MODEL_PATH

# Map tên lớp (class name) mà YOLO trả về — LẤY THEO ĐÚNG TÊN LÚC GÁN NHÃN
# TRÊN ROBOFLOW/TRAIN MODEL — sang tên hiển thị tiếng Việt + đơn giá nền tham
# khảo (đ/kg) để tính "Giá gợi ý" cho thuyền trưởng.
#
# ============================ QUAN TRỌNG =====================================
# Model mặc định hiện tại (ml-models/shrimp_model.pt) là sản phẩm của ĐỀ TÀI
# CŨ "tôm/cua giống" ĐÃ BỊ HỦY — chỉ nhận diện được ấu trùng tôm/cua nhỏ, KHÔNG
# nhận diện được các loài hải sản trưởng thành (cá ngừ, cá thu, tôm hùm, mực,
# cua) của đề tài THẬT hiện tại. Đây chỉ là placeholder tạm để có model chạy
# thử pipeline (upload ảnh → inference → trả kết quả) trong lúc chưa có model
# đúng phạm vi.
#
# Cần train 1 model MỚI cho đúng 5 loài hải sản thật — xem hướng dẫn đầy đủ
# (thu thập ảnh, gán nhãn Roboflow, train bằng Colab) trong file
# HUONG_DAN_TRAIN_MODEL_HAI_SAN.md + script train_seafood_model.py ở gốc dự án.
# Sau khi có model mới, cập nhật dict SPECIES_INFO bên dưới cho khớp đúng tên
# lớp (in ra bằng lệnh):
#   python -c "from ultralytics import YOLO; print(YOLO('ml-models/seafood_model.pt').names)"
# ==============================================================================
SPECIES_INFO = {
    "ca_ngu": {"label_vi": "Cá Ngừ Vây Vàng", "base_price": 190000},
    "ca_thu": {"label_vi": "Cá Thu Thuận Hải", "base_price": 220000},
    "tom_hum": {"label_vi": "Tôm Hùm Bông", "base_price": 1280000},
    "muc_la": {"label_vi": "Mực Lá Tươi", "base_price": 165000},
    "cua": {"label_vi": "Cua Cà Mau", "base_price": 350000},
    # Giữ tạm mapping của model tôm giống cũ để không lỗi nếu vẫn còn dùng
    # shrimp_model.pt trong lúc chưa train xong model mới.
    "shrimp": {"label_vi": "Tôm giống (model cũ, đề tài đã hủy)", "base_price": 220000},
    "tom": {"label_vi": "Tôm giống (model cũ, đề tài đã hủy)", "base_price": 220000},
    "tom giong": {"label_vi": "Tôm giống (model cũ, đề tài đã hủy)", "base_price": 220000},
}
DEFAULT_BASE_PRICE = 150000


@lru_cache(maxsize=1)
def get_model() -> YOLO:
    # Load model YOLO 1 LẦN DUY NHẤT và giữ trong bộ nhớ (singleton qua
    # lru_cache) — tránh việc mỗi request lại đọc lại file .pt từ đĩa, vốn
    # tốn vài trăm ms tới vài giây tuỳ máy.
    return YOLO(MODEL_PATH)


def _model_version_label() -> str:
    return MODEL_PATH.replace("\\", "/").rsplit("/", 1)[-1]


def run_detection(image):
    """Chạy YOLOv8 lên 1 ảnh PIL (đã convert RGB, xem image_helper.py) và trả
    về dict thô (chưa ép kiểu Pydantic) mô tả tất cả vật thể phát hiện được.
    """
    model = get_model()

    started = time.perf_counter()
    results = model.predict(
        source=image,
        imgsz=IMAGE_SIZE,
        conf=CONFIDENCE_THRESHOLD,
        verbose=False,
    )
    elapsed_ms = (time.perf_counter() - started) * 1000

    result = results[0]
    detections = []
    for box in result.boxes:
        class_id = int(box.cls[0])
        class_name = model.names.get(class_id, str(class_id))
        confidence = float(box.conf[0])
        x1, y1, x2, y2 = (float(v) for v in box.xyxy[0])

        info = SPECIES_INFO.get(str(class_name).strip().lower(), {})
        detections.append(
            {
                "class_id": class_id,
                "class_name": str(class_name),
                "label_vi": info.get("label_vi", str(class_name)),
                "confidence": round(confidence, 4),
                "box": {"x1": x1, "y1": y1, "x2": x2, "y2": y2},
                "estimated_price_per_kg": info.get("base_price", DEFAULT_BASE_PRICE),
            }
        )

    # Sắp xếp theo độ tin cậy giảm dần — kết quả AI "chắc chắn" nhất hiển thị
    # đầu tiên cho thuyền trưởng (xem mobile CameraScreen.js).
    detections.sort(key=lambda d: d["confidence"], reverse=True)

    height, width = result.orig_shape
    return {
        "width": int(width),
        "height": int(height),
        "detections": detections,
        "processing_time_ms": round(elapsed_ms, 1),
        "model_version": _model_version_label(),
    }
