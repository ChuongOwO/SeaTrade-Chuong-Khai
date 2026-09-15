from fastapi import APIRouter, File, HTTPException, UploadFile

from app.core.config import MAX_UPLOAD_BYTES
from app.models.schemas import ClassificationResponse
from app.services.inference import run_detection
from app.utils.image_helper import InvalidImageError, load_image_from_bytes

router = APIRouter()

ALLOWED_CONTENT_TYPES = {"image/jpeg", "image/jpg", "image/png", "image/webp"}


@router.post("/classify", response_model=ClassificationResponse)
async def classify_seafood(file: UploadFile = File(...)):
    """Nhận 1 ảnh chụp từ mobile (multipart/form-data, field "file"), chạy
    YOLOv8 để nhận diện + đếm hải sản trong ảnh, trả về danh sách bounding
    box kèm tên loài, độ tin cậy và giá gợi ý — dùng cho tab "Quét AI" bên
    mobile (xem mobile/src/screens/CameraScreen.js, api/aiApi.js).
    """
    if file.content_type not in ALLOWED_CONTENT_TYPES:
        raise HTTPException(status_code=400, detail="Chỉ chấp nhận ảnh JPEG/PNG/WEBP.")

    raw = await file.read()
    if not raw:
        raise HTTPException(status_code=400, detail="File ảnh rỗng.")
    if len(raw) > MAX_UPLOAD_BYTES:
        raise HTTPException(status_code=413, detail="Ảnh quá lớn (tối đa 10MB).")

    try:
        image = load_image_from_bytes(raw)
    except InvalidImageError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    try:
        result = run_detection(image)
    except Exception as exc:  # noqa: BLE001 - lỗi bất ngờ từ model cũng cần trả JSON rõ ràng, không để FastAPI 500 trần
        raise HTTPException(
            status_code=500, detail=f"Lỗi khi chạy mô hình AI: {exc}"
        ) from exc

    return {
        "success": True,
        "image_width": result["width"],
        "image_height": result["height"],
        "count": len(result["detections"]),
        "detections": result["detections"],
        "processing_time_ms": result["processing_time_ms"],
        "model_version": result["model_version"],
    }
