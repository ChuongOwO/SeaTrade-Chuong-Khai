"""Chuyển dataset gán nhãn theo BIẾN THỂ (export YOLOv8 từ Roboflow) thành 2
dataset cho pipeline 2 tầng:

  workspace/species_detect/  detector theo LOÀI (ca_ngu, ca_thu, tom_hum...)
  workspace/variant_cls/     ảnh cắt từng con, chia thư mục theo BIẾN THỂ
                             (ca_thu_phan, ca_ngu_van...) cho model phân loại

Nhờ vậy nhóm chỉ cần gán nhãn 1 lần (theo biến thể) trên Roboflow. Ảnh không
có nhãn nào (ảnh nền: khay trống, lưới, sàn tàu) được giữ nguyên làm mẫu âm.

Cách dùng (từ thư mục ai-service/):
    python training/prepare_datasets.py --source <thư mục dataset đã giải nén>
    python training/prepare_datasets.py --roboflow-project seatrade-seafood --roboflow-version 3
"""

import argparse
import shutil
from collections import Counter
from pathlib import Path

import yaml
from PIL import Image

from common import (
    WORK_DIR,
    download_roboflow_dataset,
    find_split_dirs,
    label_path_for,
    list_images,
)
from app.services.species_catalog import get_species_info, has_variants

MIN_CROP_SIDE_PX = 24  # bỏ các con quá nhỏ, ảnh cắt ra không đủ chi tiết để phân loại


def read_class_names(dataset_root: Path) -> list:
    names = yaml.safe_load((dataset_root / "data.yaml").read_text(encoding="utf-8"))["names"]
    return list(names.values()) if isinstance(names, dict) else list(names)


def build_group_classes(source_names: list) -> list:
    """Danh sách lớp theo loài (giữ thứ tự xuất hiện) từ các lớp biến thể."""
    return list(dict.fromkeys(get_species_info(name)["group_class"] for name in source_names))


def read_labels(image_path: Path) -> list:
    label_file = label_path_for(image_path)
    if not label_file.exists():
        return []
    return [line.split() for line in label_file.read_text().splitlines() if line.strip()]


def yolo_to_pixel_box(parts, width, height):
    cx, cy, w, h = (float(v) for v in parts[1:5])
    return ((cx - w / 2) * width, (cy - h / 2) * height, (cx + w / 2) * width, (cy + h / 2) * height)


def write_detect_sample(image_path, labels, source_names, group_ids, out_split: Path):
    (out_split / "images").mkdir(parents=True, exist_ok=True)
    (out_split / "labels").mkdir(parents=True, exist_ok=True)
    shutil.copy2(image_path, out_split / "images" / image_path.name)

    remapped = []
    for parts in labels:
        group = get_species_info(source_names[int(parts[0])])["group_class"]
        remapped.append(" ".join([str(group_ids[group]), *parts[1:5]]))
    (out_split / "labels" / f"{image_path.stem}.txt").write_text("\n".join(remapped))


def write_variant_crops(image_path, labels, source_names, out_split: Path, counter: Counter):
    image = None
    for index, parts in enumerate(labels):
        variant = source_names[int(parts[0])]
        if not has_variants(get_species_info(variant)["group_class"]):
            continue
        image = image or Image.open(image_path).convert("RGB")
        x1, y1, x2, y2 = yolo_to_pixel_box(parts, *image.size)
        if min(x2 - x1, y2 - y1) < MIN_CROP_SIDE_PX:
            continue

        target_dir = out_split / variant
        target_dir.mkdir(parents=True, exist_ok=True)
        image.crop((x1, y1, x2, y2)).save(target_dir / f"{image_path.stem}_{index}.jpg", quality=95)
        counter[variant] += 1


def main():
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--source", type=Path, help="Thư mục dataset YOLOv8 (có data.yaml)")
    parser.add_argument("--roboflow-project")
    parser.add_argument("--roboflow-version", type=int)
    parser.add_argument("--roboflow-workspace", default="nguyenduykhai")
    args = parser.parse_args()

    if args.roboflow_project:
        source = download_roboflow_dataset(args.roboflow_project, args.roboflow_version, args.roboflow_workspace)
    elif args.source:
        source = args.source
    else:
        parser.error("Cần --source hoặc --roboflow-project")

    source_names = read_class_names(source)
    group_classes = build_group_classes(source_names)
    group_ids = {name: idx for idx, name in enumerate(group_classes)}

    detect_dir = WORK_DIR / "species_detect"
    cls_dir = WORK_DIR / "variant_cls"
    shutil.rmtree(detect_dir, ignore_errors=True)
    shutil.rmtree(cls_dir, ignore_errors=True)

    splits = find_split_dirs(source)
    crop_counts = {}
    for split, split_dir in splits.items():
        crop_counts[split] = Counter()
        for image_path in list_images(split_dir):
            labels = read_labels(image_path)
            write_detect_sample(image_path, labels, source_names, group_ids, detect_dir / split)
            write_variant_crops(image_path, labels, source_names, cls_dir / split, crop_counts[split])

    data_yaml = {"path": str(detect_dir), "names": dict(enumerate(group_classes))}
    data_yaml.update({split: f"{split}/images" for split in splits})
    (detect_dir / "data.yaml").write_text(yaml.safe_dump(data_yaml, allow_unicode=True), encoding="utf-8")

    print(f"Lớp biến thể gốc ({len(source_names)}): {source_names}")
    print(f"Lớp theo loài ({len(group_classes)}): {group_classes}")
    print(f"Dataset detector: {detect_dir / 'data.yaml'}")
    print(f"Dataset phân loại biến thể: {cls_dir}")
    for split, counter in crop_counts.items():
        print(f"  {split}: {dict(counter)}")


if __name__ == "__main__":
    main()
