"""Test thủ công nhanh cho ai-service — không phụ thuộc pytest, chạy trực
tiếp bằng:  python tests/test_inference.py  (từ thư mục ai-service/)

Chạy model thật trên 1 ảnh mẫu có sẵn trong repo (thư mục test/images ở gốc
dự án) và in ra kết quả phát hiện được — dùng để kiểm tra nhanh model + code
inference chạy đúng trước khi bật server thật (uvicorn).
"""

import sys
from pathlib import Path

AI_SERVICE_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(AI_SERVICE_DIR))

from app.services.inference import run_detection  # noqa: E402
from app.utils.image_helper import load_image_from_bytes  # noqa: E402

# Thư mục test/images ở GỐC dự án (khác ai-service/tests/ này) — bộ ảnh mẫu
# YOLO kèm nhãn dùng để đánh giá model, xem test/labels/*.txt.
SAMPLE_IMAGES_DIR = AI_SERVICE_DIR.parent / "test" / "images"


def main():
    images = sorted(SAMPLE_IMAGES_DIR.glob("*.jpg"))
    if not images:
        print(f"Không tìm thấy ảnh mẫu trong {SAMPLE_IMAGES_DIR}")
        return

    for image_path in images:
        with open(image_path, "rb") as f:
            image = load_image_from_bytes(f.read())

        result = run_detection(image)
        print(f"\n== {image_path.name} ==")
        print(f"Kích thước: {result['width']}x{result['height']}")
        print(f"Thời gian xử lý: {result['processing_time_ms']}ms")
        print(f"Số phát hiện: {len(result['detections'])}")
        for det in result["detections"]:
            print(
                f"  - {det['label_vi']} (class_id={det['class_id']}) "
                f"conf={det['confidence']:.2f} box={det['box']}"
            )


if __name__ == "__main__":
    main()
