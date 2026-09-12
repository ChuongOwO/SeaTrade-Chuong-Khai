# SeaTrade Back-end

API cho nền tảng SeaTrade AI (Node.js + Express + PostgreSQL, driver `pg` thuần, không ORM).

## 1. Cài đặt lần đầu

### 1.1. Tạo database rỗng

Dự án chưa có script tự tạo database (chỉ tạo **bảng** bên trong 1 database có sẵn), nên bước đầu tiên là tự tạo 1 database rỗng bằng pgAdmin:

1. Mở pgAdmin 4, kết nối vào server Postgres trên máy bạn (thường là `localhost`, port `5432`).
2. Click phải vào **Databases** → **Create** → **Database...**
3. Đặt tên là `seafood_trading` (đúng tên đồng đội dùng trong comment ở đầu `database/full_schema_dongdoi.sql`) → Save.
4. Mở **Query Tool** trên database `seafood_trading` vừa tạo, chạy thử:
   ```sql
   CREATE EXTENSION IF NOT EXISTS "postgis";
   ```
   Nếu báo lỗi kiểu `could not open extension control file ".../postgis.control"` nghĩa là PostGIS chưa được cài cho bản Postgres này — cần mở **Stack Builder** (đi kèm bộ cài PostgreSQL của EDB) → chọn đúng version Postgres đang chạy → mục *Spatial Extensions* → cài **PostGIS**, rồi thử lại câu lệnh trên. Nếu chạy được (kể cả báo "already exists") thì bỏ qua, bước này chỉ để kiểm tra sớm — `CREATE EXTENSION` thật sự nằm sẵn trong migration V1 rồi.

### 1.2. Cấu hình kết nối

```bash
cp .env.example .env
```

Mở `.env`, điền đúng mật khẩu Postgres bạn đã đặt lúc cài (user mặc định thường là `postgres`).

### 1.3. Cài dependencies

```bash
npm install
```
(dự án này chuẩn hoá dùng `pnpm` — xem `pnpm-lock.yaml` — `pnpm install` cũng dùng được nếu máy bạn đã cài `pnpm`; dùng `npm install` thì đừng commit `package-lock.json` sinh ra, file này đã bị `.gitignore`).

### 1.4. Chạy migration để tạo toàn bộ bảng

```bash
npm run db:migrate
```

Lệnh này gọi `back-end/scripts/flyway.js` — một wrapper Node tự viết (không dùng gói `node-flywaydb` vì gói đó đã ngừng bảo trì và không chạy được với Flyway bản mới + Node bản mới trên Windows, xem chú thích đầu file). Lần đầu chạy, nó sẽ tự tải Flyway Command-line 10.22.0 (kèm sẵn Java, không cần cài Java riêng) về thư mục `back-end/.flyway-cli/` (không commit lên git, mỗi máy tự tải 1 lần) — cần mạng, mất khoảng 1-2 phút tuỳ tốc độ mạng. Sau đó nó chạy `back-end/migrations/V1__init_schema.sql` — chính là bản schema thật của đồng đội (`database/full_schema_dongdoi.sql`), tạo toàn bộ 12 enum type + 23 bảng (`users`, `vessels`, `seafood_listings`, `orders`, `conversations`, `messages`, ...) + trigger tự cập nhật `updated_at` + dữ liệu mẫu `seafood_species`.

Kiểm tra lại trong pgAdmin: refresh `seafood_trading` → Schemas → public → Tables — phải thấy đủ các bảng trên, cộng thêm 1 bảng `flyway_schema_history` (Flyway tự tạo để theo dõi đã chạy migration nào).

## 2. Quản lý phiên bản schema bằng Flyway

Từ giờ, **mọi thay đổi schema** (thêm cột, thêm bảng, sửa constraint...) phải đi qua 1 file migration mới, không sửa tay trực tiếp trên DB và cũng không sửa lại file `V1__init_schema.sql` đã chạy rồi.

Cách thêm 1 thay đổi mới:

1. Tạo file mới trong `back-end/migrations/`, đặt tên theo quy ước Flyway: `V2__mo_ta_ngan.sql`, `V3__them_cot_x.sql`, ... (số tăng dần, có 2 dấu gạch dưới `__` sau số phiên bản).
2. Viết SQL thay đổi cần thiết (vd `ALTER TABLE ... ADD COLUMN ...;`) vào file đó.
3. Chạy lại:
   ```bash
   npm run db:migrate
   ```
   Flyway chỉ chạy các file **chưa** có trong `flyway_schema_history`, nên sẽ tự bỏ qua V1 và chỉ áp dụng V2 trở đi.

Vài lệnh khác hữu ích:
```bash
npm run db:info      # xem migration nào đã chạy / chưa chạy
npm run db:validate  # kiểm tra checksum các file migration có bị sửa sau khi đã chạy không
```

**Lưu ý quan trọng:** không sửa nội dung 1 file migration đã chạy (Flyway lưu checksum, sửa lại sẽ làm `db:validate` báo lỗi). Muốn sửa thì tạo file `Vn__...` mới để chỉnh tiếp.

## 3. Cấu trúc thư mục liên quan

```
back-end/
  scripts/flyway.js       # wrapper tự viết: tự tải Flyway CLI + chạy migrate/info/validate/baseline
  .flyway-cli/             # Flyway CLI được tải về (KHÔNG commit — đã có trong .gitignore)
  migrations/
    V1__init_schema.sql   # bản sao database/full_schema_dongdoi.sql (schema gốc của đồng đội)
  src/
    config/env.js         # đọc PORT / DATABASE_URL / JWT_SECRET từ .env
    modules/               # các module API (auth, vessels, seafood, ai, chat, ...)
```
