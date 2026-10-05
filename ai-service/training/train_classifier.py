"""Train model phân loại BIẾN THỂ (tầng 2) trên ảnh cắt từng con.

Từ ai-service/ (cần chạy prepare_datasets.py trước):
    python training/train_classifier.py

Xong copy best.pt thành ml-models/variant_classifier.pt — ai-service tự nhận và
bật tầng 2 (xem AI_CLASSIFIER_MODEL_PATH trong app/core/config.py).
"""

import argparse

from common import WORK_DIR

DEFAULT_DATA = WORK_DIR / "variant_cls"


def main():
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--data", default=str(DEFAULT_DATA))
    parser.add_argument("--model", default="yolov8s-cls.pt")
    parser.add_argument("--epochs", type=int, default=100)
    parser.add_argument("--patience", type=int, default=30)
    # Ảnh cắt từng con nhỏ hơn ảnh gốc nhiều — 224 là kích thước chuẩn cho phân loại
    parser.add_argument("--imgsz", type=int, default=224)
    parser.add_argument("--batch", type=int, default=32)
    parser.add_argument("--name", default="variant_classifier")
    args = parser.parse_args()

    from ultralytics import YOLO

    model = YOLO(args.model)
    model.train(
        data=args.data,
        epochs=args.epochs,
        patience=args.patience,
        imgsz=args.imgsz,
        batch=args.batch,
        project=str(WORK_DIR / "runs"),
        name=args.name,
        degrees=15.0,
        flipud=0.2,
        hsv_v=0.5,
    )

    best = WORK_DIR / "runs" / args.name / "weights" / "best.pt"
    print(f"\nModel tốt nhất: {best}")
    print("Đánh giá: python training/evaluate.py classifier --model", best)
    print("Dùng thật: copy thành ai-service/ml-models/variant_classifier.pt")


if __name__ == "__main__":
    main()
