"""Danh mục loài hải sản — nguồn DUY NHẤT dùng chung cho ai-service
(app/services/inference.py) và các script train (training/).

Mỗi tên lớp (class name, đặt đúng như lúc gán nhãn trên Roboflow) map sang:
  - label_vi: tên hiển thị tiếng Việt
  - species_group: nhóm loài khớp cột name_vi của bảng seafood_species trong DB
    (Cá ngừ, Cá thu, Tôm, Mực, Cua...) — None nếu DB chưa có nhóm tương ứng
  - group_class: tên lớp THEO LOÀI mà detector mới dùng (xem training/README.md)
  - base_price: đơn giá nền tham khảo (đ/kg) để tính "Giá gợi ý"

Có 2 loại lớp:
  1. LỚP THEO LOÀI (ca_ngu, ca_thu, tom_hum...): detector 2 tầng nhận diện ở mức
     loài — ít lớp, dữ liệu mỗi lớp nhiều hơn nên chính xác hơn.
  2. LỚP BIẾN THỂ (ca_thu_phan, ca_ngu_van...): model hiện tại
     ml-models/seafood_model.pt (12 lớp) nhận diện thẳng ở mức này; ở thiết kế 2
     tầng thì model phân loại biến thể (variant classifier) trả về các lớp này.

Giá là giá THAM KHẢO tra cứu trên mạng 09-10/2026 (bán lẻ/tươi sống phổ biến),
BIẾN ĐỘNG THEO NGÀY/MÙA VỤ/VÙNG MIỀN — cần xác minh lại trước khi đưa vào báo
cáo. Lưu ý từng loài:
  - ca_thu_nhat (Cá Saba, Scomber japonicus) KHÁC CHI với nhóm ca_thu_ao/cham/phan
    (Scomberomorus) dù cùng gọi "cá thu"; giá lấy từ nguồn 2021, cần xác minh.
  - ca_ngu_bong: tên khoa học Euthynnus affinis = "Cá Ngừ Chấm", ngư dân hay gọi
    "Cá Ngừ Bông".
  - ca_ngu_van: giá NGUYÊN LIỆU (ngư dân bán, 19.000-30.000đ/kg giữa 2026). Nghị
    định 37/2024/NĐ-CP quy định kích thước tối thiểu được khai thác.
  - ca_bac_ma, ca_chim_den: chưa có nguồn giá đáng tin cậy, chỉ là ước tính.
  - Giá các lớp theo loài là mức phổ biến của nhóm, dùng khi chưa xác định được
    biến thể.

Nguồn dữ liệu ca_bac_ma, ca_chim_den, ca_thu_nhat, ca_ngu_van: dataset
"Commercial Marine Fish Species" v6, Roboflow Universe (CC BY 4.0 — PHẢI ghi
nguồn khi nộp báo cáo):
  https://universe.roboflow.com/commercial-marine-fish-species/commercial-marine-fish-species/dataset/6
"""

DEFAULT_BASE_PRICE = 150000


def _species(label_vi, species_group, group_class, base_price):
    return {
        "label_vi": label_vi,
        "species_group": species_group,
        "group_class": group_class,
        "base_price": base_price,
    }


SPECIES_INFO = {
    # ---------------------------- Lớp theo loài ----------------------------
    "ca_ngu": _species("Cá Ngừ", "Cá ngừ", "ca_ngu", 70000),
    "ca_thu": _species("Cá Thu", "Cá thu", "ca_thu", 190000),
    "tom_hum": _species("Tôm Hùm", "Tôm", "tom_hum", 1200000),
    "tom": _species("Tôm Biển", "Tôm", "tom", 250000),
    "muc": _species("Mực", "Mực", "muc", 165000),
    "cua": _species("Cua Biển", "Cua", "cua", 350000),
    "ca_bac_ma": _species("Cá Bạc Má", None, "ca_bac_ma", 60000),
    "ca_chim_den": _species("Cá Chim Đen", None, "ca_chim_den", 220000),
    # ----------------------------- Lớp biến thể ----------------------------
    "tom_hum_bong": _species("Tôm Hùm Bông", "Tôm", "tom_hum", 1600000),
    "tom_hum_xanh": _species("Tôm Hùm Xanh", "Tôm", "tom_hum", 1000000),
    "ca_thu_ao": _species("Cá Thu Áo", "Cá thu", "ca_thu", 190000),
    "ca_thu_cham": _species("Cá Thu Chấm", "Cá thu", "ca_thu", 190000),
    "ca_thu_phan": _species("Cá Thu Phấn", "Cá thu", "ca_thu", 240000),
    "ca_thu_nhat": _species("Cá Thu Nhật (Cá Saba)", "Cá thu", "ca_thu", 120000),
    "ca_ngu_bong": _species("Cá Ngừ Bông (Cá Ngừ Chấm)", "Cá ngừ", "ca_ngu", 70000),
    "ca_ngu_vay_xanh": _species("Cá Ngừ Vây Xanh", "Cá ngừ", "ca_ngu", 1800000),
    "ca_ngu_o": _species("Cá Ngừ Ồ", "Cá ngừ", "ca_ngu", 45000),
    "ca_ngu_van": _species("Cá Ngừ Vằn (Cá Ngừ Sọc Dưa)", "Cá ngừ", "ca_ngu", 25000),
    "muc_la": _species("Mực Lá", "Mực", "muc", 165000),
}


def get_species_info(class_name: str) -> dict:
    """Thông tin của 1 lớp; lớp lạ (chưa khai báo) dùng tên gốc + giá mặc định."""
    key = str(class_name).strip().lower()
    return SPECIES_INFO.get(key) or _species(str(class_name), None, key, DEFAULT_BASE_PRICE)


def has_variants(group_class: str) -> bool:
    """Lớp theo loài này có biến thể nào để model phân loại tầng 2 xác định không."""
    return any(
        name != group_class and info["group_class"] == group_class
        for name, info in SPECIES_INFO.items()
    )
