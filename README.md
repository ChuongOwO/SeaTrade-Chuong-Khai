<div align="center">

<img src="mobile/assets/logo.png" alt="SeaTrade AI" width="120" />

# SeaTrade AI

**Nền tảng kết nối giao thương hải sản ven biển, nhận diện hải sản bằng AI xử lý ảnh**

[![CI](https://github.com/ChuongOwO/SeaTrade-Chuong-Khai/actions/workflows/ci.yml/badge.svg)](https://github.com/ChuongOwO/SeaTrade-Chuong-Khai/actions/workflows/ci.yml)
![Node.js](https://img.shields.io/badge/Node.js-22-339933?logo=node.js&logoColor=white)
![Python](https://img.shields.io/badge/Python-3.11-3776AB?logo=python&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-PostGIS-4169E1?logo=postgresql&logoColor=white)
![Expo](https://img.shields.io/badge/Expo-58-000020?logo=expo&logoColor=white)

*Đồ án tốt nghiệp ngành Công nghệ Thông tin, 2026*

</div>

---

## Mục lục

- [Giới thiệu](#giới-thiệu)
- [Tính năng chính](#tính-năng-chính)
- [Kiến trúc hệ thống](#kiến-trúc-hệ-thống)
- [Công nghệ sử dụng](#công-nghệ-sử-dụng)
- [Cấu trúc thư mục](#cấu-trúc-thư-mục)
- [Cài đặt và chạy dự án](#cài-đặt-và-chạy-dự-án)
- [Biến môi trường](#biến-môi-trường)
- [Tài liệu API](#tài-liệu-api)
- [CI/CD](#cicd)
- [Tài liệu liên quan](#tài-liệu-liên-quan)

---

## Giới thiệu

Ở mô hình buôn bán hải sản ven biển truyền thống, ngư dân đánh bắt xong phải chạy tàu nhiều giờ về cảng để bán cho thương lái. Cách làm này tốn nhiên liệu, hải sản mất độ tươi trên đường về nên dễ bị ép giá, và ngư dân thiếu thông tin giá thị trường minh bạch.

**SeaTrade AI** đưa việc mua bán ra ngay ngoài khơi:

1. **Thuyền trưởng** chụp ảnh mẻ hải sản. Mô hình YOLOv8 nhận diện loài và gợi ý giá, sau đó thuyền trưởng đăng bán lên chợ.
2. **Tàu thu gom / thương lái** thấy các mẻ hàng và vị trí tàu trên bản đồ, trả giá hoặc mua ngay, thanh toán qua VNPay.
3. Hai tàu nhắn tin trực tiếp với nhau và được chỉ đường để gặp nhau giao hàng trên biển.
4. **Ban quản trị** theo dõi đơn hàng, đội tàu, người dùng và thống kê trên Web Admin, có Trợ lý AI hỗ trợ thao tác.

## Tính năng chính

### 📱 Ứng dụng di động (thuyền trưởng và thương lái)

| Tính năng | Mô tả |
|---|---|
| Tài khoản | Đăng ký, đăng nhập, quên mật khẩu bằng OTP |
| Quét AI | Chụp hoặc chọn ảnh, gửi lên AI Service để nhận diện loài, biến thể và giá gợi ý |
| Đăng bán mẻ hàng | Tạo mẻ hải sản kèm ảnh, sản lượng, giá và vị trí tàu |
| Bản đồ | Vị trí các tàu và mẻ hàng xung quanh, chỉ đường cho hai tàu gặp nhau |
| Thị trường | Danh sách mẻ hàng đang bán, trả giá (thương lượng) hoặc **Mua ngay** |
| Thanh toán | VNPay (sandbox). Mẻ hàng được giữ chỗ trong thời gian chờ thanh toán, người bán xác nhận đã nhận tiền |
| Chat thời gian thực | Nhắn tin giữa người mua và người bán qua Socket.IO, kèm thanh thương lượng giá |
| Lịch sử | Đơn hàng, giao dịch và thông báo |
| Quản lý tàu | Đăng ký tàu của mình (tên, tải trọng...) |

### 💻 Web Admin (ban quản lý)

| Mục | Mô tả |
|---|---|
| Tổng quan | Thẻ KPI (sản lượng, giá trị đang rao, tàu hoạt động), giá thị trường từ các đơn đã chốt, danh sách mẻ hàng đang bán kèm ảnh, xuất báo cáo CSV |
| Đơn hàng | Theo dõi đơn hàng và trạng thái thanh toán |
| Đội tàu | Quản lý danh sách tàu đánh bắt và tàu thu gom |
| Người dùng | Quản lý tài khoản và vai trò |
| Thống kê | Sản lượng theo loài, giá trị giao dịch 6 tháng gần nhất, cơ cấu người dùng và tàu |
| Bản đồ hải trình | Bản đồ Leaflet hiển thị vị trí các tàu |
| Trợ lý AI | Chatbot dùng Gemini, đọc dữ liệu thật trong DB, có phiếu chờ admin duyệt trước khi thực hiện thao tác thay đổi dữ liệu. Lịch sử hội thoại được lưu lại |

### 🤖 AI Service (nhận diện hải sản)

- **Bước 1:** mô hình phát hiện YOLOv8 (`ml-models/seafood_model.pt`) xác định nhóm loài: cá ngừ, cá thu, tôm hùm, tôm, mực, cua, cá bạc má, cá chim đen.
- **Bước 2 (tuỳ chọn):** mô hình phân loại `variant_classifier.pt` xác định biến thể, ví dụ tôm hùm bông / tôm hùm xanh, cá thu phấn / cá thu Nhật. Thiếu file này thì service vẫn chạy và chỉ trả về nhóm loài.
- Kết quả có độ tin cậy kèm cờ `is_uncertain` cho các kết quả cần người kiểm tra lại, cùng giá nền gợi ý theo bảng `species_catalog.py`.

### Vai trò người dùng

| Vai trò | Ý nghĩa |
|---|---|
| `FISHERMAN` | Thuyền trưởng tàu đánh bắt, là bên bán |
| `TRADER` / `COLLECTOR` | Tàu thu gom / thương lái, là bên mua |
| `ADMIN` | Quản trị viên, dùng Web Admin |

## Kiến trúc hệ thống

```mermaid
flowchart TB
    subgraph Client["Giao diện người dùng"]
        M["📱 Mobile App<br/>React Native · Expo"]
        W["💻 Web Admin<br/>React · Vite · Tailwind"]
    end

    subgraph Server["Máy chủ"]
        B["⚙️ Back-end API<br/>Node.js · Express 5 · Socket.IO<br/>:5000"]
        A["🤖 AI Service<br/>FastAPI · YOLOv8<br/>:8000"]
    end

    DB[("🗄️ PostgreSQL + PostGIS<br/>Flyway migrations")]
    VNP["💳 VNPay sandbox"]
    GEM["✨ Google Gemini"]

    M -- REST + WebSocket --> B
    W -- REST + WebSocket --> B
    M -- "Ảnh cần nhận diện" --> A
    B --> DB
    B -- "Tạo link / IPN" --> VNP
    B -- "Trợ lý AI" --> GEM
```

## Công nghệ sử dụng

| Thành phần | Công nghệ |
|---|---|
| **Mobile** | React Native 0.88, Expo 58, React Navigation, react-native-maps, expo-camera, expo-location, Socket.IO client |
| **Web Admin** | React 18, Vite 5, Tailwind CSS 4, React Leaflet, lucide-react, Socket.IO client |
| **Back-end** | Node.js 22, Express 5, `pg` (SQL thuần, không ORM), JWT, Joi, Multer, Socket.IO, Swagger, `@google/genai` |
| **AI Service** | Python 3.11, FastAPI, Uvicorn, Ultralytics YOLOv8, Pillow |
| **Cơ sở dữ liệu** | PostgreSQL 16 + PostGIS, quản lý schema bằng Flyway |
| **Thanh toán** | VNPay (sandbox) |
| **CI** | GitHub Actions |

## Cấu trúc thư mục

```
SeaTrade-Chuong-Khai/
├── ai-service/            # FastAPI + YOLOv8
│   ├── app/               #   api/ · core/ · services/ (inference, species_catalog)
│   ├── ml-models/         #   seafood_model.pt (model phát hiện)
│   ├── training/          #   script chuẩn bị dữ liệu, train và đánh giá model
│   └── main.py
├── back-end/              # Node.js + Express
│   ├── migrations/        #   Flyway V1..V5 (schema chính thức)
│   ├── src/
│   │   ├── modules/       #   auth, vessels, seafood, ai, chat, offers,
│   │   │                  #   orders, payments, notifications, admin (agent)
│   │   ├── middleware/    #   xác thực, phân quyền, upload, xử lý lỗi
│   │   └── server.js
│   └── docs/              #   VNPAY_THANH_TOAN.md
├── web/                   # Web Admin (React + Vite)
├── mobile/                # App di động (Expo)
├── database/              # Tài liệu và sơ đồ kiến trúc database
└── .github/workflows/     # CI
```

## Cài đặt và chạy dự án

### Yêu cầu

| Công cụ | Phiên bản |
|---|---|
| Node.js | ≥ 22.13 |
| pnpm | 10 (`npm install -g pnpm`) |
| Python | 3.10+ (CI dùng 3.11) |
| PostgreSQL | 14+ kèm extension **PostGIS** |
| Expo Go | Cài trên điện thoại (App Store / CH Play) |

> Dự án dùng **pnpm** cho cả ba phần JavaScript. Đừng commit `package-lock.json` hay `yarn.lock`.
> Máy tính chạy server và điện thoại chạy thử app phải **cùng một mạng Wi-Fi**.

Hệ thống gồm 4 phần chạy song song, mỗi phần một cửa sổ terminal. Chạy theo thứ tự: **Database → Back-end → AI Service → Web / Mobile**.

### 1. Database

1. Mở pgAdmin, tạo database rỗng tên **`seafood_trading`**.
2. Kiểm tra PostGIS bằng Query Tool:
   ```sql
   CREATE EXTENSION IF NOT EXISTS "postgis";
   ```
   Nếu báo không tìm thấy extension: mở **Stack Builder** → chọn đúng phiên bản Postgres → *Spatial Extensions* → cài **PostGIS**.

Các bảng được tạo ở bước migration của Back-end. Bạn không cần chạy file SQL nào bằng tay.

### 2. Back-end API (cổng 5000)

```bash
cd back-end
cp .env.example .env      # sửa DATABASE_URL cho đúng mật khẩu Postgres của bạn
pnpm install
pnpm run db:migrate       # Flyway tạo toàn bộ bảng; lần đầu tự tải Flyway CLI (1-2 phút)
pnpm run dev
```

Kiểm tra tại http://localhost:5000/api-docs.

### 3. AI Service (cổng 8000)

```bash
cd ai-service
python -m pip install -r requirements.txt
python -m uvicorn main:app --host 0.0.0.0 --port 8000
```

Kiểm tra tại http://localhost:8000/docs.

> **Windows:** để điện thoại gọi được cổng 8000 qua Wi-Fi, mở PowerShell với quyền Administrator rồi chạy một lần:
> ```powershell
> New-NetFirewallRule -DisplayName "AI Service Uvicorn 8000" -Direction Inbound -Protocol TCP -LocalPort 8000 -Action Allow
> ```

### 4. Web Admin (cổng 3000)

```bash
cd web
pnpm install
pnpm run dev
```

Trình duyệt tự mở http://localhost:3000. Đăng nhập bằng tài khoản có vai trò `ADMIN`.

### 5. Mobile App

```bash
cd mobile
pnpm install
pnpm run start
```

Quét mã QR bằng **Expo Go**. App tự dò IP LAN của máy đang chạy Expo nên thường không cần cấu hình thêm. Nếu app báo không kết nối được máy chủ, kiểm tra lại điện thoại có cùng Wi-Fi không và tường lửa đã mở cổng chưa.

## Biến môi trường

File mẫu đầy đủ có chú thích nằm ở [`back-end/.env.example`](back-end/.env.example) và [`mobile/.env.example`](mobile/.env.example).

| Biến | Bắt buộc | Mô tả |
|---|:---:|---|
| `DATABASE_URL` | ✅ | `postgres://user:password@localhost:5432/seafood_trading` |
| `JWT_SECRET` | ✅ | Khoá ký JWT |
| `PORT` | | Cổng back-end, mặc định `5000` |
| `GEMINI_API_KEY` | | Khoá Gemini cho Trợ lý AI. Bỏ trống thì riêng Trợ lý AI không dùng được |
| `AI_AGENT_MOCK` | | `true` = Trợ lý AI chạy giả lập, không gọi Gemini |
| `ORDER_HOLD_MINUTES` | | Số phút giữ mẻ hàng khi bấm *Mua ngay* mà chưa thanh toán |
| `VNPAY_TMN_CODE`, `VNPAY_HASH_SECRET` | | Thông tin sandbox VNPay, chi tiết ở [`back-end/docs/VNPAY_THANH_TOAN.md`](back-end/docs/VNPAY_THANH_TOAN.md) |
| `EXPO_PUBLIC_API_URL` *(mobile)* | | Địa chỉ back-end khi deploy. Bỏ trống khi dev |

> ⚠️ Không commit file `.env` thật. Không đặt secret vào biến `EXPO_PUBLIC_*` vì các biến này được đóng gói vào app và ai cũng đọc được.

## Tài liệu API

| Service | Swagger UI | Các nhóm endpoint |
|---|---|---|
| Back-end | http://localhost:5000/api-docs | `/api/auth`, `/api/vessels`, `/api/seafood/*`, `/api/ai/detections`, `/api/chat`, `/api/offers`, `/api/orders`, `/api/payments`, `/api/notifications`, `/api/admin` |
| AI Service | http://localhost:8000/docs | `POST /api/v1/classify` |

## CI/CD

Workflow [`.github/workflows/ci.yml`](.github/workflows/ci.yml) tự chạy khi push lên `main`, `duy-khai`, `chuong` và khi mở Pull Request vào `main`:

| Job | Kiểm tra |
|---|---|
| `web` | Cài dependencies và build production bằng Vite |
| `back-end` | Cài dependencies, kiểm tra cú pháp toàn bộ file `.js` |
| `migrations` | Chạy Flyway V1..V5 trên PostgreSQL + PostGIS tạm |
| `ai-service` | Cài thư viện (PyTorch bản CPU), biên dịch code, import FastAPI app, kiểm tra file model |
| `mobile` | Đóng gói bundle Android bằng `expo export`. Job này không chặn CI nếu lỗi |

## Tài liệu liên quan

- [`back-end/README.md`](back-end/README.md): cài đặt back-end, quy ước migration, xử lý lỗi thường gặp
- [`back-end/docs/VNPAY_THANH_TOAN.md`](back-end/docs/VNPAY_THANH_TOAN.md): luồng thanh toán VNPay
- [`database/README.md`](database/README.md): schema chính thức và các bản nháp cũ
- [`ai-service/training/README.md`](ai-service/training/README.md): chuẩn bị dữ liệu, train và đánh giá model
