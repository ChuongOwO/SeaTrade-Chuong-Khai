import io

from PIL import Image, UnidentifiedImageError


class InvalidImageError(Exception):
    """Dữ liệu upload lên không phải 1 file ảnh hợp lệ đọc được."""


def load_image_from_bytes(data: bytes) -> Image.Image:
    """Đọc bytes ảnh upload (multipart/form-data từ mobile/web) thành đối
    tượng PIL Image ở hệ màu RGB. Dùng PIL thay vì OpenCV để giữ
    requirements.txt gọn nhẹ — ultralytics (YOLOv8) nhận trực tiếp PIL Image
    làm input mà không cần chuyển qua numpy/OpenCV thủ công.
    """
    try:
        image = Image.open(io.BytesIO(data))
        image.load()
    except UnidentifiedImageError as exc:
        raise InvalidImageError("File tải lên không phải ảnh hợp lệ.") from exc
    except OSError as exc:
        raise InvalidImageError("Không đọc được ảnh (file có thể bị hỏng).") from exc

    # Ảnh chụp từ điện thoại đôi khi ở hệ màu khác (CMYK, có kênh alpha PNG...)
    # — ép về RGB 3 kênh chuẩn để model xử lý nhất quán.
    return image.convert("RGB")
