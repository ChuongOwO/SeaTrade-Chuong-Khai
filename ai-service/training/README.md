# Train lại model AI nhận diện hải sản

## Vì sao cần train lại

Model hiện tại `ml-models/seafood_model.pt` (YOLOv8s, 12 lớp biến thể) đạt
precision 0.76, recall 0.75, mAP50 0.78, mAP50-95 0.59. Quá trình train đã
chững lại từ epoch 74, nên train thêm epoch không giúp được. Nguyên nhân chính:

1. 12 lớp biến thể quá giống nhau (cá thu áo/chấm/phấn/Nhật, 4 loại cá ngừ),
   mỗi lớp chỉ có khoảng 64–100 ảnh.
2. Không có ảnh nền (không có hải sản), nên model gán bừa mọi vật vào 1 lớp.
3. Ảnh train chủ yếu lấy từ mạng, khác ảnh chụp thật trên tàu.
4. Chưa có mực, cua, tôm thường, trong khi đề tài yêu cầu.

## Pipeline 2 tầng

```
ảnh ──► Tầng 1: detector theo LOÀI ──► khung + loài (ca_ngu, ca_thu, tom_hum, muc, cua...)
              (yolov8m)                    │
                                           ▼ cắt từng con
        Tầng 2: classifier BIẾN THỂ ──► ca_thu_phan, ca_ngu_van... (tuỳ chọn)
              (yolov8s-cls)
```

- Tầng 1 có ít lớp nên mỗi lớp có nhiều ảnh hơn. Đây là mức đề tài yêu cầu, và
  khớp với `species_group` lưu trong DB.
- Tầng 2 chỉ dùng để gợi ý giá chi tiết theo biến thể. Không có file
  `ml-models/variant_classifier.pt` thì ai-service tự bỏ qua tầng này.
- Chỉ cần gán nhãn 1 lần theo **biến thể** trên Roboflow:
  `prepare_datasets.py` tự sinh cả 2 dataset từ đó.
- Danh mục lớp, nhóm loài và giá nằm ở một chỗ duy nhất:
  `app/services/species_catalog.py`. Thêm lớp mới thì khai báo ở đó trước.

## Thu thập & gán nhãn (Roboflow)

| Việc cần làm | Mục tiêu |
|---|---|
| Ảnh mỗi biến thể | ≥ 200–300, ưu tiên tự chụp bằng điện thoại ở chợ cá, cảng, trên tàu |
| Lớp bắt buộc còn thiếu | `muc_la` (mực), `cua`, `tom` (tôm biển) |
| Ảnh nền (không gán nhãn) | khoảng 10% tổng số ảnh: khay trống, lưới, sàn tàu, đá lạnh |
| Điều kiện chụp | nhiều góc, nhiều con chồng nhau, nắng gắt, thiếu sáng, đèn tàu |
| Chất lượng nhãn | khung ôm sát từng con, không bỏ sót con nào trong ảnh |
| Chia tập | Train 70% / Valid 20% / **Test 10%** (test để đánh giá khách quan) |

Tên lớp đặt đúng như key trong `species_catalog.py` (`ca_thu_phan`,
`muc_la`, `cua`...).

## Chạy (Google Colab T4 hoặc máy có GPU)

Từ thư mục `ai-service/`:

```bash
pip install -r requirements.txt -r training/requirements.txt

# 1. Tải dataset từ Roboflow (key đọc từ biến môi trường, không ghi vào code)
export ROBOFLOW_API_KEY=...          # PowerShell: $env:ROBOFLOW_API_KEY="..."
python training/prepare_datasets.py --roboflow-project seatrade-seafood --roboflow-version <số version>
#    hoặc với dataset đã tải sẵn:  --source <thư mục có data.yaml>

# 2. Train detector theo loài (tầng 1)
python training/train_detector.py

# 3. (Tuỳ chọn) Train classifier biến thể (tầng 2)
python training/train_classifier.py

# 4. Đánh giá trên tập TEST: in kết quả từng lớp, liệt kê lớp yếu, lưu confusion matrix
python training/evaluate.py detector --model training/workspace/runs/species_detector/weights/best.pt
python training/evaluate.py classifier --model training/workspace/runs/variant_classifier/weights/best.pt
```

Kết quả thấy ổn thì copy file vào `ml-models/` rồi khởi động lại ai-service:

- `species_detector/weights/best.pt` → `ml-models/seafood_model.pt`
- `variant_classifier/weights/best.pt` → `ml-models/variant_classifier.pt`

Mọi thứ sinh ra khi train nằm trong `training/workspace/` (đã gitignore).

## Tinh chỉnh khi chạy (biến môi trường của ai-service)

| Biến | Mặc định | Ý nghĩa |
|---|---|---|
| `AI_CONFIDENCE_THRESHOLD` | 0.4 | Bỏ các phát hiện có độ tin cậy thấp hơn mức này |
| `AI_REVIEW_CONFIDENCE_THRESHOLD` | 0.6 | Dưới mức này thì gắn `is_uncertain` và app yêu cầu người dùng xác nhận |
| `AI_IOU_THRESHOLD` / `AI_AGNOSTIC_NMS` | 0.5 / true | Gộp khung trùng, kể cả khác lớp: 1 con chỉ có 1 nhãn |
| `AI_USE_TTA` | false | Test-time augmentation: chính xác hơn chút nhưng chậm 2–3 lần |
| `AI_CLASSIFIER_MIN_CONFIDENCE` | 0.5 | Tầng 2 chỉ đổi tên biến thể khi đủ chắc chắn |
