"""Test thủ công nhanh cho ai-service — không phụ thuộc pytest, chạy trực
tiếp bằng (từ thư mục ai-service/):

    python tests/test_inference.py                 # ảnh mẫu có sẵn
    python tests/test_inference.py anh1.jpg anh2.jpg  # ảnh tự chọn

Mặc định lấy vài ảnh đầu của mỗi lớp trong du_lieu_bo_sung_online/<ten_lop>/images
ở gốc dự án — tên thư mục chính là lớp đúng, nên in kèm ĐÚNG/SAI để kiểm tra
nhanh model + code inference trước khi bật server thật (uvicorn).
"""

import sys
from pathlib import Path

AI_SERVICE_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(AI_SERVICE_DIR))

from app.services.inference import run_detection  # noqa: E402
from app.utils.image_helper import load_image_from_bytes  # noqa: E402

SAMPLE_DATASET_DIR = AI_SERVICE_DIR.parent / "du_lieu_bo_sung_online"
IMAGES_PER_CLASS = 3


def collect_sample_images():
    """Trả về list (đường dẫn ảnh, tên lớp đúng)."""
    samples = []
    for class_dir in sorted(p for p in SAMPLE_DATASET_DIR.iterdir() if p.is_dir()):
        images = sorted((class_dir / "images").glob("*.jpg"))[:IMAGES_PER_CLASS]
        samples.extend((image, class_dir.name) for image in images)
    return samples


def main():
    if len(sys.argv) > 1:
        samples = [(Path(arg), None) for arg in sys.argv[1:]]
    elif SAMPLE_DATASET_DIR.exists():
        samples = collect_sample_images()
    else:
        print(f"Không tìm thấy ảnh mẫu trong {SAMPLE_DATASET_DIR}, hãy truyền đường dẫn ảnh.")
        return

    correct = 0
    for image_path, expected in samples:
        with open(image_path, "rb") as f:
            result = run_detection(load_image_from_bytes(f.read()))

        detections = result["detections"]
        top = detections[0]["class_name"] if detections else None
        verdict = "" if expected is None else (" -> ĐÚNG" if top == expected else f" -> SAI (đúng: {expected})")
        correct += top == expected

        print(f"\n== {image_path.name}{verdict}")
        print(f"   {result['width']}x{result['height']}, {result['processing_time_ms']}ms, {len(detections)} phát hiện")
        for det in detections:
            print(f"   - {det['label_vi']} [{det['species_group']}] conf={det['confidence']:.2f}")

    labelled = sum(1 for _, expected in samples if expected)
    if labelled:
        print(f"\nTop-1 đúng: {correct}/{labelled}")


if __name__ == "__main__":
    main()
