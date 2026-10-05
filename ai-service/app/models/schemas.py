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
    # Biến thể do model phân loại tầng 2 xác định (vd ca_thu_phan) — None nếu
    # không có model tầng 2 hoặc chưa đủ chắc chắn.
    variant: Optional[str] = None
    variant_confidence: Optional[float] = None
    # Tên hiển thị tiếng Việt, map qua SPECIES_INFO (app/services/species_catalog.py)
    # — mặc định trùng class_name nếu chưa có trong bảng map.
    label_vi: str
    # Nhóm loài khớp seafood_species.name_vi trong DB (Cá ngừ, Cá thu, Tôm...)
    # — None nếu lớp này chưa có nhóm tương ứng.
    species_group: Optional[str] = None
    confidence: float = Field(..., ge=0, le=1)
    # Độ tin cậy dưới ngưỡng review → app nên yêu cầu người dùng xác nhận loài
    is_uncertain: bool = False
    box: BoundingBox
    estimated_price_per_kg: Optional[int] = None


class ClassificationResponse(BaseModel):
    success: bool
    image_width: int
    image_height: int
    count: int
    detections: List[Detection]
    # True khi không phát hiện được gì hoặc phát hiện tốt nhất chưa đủ chắc chắn
    needs_review: bool
    processing_time_ms: float
    model_version: str
    classifier_version: Optional[str] = None
