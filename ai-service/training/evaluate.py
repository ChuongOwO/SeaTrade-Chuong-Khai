"""Đánh giá model theo TỪNG LỚP để biết lớp nào yếu cần bổ sung ảnh.

Từ ai-service/:
    python training/evaluate.py detector                 # model đang dùng
    python training/evaluate.py detector --model <best.pt> --data <data.yaml> --split test
    python training/evaluate.py classifier --model <best.pt>

Nên đánh giá trên split TEST (ảnh model chưa từng thấy lúc train) để có con số
khách quan. Confusion matrix (ma trận nhầm lẫn) được lưu thành ảnh PNG trong
thư mục kết quả in ra cuối — xem lớp nào hay bị nhầm thành lớp nào.
"""

import argparse
import sys
from pathlib import Path

import yaml

from common import AI_SERVICE_DIR, WORK_DIR

WEAK_MAP50 = 0.7  # lớp dưới mức này được đánh dấu cần bổ sung dữ liệu


def ensure_same_classes(model, data):
    """Model và dataset phải cùng danh sách lớp theo đúng thứ tự, nếu không
    số liệu đánh giá vô nghĩa (lớp 0 của model bị chấm với lớp 0 của dataset)."""
    names = yaml.safe_load(Path(data).read_text(encoding="utf-8"))["names"]
    data_names = list(names.values()) if isinstance(names, dict) else list(names)
    model_names = [model.names[i] for i in sorted(model.names)]
    if data_names != model_names:
        sys.exit(f"Lớp của model {model_names}\nkhông khớp lớp của dataset {data_names}")


def evaluate_detector(model, data, split):
    ensure_same_classes(model, data)
    metrics = model.val(data=data, split=split, plots=True, project=str(WORK_DIR / "eval"), name="detector")

    print(f"\n{'Lớp':<18}{'Ảnh':>6}{'Precision':>11}{'Recall':>9}{'mAP50':>8}{'mAP50-95':>10}")
    weak = []
    for index, class_id in enumerate(metrics.box.ap_class_index):
        name = model.names[int(class_id)]
        precision, recall, map50, map50_95 = metrics.box.class_result(index)
        print(f"{name:<18}{int(metrics.nt_per_class[class_id]):>6}{precision:>11.3f}{recall:>9.3f}{map50:>8.3f}{map50_95:>10.3f}")
        if map50 < WEAK_MAP50:
            weak.append(name)

    print(f"\nTổng: mAP50={metrics.box.map50:.3f}  mAP50-95={metrics.box.map:.3f}")
    if weak:
        print(f"Lớp yếu (mAP50 < {WEAK_MAP50}), ưu tiên thu thập thêm ảnh: {', '.join(weak)}")
    print(f"Confusion matrix + biểu đồ: {metrics.save_dir}")


def evaluate_classifier(model, data, split):
    metrics = model.val(data=data, split=split, plots=True, project=str(WORK_DIR / "eval"), name="classifier")
    print(f"\nTop-1 accuracy: {metrics.top1:.3f}   Top-5 accuracy: {metrics.top5:.3f}")
    print(f"Confusion matrix: {metrics.save_dir}")


def main():
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("kind", choices=["detector", "classifier"])
    parser.add_argument("--model")
    parser.add_argument("--data")
    parser.add_argument("--split", default="test")
    args = parser.parse_args()

    from ultralytics import YOLO

    if args.kind == "detector":
        model_path = args.model or AI_SERVICE_DIR / "ml-models" / "seafood_model.pt"
        data = args.data or WORK_DIR / "species_detect" / "data.yaml"
        evaluate_detector(YOLO(str(model_path)), str(data), args.split)
    else:
        model_path = args.model or AI_SERVICE_DIR / "ml-models" / "variant_classifier.pt"
        data = args.data or WORK_DIR / "variant_cls"
        evaluate_classifier(YOLO(str(model_path)), str(data), args.split)


if __name__ == "__main__":
    main()
