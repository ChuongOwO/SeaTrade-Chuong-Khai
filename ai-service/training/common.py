"""Tiện ích dùng chung cho các script trong training/."""

import os
import sys
from pathlib import Path

TRAINING_DIR = Path(__file__).resolve().parent
AI_SERVICE_DIR = TRAINING_DIR.parent
WORK_DIR = TRAINING_DIR / "workspace"  # dataset/kết quả train sinh ra, đã gitignore

# Cho phép import danh mục loài của ai-service (nguồn duy nhất, không lặp lại)
sys.path.insert(0, str(AI_SERVICE_DIR))

# Tên thư mục split mà Roboflow export ở định dạng YOLOv8
SPLIT_ALIASES = {"train": ("train",), "val": ("valid", "val"), "test": ("test",)}
IMAGE_SUFFIXES = {".jpg", ".jpeg", ".png", ".webp"}


def download_roboflow_dataset(project: str, version: int, workspace: str) -> Path:
    """Tải dataset YOLOv8 từ Roboflow. API key đọc từ biến môi trường
    ROBOFLOW_API_KEY — KHÔNG ghi thẳng key vào code."""
    api_key = os.getenv("ROBOFLOW_API_KEY")
    if not api_key:
        sys.exit("Thiếu biến môi trường ROBOFLOW_API_KEY.")

    from roboflow import Roboflow

    dataset = (
        Roboflow(api_key=api_key)
        .workspace(workspace)
        .project(project)
        .version(version)
        .download("yolov8", location=str(WORK_DIR / f"{project}-{version}"))
    )
    return Path(dataset.location)


def find_split_dirs(dataset_root: Path) -> dict:
    """{'train': Path, 'val': Path, 'test': Path} — chỉ gồm split có thật."""
    splits = {}
    for split, aliases in SPLIT_ALIASES.items():
        for alias in aliases:
            if (dataset_root / alias / "images").is_dir():
                splits[split] = dataset_root / alias
                break
    return splits


def list_images(split_dir: Path):
    return sorted(p for p in (split_dir / "images").iterdir() if p.suffix.lower() in IMAGE_SUFFIXES)


def label_path_for(image_path: Path) -> Path:
    return image_path.parent.parent / "labels" / f"{image_path.stem}.txt"
