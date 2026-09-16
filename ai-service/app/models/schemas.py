from typing import List, Optional

from pydantic import BaseModel, Field


class BoundingBox(BaseModel):
    # Toạ độ góc trên-trái (x1,y1) và dưới-phải (x2,y2) tính theo pixel thật
    # của ảnh gốc (KHÔNG chuẩn hoá 0-1) — để mobile/web vẽ khung trực tiếp
    # lên ảnh hiển thị (kích thước image_width/image_height trong response).
    x1: float
    y1: float
    x2: float
    y2: float


class Detection(BaseModel):
    class_id: int
    class_name: str
    # Tên hiển thị tiếng Việt, map từ class_name qua SPECIES_INFO
    # (app/services/inference.py) — mặc định trùng class_name nếu chưa có
    # trong bảng map.
    label_vi: str
    confidence: float = Field(..., ge=0, le=1)
    box: BoundingBox
    estimated_price_per_kg: Optional[int] = None


class ClassificationResponse(BaseModel):
    success: bool
    image_width: int
    image_height: int
    count: int
    detections: List[Detection]
    processing_time_ms: float
    model_version: str
