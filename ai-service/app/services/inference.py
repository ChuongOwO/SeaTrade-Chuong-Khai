import time
from functools import lru_cache
from pathlib import Path

from ultralytics import YOLO

from app.core.config import (
    AGNOSTIC_NMS,
    CLASSIFIER_MIN_CONFIDENCE,
    CLASSIFIER_MODEL_PATH,
    CONFIDENCE_THRESHOLD,
    IMAGE_SIZE,
    IOU_THRESHOLD,
    MODEL_PATH,
    REVIEW_CONFIDENCE_THRESHOLD,
    USE_TTA,
)
from app.services.species_catalog import get_species_info, has_variants

# Pipeline 2 tầng (xem training/README.md):
#   1. Detector YOLOv8 tìm từng con hải sản + loài (cá ngừ, cá thu, tôm hùm...)
#   2. (Tuỳ chọn) Classifier YOLOv8-cls xác định biến thể trên vùng ảnh đã cắt
#      (cá thu phấn, cá ngừ vằn...) — chỉ chạy khi có file model tầng 2.
# Model 12 lớp biến thể hiện tại vẫn chạy được: tầng 1 trả thẳng tên biến thể,
# tầng 2 tự bỏ qua vì lớp đó không có biến thể con.


@lru_cache(maxsize=1)
def get_model() -> YOLO:
    # Load 1 LẦN và giữ trong bộ nhớ — tránh đọc lại file .pt mỗi request.
    return YOLO(MODEL_PATH)


@lru_cache(maxsize=1)
def get_classifier():
    if not Path(CLASSIFIER_MODEL_PATH).is_file():
        return None
    return YOLO(CLASSIFIER_MODEL_PATH)


def _file_label(path: str) -> str:
    return path.replace("\\", "/").rsplit("/", 1)[-1]


def _classify_variant(image, box, group_class):
    """Trả về (tên lớp biến thể, độ tin cậy) hoặc (None, None) nếu không xác định."""
    classifier = get_classifier()
    if classifier is None or not has_variants(group_class):
        return None, None

    probs = classifier.predict(source=image.crop(box), verbose=False)[0].probs
    variant = classifier.names[int(probs.top1)]
    confidence = float(probs.top1conf)
    # Chỉ nhận biến thể thuộc đúng loài detector đã thấy và đủ chắc chắn
    belongs_to_group = get_species_info(variant)["group_class"] == group_class
    if confidence < CLASSIFIER_MIN_CONFIDENCE or not belongs_to_group:
        return None, None
    return variant, round(confidence, 4)


def _build_detection(image, box, names):
    class_id = int(box.cls[0])
    class_name = str(names.get(class_id, class_id))
    confidence = float(box.conf[0])
    x1, y1, x2, y2 = (float(v) for v in box.xyxy[0])

    variant, variant_confidence = _classify_variant(image, (x1, y1, x2, y2), class_name)
    info = get_species_info(variant or class_name)

    return {
        "class_id": class_id,
        "class_name": class_name,
        "variant": variant,
        "variant_confidence": variant_confidence,
        "label_vi": info["label_vi"],
        "species_group": info["species_group"],
        "confidence": round(confidence, 4),
        "is_uncertain": confidence < REVIEW_CONFIDENCE_THRESHOLD,
        "box": {"x1": x1, "y1": y1, "x2": x2, "y2": y2},
        "estimated_price_per_kg": info["base_price"],
    }


def run_detection(image):
    """Chạy pipeline lên 1 ảnh PIL RGB (xem image_helper.py), trả về dict thô
    (chưa ép kiểu Pydantic) mô tả các vật thể phát hiện được.
    """
    model = get_model()

    started = time.perf_counter()
    result = model.predict(
        source=image,
        imgsz=IMAGE_SIZE,
        conf=CONFIDENCE_THRESHOLD,
        iou=IOU_THRESHOLD,
        agnostic_nms=AGNOSTIC_NMS,
        augment=USE_TTA,
        verbose=False,
    )[0]
    detections = [_build_detection(image, box, model.names) for box in result.boxes]
    elapsed_ms = (time.perf_counter() - started) * 1000

    # Độ tin cậy giảm dần — kết quả "chắc chắn" nhất hiển thị đầu tiên
    detections.sort(key=lambda d: d["confidence"], reverse=True)

    classifier = get_classifier()
    height, width = result.orig_shape
    return {
        "width": int(width),
        "height": int(height),
        "detections": detections,
        # Không thấy gì, hoặc phát hiện tốt nhất vẫn chưa đủ chắc → cần người xác nhận
        "needs_review": not detections or detections[0]["is_uncertain"],
        "processing_time_ms": round(elapsed_ms, 1),
        "model_version": _file_label(MODEL_PATH),
        "classifier_version": _file_label(CLASSIFIER_MODEL_PATH) if classifier else None,
    }
