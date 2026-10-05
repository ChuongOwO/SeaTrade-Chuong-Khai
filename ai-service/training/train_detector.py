"""Train detector YOLOv8 nhận diện hải sản theo LOÀI (tầng 1).

Chạy trên Google Colab (Runtime -> T4 GPU) hoặc máy có GPU. Từ ai-service/:
    python training/train_detector.py
    python training/train_detector.py --data <data.yaml khác> --model yolov8s.pt

Mặc định dùng dataset do prepare_datasets.py sinh ra. Xong copy file best.pt
in ra cuối cùng thành ml-models/seafood_model.pt.

So với lần train trước (yolov8s, 100 epoch, patience 20 — dừng ở epoch 94,
mAP50-95 = 0.59):
  - yolov8m: nhiều tham số hơn, tách biệt tốt hơn các loài na ná nhau
  - 150 epoch, patience 50: tránh dừng sớm khi val còn dao động
  - augmentation sát điều kiện thật trên tàu: xoay, lật dọc, ánh sáng/màu
"""

import argparse

from common import WORK_DIR

DEFAULT_DATA = WORK_DIR / "species_detect" / "data.yaml"

AUGMENTATION = {
    "degrees": 15.0,    # điện thoại chụp nghiêng
    "flipud": 0.2,      # cá nằm ngửa / lộn đầu trong khay
    "fliplr": 0.5,
    "hsv_h": 0.02,      # ánh đèn tàu ám màu
    "hsv_s": 0.6,
    "hsv_v": 0.5,       # nắng gắt / thiếu sáng
    "scale": 0.5,       # chụp xa - gần
    "mosaic": 1.0,
    "close_mosaic": 15, # 15 epoch cuối tắt mosaic để học ảnh "thật"
    "mixup": 0.1,
    "copy_paste": 0.1,  # nhiều con chồng lên nhau
}


def main():
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--data", default=str(DEFAULT_DATA))
    parser.add_argument("--model", default="yolov8m.pt")
    parser.add_argument("--epochs", type=int, default=150)
    parser.add_argument("--patience", type=int, default=50)
    parser.add_argument("--imgsz", type=int, default=640)
    parser.add_argument("--batch", type=int, default=16)
    parser.add_argument("--name", default="species_detector")
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
        cos_lr=True,
        **AUGMENTATION,
    )

    best = WORK_DIR / "runs" / args.name / "weights" / "best.pt"
    print(f"\nModel tốt nhất: {best}")
    print("Đánh giá: python training/evaluate.py detector --model", best)
    print("Dùng thật: copy thành ai-service/ml-models/seafood_model.pt")


if __name__ == "__main__":
    main()
