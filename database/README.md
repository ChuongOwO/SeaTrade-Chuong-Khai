# Thiết kế Database — SeaTrade AI (bản hợp nhất chính thức)

Cập nhật: 04/09/2026. Đây là bản schema **dùng xuyên suốt cho toàn dự án** (web
admin, mobile app, backend, AI service), thay thế cho cả hai bản nháp trước đó:

1. Bản nháp ban đầu (22/08/2026) — bám sát `web/src/data/mockData.js`, chỉ có
   9 bảng, đủ dùng cho UI hiện tại nhưng chưa bao quát toàn bộ nghiệp vụ.
2. Bản do đồng đội phụ trách AI/backend thiết kế — 18 bảng, bao quát đầy đủ
   nghiệp vụ hơn nhiều (AI detection theo bounding box, tách batch khỏi
   listing, đàm phán nhiều vòng, giao hàng, thanh toán, đánh giá, thông báo).

Bản này **giữ lại toàn bộ phần nghiệp vụ đầy đủ của bản (2)** làm khung chính
(vì nó phản ánh đúng hướng backend thật đang xây), đồng thời sửa/bổ sung vài
điểm kỹ thuật đã thống nhất với người dùng ngày 04/09/2026:

| Quyết định | Chọn | Vì sao |
|---|---|---|
| Phạm vi | Đầy đủ toàn bộ nghiệp vụ | Dùng lâu dài, không phải thiết kế lại khi web/mobile làm thêm tính năng (thanh toán, đánh giá,...) |
| Tọa độ vị trí | PostGIS `GEOGRAPHY(Point,4326)` | Query khoảng cách / tàu gần nhất ngay trong Postgres, khớp tính năng bản đồ hàng hải |
| Cột trạng thái | `VARCHAR + CHECK` | Thêm giá trị trạng thái mới chỉ cần sửa CHECK, không cần `ALTER TYPE` như ENUM gốc của Postgres |

*(Ghi chú CommonMark yêu cầu dòng trống trước bảng — xem file gốc.)*

## Những gì lấy từ bản đồng đội (giữ nguyên tinh thần thiết kế)

- Tách **`catch_batches`** (mẻ cá vừa đánh bắt) khỏi **`listings`** (tin đăng
  bán) — một mẻ có thể sinh nhiều tin đăng hoặc bán một phần.
- **`ai_detections`** lưu theo từng ảnh với tọa độ bounding box
  (`bbox_x/y/width/height`) và `model_version` — khớp với cách một model
  computer vision thật trả kết quả, thay vì gắn phẳng lên listing.
- **`listing_offers`** có `parent_offer_id` tự tham chiếu — hỗ trợ trả giá
  qua lại nhiều vòng giữa buyer/seller.
- **`order_items`** tách khỏi `orders` — một đơn có thể gồm nhiều dòng hàng
  (nhiều tin đăng khác nhau gộp vào 1 đơn).
- Bổ sung đầy đủ **`deliveries`** (điểm hẹn giao nhận trên biển),
  **`payments`**, **`reviews`** (đánh giá 2 chiều buyer↔seller),
  **`notifications`**, **`conversations`/`messages`**.

## Những gì sửa/bổ sung so với bản đồng đội

- **`VARCHAR + CHECK` thay vì Postgres ENUM** cho mọi cột trạng thái
  (`vessel_status`, `order_status`,...) — lý do đã nêu ở bảng trên.
- **PostGIS `GEOGRAPHY`** áp dụng nhất quán ở mọi nơi có tọa độ (`vessels`,
  `vessel_locations`, `catch_batches`, `listings`, `deliveries`) — bản đồng
  đội đã dùng nhưng chưa đồng bộ 100% ở mọi bảng.
- Thêm **`client_id`** (UUID) trên các bảng mobile có thể tạo lúc offline
  (`users`, `vessels`, `catch_batches`, `listings`, `orders`, `messages`) và
  bảng **`idempotency_keys`** — chuẩn bị cho tính năng đồng bộ khi mất mạng
  giữa biển (mobile app hiện đã gọi API thật, cần tính đến trường hợp mạng
  chập chờn ở ngoài khơi).
- Thêm **`deleted_at`** (soft delete) trên `users`, `vessels`, `listings` —
  tránh xoá cứng dữ liệu đã phát sinh giao dịch.
- Giữ lại **`species_grades`** (hạng A/B/C theo từng loài, có
  `price_multiplier`) và **`species.ai_label`** (cầu nối nhãn thô model AI ↔
  loài trong danh mục) từ bản nháp ban đầu — hai bảng này khớp trực tiếp với
  tính năng đang hiển thị trên `AIVisionPlayground.jsx` (giá theo hạng) mà
  bản đồng đội chưa có.
- Đổi tên `boats` → **`vessels`** để khớp đúng tên biến `INITIAL_VESSELS`
  đang dùng trong `mockData.js` của web, giảm công đổi tên khi nối API thật.

## Đã kiểm thử

- `schema.sql` đã chạy thử thành công trên PostgreSQL 16 (dùng kiểu `point`
  thay `geography` để kiểm tra cú pháp offline do môi trường không cài được
  extension PostGIS — phần `GEOGRAPHY`/`GIST` dùng đúng cú pháp chuẩn của
  PostGIS, cần cài `CREATE EXTENSION postgis;` khi chạy trên server thật).
- `seed.sql` chạy thành công toàn bộ luồng mẫu: user đăng ký → tàu đánh bắt →
  chụp ảnh AI nhận diện → đăng tin → đàm phán → tạo đơn → hẹn giao hàng →
  thanh toán → đánh giá → nhắn tin/thông báo.
- Cột generated (`listings.total_value`, `order_items.subtotal`) đã kiểm tra
  tính đúng giá trị.

## Câu hỏi còn mở — cần thống nhất với đồng đội trước khi chốt hẳn

1. Server Postgres thật của nhóm có bật được extension `postgis` không? Nếu
   hosting không hỗ trợ (một số gói free-tier không cho cài extension ngoài
   danh sách mặc định), cần đổi lại `GEOGRAPHY` → `DOUBLE PRECISION` lat/lng
   thường và tính khoảng cách ở tầng ứng dụng.
2. `orders.total_amount` là tổng nhiều `order_items` nên **không** dùng được
   generated column (Postgres không cho generated column tham chiếu bảng
   khác) — cần thống nhất ai (backend hay trigger DB) chịu trách nhiệm cập
   nhật cột này mỗi khi `order_items` thay đổi.
3. `vessels.owner_id NOT NULL` — cần user tồn tại trước khi tạo tàu, cần
   thống nhất thứ tự luồng đăng ký.
4. Chưa có bảng phân quyền chi tiết cho Web Admin — `role = 'admin'` hiện có
   toàn quyền, giữ đơn giản cho MVP.
5. Backend dùng ORM nào (SQLAlchemy nếu FastAPI, Prisma/Sequelize nếu Node)
   để map đúng các generated column, GEOGRAPHY, và CHECK constraint ở trên.

## Cấu trúc file

- `schema.sql` — toàn bộ DDL (20 bảng, PostgreSQL 14+).
- `seed.sql` — dữ liệu mẫu, chạy được ngay sau `schema.sql`.
- `erd.png` — sơ đồ ERD trực quan (5 nhóm màu theo chức năng).
- `erd.py` — script sinh `erd.png` (matplotlib, tự layout theo cột).
