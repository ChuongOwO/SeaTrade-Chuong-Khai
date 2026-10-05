import time
from functools import lru_cache

from ultralytics import YOLO

from app.core.config import CONFIDENCE_THRESHOLD, IMAGE_SIZE, MODEL_PATH

# Map tên lớp (class name) mà YOLO trả về — LẤY THEO ĐÚNG TÊN LÚC GÁN NHÃN
# TRÊN ROBOFLOW/TRAIN MODEL — sang:
#   - label_vi: tên hiển thị tiếng Việt cho thuyền trưởng / thương lái
#   - species_group: nhóm loài khớp đúng cột name_vi của bảng seafood_species
#     trong DB (Cá ngừ, Cá thu, Tôm, Mực, Cua...) để mobile/web tự chọn sẵn
#     loài khi đăng mẻ cá từ kết quả AI. None = chưa có nhóm tương ứng trong DB.
#   - base_price: đơn giá nền tham khảo (đ/kg) để tính "Giá gợi ý".
#
# Đề tài: "Xây dựng nền tảng phần mềm kết nối giao thương hải sản ven biển và
# tự động phân loại hải sản ứng dụng xử lý ảnh" — AI nhận dạng loài hải sản
# trưởng thành vừa đánh bắt (tôm, cua, cá ngừ, cá thu, mực...).
#
# Model hiện tại ml-models/seafood_model.pt có 12 lớp (kiểm tra bằng lệnh):
#   python -c "from ultralytics import YOLO; print(YOLO('ml-models/seafood_model.pt').names)"
# Mỗi loài được TÁCH thành lớp con theo biến thể vì giá thị trường chênh lệch
# nhiều (vd tôm hùm bông vs tôm hùm xanh) — xem HUONG_DAN_TRAIN_MODEL_HAI_SAN.md.
#
# Giá base_price là giá THAM KHẢO tra cứu trên mạng (đơn giá bán lẻ/tươi sống
# phổ biến, tra cứu 09-10/2026) — GIÁ HẢI SẢN BIẾN ĐỘNG THEO NGÀY/MÙA VỤ/VÙNG
# MIỀN, cần xác minh lại với giá thị trường thực tế trước khi đưa vào báo cáo.
#
# Nguồn dữ liệu 4 lớp `ca_bac_ma`, `ca_chim_den`, `ca_thu_nhat`, `ca_ngu_van`:
# dataset "Commercial Marine Fish Species" v6 trên Roboflow Universe (CC BY 4.0
# — PHẢI ghi nguồn khi nộp báo cáo/công bố):
#   https://universe.roboflow.com/commercial-marine-fish-species/commercial-marine-fish-species/dataset/6
# (ảnh + nhãn đã trích vào du_lieu_bo_sung_online/<ten_lop>/).
#
# Lưu ý từng loài:
# - `ca_thu_nhat` (Cá Saba, Scomber japonicus) KHÁC CHI với nhóm
#   `ca_thu_ao/cham/phan` (Scomberomorus) dù cùng gọi "cá thu"; giá lấy từ
#   nguồn 2021 (90.000-150.000đ/kg), cần xác minh lại.
# - `ca_ngu_bong` — tên khoa học Euthynnus affinis = "Cá Ngừ Chấm", ngư dân
#   thường gọi "Cá Ngừ Bông" nên ghi cả 2 tên.
# - `ca_ngu_van` — giá NGUYÊN LIỆU (ngư dân bán, 19.000-30.000đ/kg giữa 2026),
#   chưa có giá bán lẻ tin cậy. Nghị định 37/2024/NĐ-CP có quy định kích thước
#   tối thiểu được khai thác — hướng phát triển: cảnh báo cá chưa đạt chuẩn.
# - `ca_bac_ma`, `ca_chim_den` — chưa có nguồn giá đáng tin cậy, chỉ là ước tính.
SPECIES_INFO = {
    # --- Tôm hùm (giá tôm hùm SỐNG, theo mùa) ---
    "tom_hum_bong": {"label_vi": "Tôm Hùm Bông", "species_group": "Tôm", "base_price": 1600000},
    "tom_hum_xanh": {"label_vi": "Tôm Hùm Xanh", "species_group": "Tôm", "base_price": 1000000},
    # --- Cá thu nhóm Scomberomorus (giá tươi sống, bán lẻ) ---
    "ca_thu_ao": {"label_vi": "Cá Thu Áo", "species_group": "Cá thu", "base_price": 190000},
    "ca_thu_cham": {"label_vi": "Cá Thu Chấm", "species_group": "Cá thu", "base_price": 190000},
    "ca_thu_phan": {"label_vi": "Cá Thu Phấn", "species_group": "Cá thu", "base_price": 240000},
    "ca_thu_nhat": {"label_vi": "Cá Thu Nhật (Cá Saba)", "species_group": "Cá thu", "base_price": 120000},
    # --- Cá ngừ ---
    "ca_ngu_bong": {"label_vi": "Cá Ngừ Bông (Cá Ngừ Chấm)", "species_group": "Cá ngừ", "base_price": 70000},
    "ca_ngu_vay_xanh": {"label_vi": "Cá Ngừ Vây Xanh", "species_group": "Cá ngừ", "base_price": 1800000},
    "ca_ngu_o": {"label_vi": "Cá Ngừ Ồ", "species_group": "Cá ngừ", "base_price": 45000},
    "ca_ngu_van": {"label_vi": "Cá Ngừ Vằn (Cá Ngừ Sọc Dưa)", "species_group": "Cá ngừ", "base_price": 25000},
    # --- Cá khác phổ biến ở chợ VN (chưa có nhóm tương ứng trong seafood_species) ---
    "ca_bac_ma": {"label_vi": "Cá Bạc Má", "species_group": None, "base_price": 60000},
    "ca_chim_den": {"label_vi": "Cá Chim Đen", "species_group": None, "base_price": 220000},
    # --- Lớp CẦN BỔ SUNG khi train model kế tiếp (model hiện tại CHƯA có) ---
    # Đề tài yêu cầu nhận dạng cả mực và cua; giữ sẵn mapping để model mới
    # train xong chỉ cần đặt đúng tên lớp này là chạy, không phải sửa code.
    "muc_la": {"label_vi": "Mực Lá", "species_group": "Mực", "base_price": 165000},
    "cua": {"label_vi": "Cua Biển", "species_group": "Cua", "base_price": 350000},
}
DEFAULT_BASE_PRICE = 150000


@lru_cache(maxsize=1)
def get_model() -> YOLO:
    # Load model YOLO 1 LẦN DUY NHẤT và giữ trong bộ nhớ (singleton qua
    # lru_cache) — tránh việc mỗi request lại đọc lại file .pt từ đĩa, vốn
    # tốn vài trăm ms tới vài giây tuỳ máy.
    return YOLO(MODEL_PATH)


def _model_version_label() -> str:
    return MODEL_PATH.replace("\\", "/").rsplit("/", 1)[-1]


def run_detection(image):
    """Chạy YOLOv8 lên 1 ảnh PIL (đã convert RGB, xem image_helper.py) và trả
    về dict thô (chưa ép kiểu Pydantic) mô tả tất cả vật thể phát hiện được.
    """
    model = get_model()

    started = time.perf_counter()
    results = model.predict(
        source=image,
        imgsz=IMAGE_SIZE,
        conf=CONFIDENCE_THRESHOLD,
        verbose=False,
    )
    elapsed_ms = (time.perf_counter() - started) * 1000

    result = results[0]
    detections = []
    for box in result.boxes:
        class_id = int(box.cls[0])
        class_name = model.names.get(class_id, str(class_id))
        confidence = float(box.conf[0])
        x1, y1, x2, y2 = (float(v) for v in box.xyxy[0])

        info = SPECIES_INFO.get(str(class_name).strip().lower(), {})
        detections.append(
            {
                "class_id": class_id,
                "class_name": str(class_name),
                "label_vi": info.get("label_vi", str(class_name)),
                "species_group": info.get("species_group"),
                "confidence": round(confidence, 4),
                "box": {"x1": x1, "y1": y1, "x2": x2, "y2": y2},
                "estimated_price_per_kg": info.get("base_price", DEFAULT_BASE_PRICE),
            }
        )

    # Sắp xếp theo độ tin cậy giảm dần — kết quả AI "chắc chắn" nhất hiển thị
    # đầu tiên cho thuyền trưởng (xem mobile CameraScreen.js).
    detections.sort(key=lambda d: d["confidence"], reverse=True)

    height, width = result.orig_shape
    return {
        "width": int(width),
        "height": int(height),
        "detections": detections,
        "processing_time_ms": round(elapsed_ms, 1),
        "model_version": _model_version_label(),
    }
