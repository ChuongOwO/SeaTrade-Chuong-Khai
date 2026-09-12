# Thiết kế Database — SeaTrade AI

**Cập nhật: 12/09/2026 — schema THẬT đã xác nhận khớp 100% với sơ đồ ERD, đã
chạy qua Flyway migration, đang là schema thực tế trên database chạy thật.**

## Schema nào là chính thức?

**`full_schema_dongdoi.sql` là schema duy nhất đang được dùng thật** — do đồng
đội phụ trách AI/backend thiết kế và đã có sẵn trên database thật của nhóm.
File này được sao chép thành `back-end/migrations/V1__init_schema.sql` và chạy
qua Flyway (`npm run db:migrate` trong `back-end/`) để tạo toàn bộ 18 bảng +
12 enum type + trigger tự cập nhật `updated_at`. Toàn bộ code back-end
(`back-end/src/modules/*`) viết theo đúng tên bảng/cột của file này.

Đã kiểm tra đối chiếu từng bảng, từng cột, từng kiểu dữ liệu giữa
`full_schema_dongdoi.sql` và sơ đồ ERD do nhóm vẽ — khớp chính xác 100%,
không lệch cột nào.

## `schema.sql` — ĐÃ NGƯNG DÙNG, đừng chạy hay tham chiếu file này nữa

Bản `schema.sql` (và `seed.sql`, `erd.png`, `erd.py`, `erd.dbml` liên quan tới
nó) là **bản nháp cũ** tôi từng cùng thiết kế khi CHƯA biết đồng đội đã có sẵn
schema thật trên database đang chạy. Bản nháp này dùng:

- `VARCHAR + CHECK` cho các cột trạng thái thay vì Postgres `ENUM` thật.
- Tên bảng khác: `catch_batches` (thay vì `seafood_batches`), `listings`
  (thay vì `seafood_listings`), `listing_offers` (thay vì `offers`).
- Có thêm các cột/bảng mà bản thật KHÔNG có: `client_id`, `deleted_at`,
  `species_grades`, `idempotency_keys`.

Sau khi tìm ra file `full_schema_dongdoi.sql` (đồng đội gửi qua Messenger,
xem lại đoạn hội thoại "Conversation á") và đối chiếu với database thật đang
chạy, xác nhận **`schema.sql` không khớp thực tế** và không được dùng ở đâu
trong code. Giữ lại file này (và `seed.sql`, `erd.png`, `erd.py`, `erd.dbml`)
chỉ để biết lịch sử quá trình thiết kế, **không chạy, không tham chiếu khi
code hay khi viết báo cáo đồ án** — mọi thứ liên quan tới cấu trúc database
trong báo cáo phải lấy từ `full_schema_dongdoi.sql` hoặc sơ đồ ERD mới (xem
mục dưới).

`chat_schema.sql` cũng đã ngưng dùng vì lý do tương tự (bản đoán cấu trúc
bảng `conversations`/`messages` trước khi biết bản thật) — xem chú thích ngay
trong file đó.

## Sơ đồ ERD hiện tại — bản nào đúng?

Sơ đồ `database/erd.png` trong repo (sinh từ `erd.py`) vẽ theo `schema.sql`
cũ nên **không còn khớp** với database thật nữa (sai tên bảng, sai cột như
nêu trên).

Sơ đồ ERD mới (18 bảng: `seafood_species`, `users`, `price_history`,
`notifications`, `vessels`, `vessel_locations`, `seafood_batches`,
`seafood_images`, `ai_detections`, `seafood_listings`, `offers`,
`conversations`, `messages`, `order_items`, `orders`, `deliveries`,
`payments`, `reviews`) đã được đối chiếu và khớp chính xác 100% với
`full_schema_dongdoi.sql` — đây mới là sơ đồ nên dùng cho báo cáo đồ án.

**TODO:** thay `database/erd.png` bằng sơ đồ mới này (và cân nhắc xóa/gộp
`erd.py`, `erd.dbml` nếu chúng sinh ra bản cũ) để tránh 2 sơ đồ mâu thuẫn
nhau tồn tại song song trong repo.

## Quản lý version schema — dùng Flyway, không sửa tay

Từ 17/08/2026, mọi thay đổi schema đi qua Flyway (xem `back-end/README.md`
mục 2), không sửa tay trực tiếp trên database và không sửa lại
`full_schema_dongdoi.sql`/`V1__init_schema.sql` đã chạy rồi. Muốn thêm/sửa
bảng, cột: tạo file `back-end/migrations/V2__...sql` mới rồi chạy
`npm run db:migrate`.

## Cấu trúc file trong thư mục này

- `full_schema_dongdoi.sql` — **schema thật, chính thức**, bản sao y hệt
  `back-end/migrations/V1__init_schema.sql`.
- `chat_schema.sql` — đã ngưng dùng (xem chú thích trong file).
- `schema.sql`, `seed.sql`, `erd.png`, `erd.py`, `erd.dbml` — bản nháp cũ, đã
  ngưng dùng, giữ lại chỉ để biết lịch sử (xem mục "ĐÃ NGƯNG DÙNG" ở trên).
- `architecture.png`, `architecture.py`, `a.md` — tài liệu kiến trúc hệ
  thống nói chung, chưa rà soát lại trong lần cập nhật này — cần kiểm tra
  riêng xem có phần nào mô tả sai theo schema cũ hay không trước khi dùng cho
  báo cáo.

## Câu hỏi còn mở

1. Đã xác nhận extension `postgis` cài được trên máy chạy database thật
   (đã cài qua Stack Builder — xem `back-end/README.md`). Nếu deploy lên
   server/hosting khác sau này, cần kiểm tra lại extension này có sẵn không.
2. Chưa có bảng phân quyền chi tiết cho Web Admin — `role = 'ADMIN'` hiện có
   toàn quyền, giữ đơn giản cho MVP.
3. Phần lớn bảng nghiệp vụ trade (`seafood_listings`, `orders`, `order_items`,
   `payments`, `deliveries`, `reviews`, `offers`, `price_history`) đã có
   trong database nhưng **chưa có API back-end nào dùng tới** — mới chỉ
   `conversations`/`messages` (chat) và `notifications` được tận dụng.
