# Thanh toán VNPay cho SeaTrade — hướng triển khai

Mục tiêu: **người mua thanh toán toàn bộ ngay sau khi offer được chấp nhận** (đơn đã ở trạng thái `CONFIRMED`).
Tài liệu này mô tả luồng, thay đổi DB, API, bảo mật và các bước làm cho back-end + mobile.
Tham chiếu chính thức: <https://sandbox.vnpayment.vn/apis/docs/thanh-toan-pay/pay.html>

> Lưu ý: dự án dùng DB theo Flyway `back-end/migrations/V1__init_schema.sql` (khớp với code hiện tại:
> `orders.seller_id`, `seafood_listings`, enum `payment_method`/`payment_status`).
> File `database/schema.sql` là bản thiết kế khác, **không phải** DB đang chạy.

---

## 1. Luồng thanh toán

```
Người mua (app)         Back-end                         VNPay
   |  Offer ACCEPTED -> order = CONFIRMED                  |
   |-- POST /api/payments/vnpay/create {order_id} -------->|
   |                    kiểm tra: đúng người mua, đơn CONFIRMED,
   |                    chưa PAID; số tiền LẤY TỪ DB
   |                    tạo payments(PENDING, transaction_code = vnp_TxnRef)
   |                    ký HMAC-SHA512 -> payment_url
   |<-- payment_url ---|                                    |
   |-- mở WebView(payment_url) ---------------------------->| người dùng nhập thẻ/OTP
   |                    |<---- IPN (GET, server-to-server) --|
   |                    | verify chữ ký -> tìm payment ->    |
   |                    | đối chiếu số tiền -> chưa xử lý?   |
   |                    | -> PAID / FAILED, tạo thông báo    |
   |                    |---- {"RspCode":"00",...} --------->|
   |<-- redirect Return URL (WebView tự đóng) --------------|
   |-- GET /api/payments/:id (hỏi trạng thái thật) -------->|
```

Nguyên tắc:

1. **IPN là nguồn xác nhận chính.** Return URL chỉ để đưa người dùng về app.
2. **Số tiền luôn lấy từ DB**, không nhận từ app. `vnp_Amount` = số tiền VND × 100, không có phần thập phân.
3. **Idempotent:** mỗi lần thanh toán có `vnp_TxnRef` riêng (lưu ở `payments.transaction_code`, UNIQUE).
   IPN có thể đến nhiều lần → chỉ ghi nhận một lần (khoá dòng bằng `SELECT ... FOR UPDATE`).
4. Chỉ coi là **thành công khi cả** `vnp_ResponseCode = '00'` **và** `vnp_TransactionStatus = '00'`.
5. Thất bại / huỷ / hết hạn → payment `FAILED`, đơn vẫn `CONFIRMED`, người mua có thể thanh toán lại (TxnRef mới).
6. `vnp_HashSecret` chỉ nằm trong `.env` của back-end — không đưa vào app mobile, không commit.

## 1b. Hai cách mua (đã chốt)

| | **Mua ngay** | **Thương lượng** |
|---|---|---|
| Bắt đầu | Nút "Mua ngay" trên Chợ (chỉ hiện khi mẻ cá có giá niêm yết) | Nút "Thương lượng" → chat → đề xuất giá → người bán chấp nhận |
| Mua bao nhiêu | **Cả mẻ**, theo giá niêm yết | Theo thoả thuận trong chat |
| Giữ hàng | Mẻ cá chuyển `RESERVED`, giữ `ORDER_HOLD_MINUTES` phút (mặc định 15) | Mẻ cá `SOLD` ngay khi chốt đơn |
| Thanh toán | VNPay (hạn link không vượt hạn giữ hàng) | VNPay **hoặc** trả trực tiếp (QR/tiền mặt) rồi **người bán bấm "Đã nhận tiền"** |
| Bằng chứng | Tin `BUY_NOW_ORDER`, `PAYMENT_SUCCESS` trong chat | Tin `PAYMENT_RECEIVED` (người bán gửi) hoặc `PAYMENT_SUCCESS` trong chat |

- Hết hạn giữ hàng mà chưa trả: job chạy mỗi phút huỷ đơn, trả mẻ cá về chợ, báo người mua.
  Nếu còn link VNPay đang hiệu lực thì chờ thêm 5 phút sau khi link hết hạn (để IPN đến muộn kịp ghi nhận).
- IPN báo thành công nhưng đơn đã bị huỷ: không ghi `PAID`, lưu `refund_required: true` trong `raw_callback`
  và ghi log — cần hoàn tiền thủ công.
- Đơn đã có khoản `PAID` (VNPay hoặc người bán xác nhận) thì không tạo link VNPay / xác nhận lần 2 được nữa.
- Migration: `back-end/migrations/V3__buy_now_orders.sql` (`orders.purchase_type`, `orders.hold_expires_at`).

## 2. Tham số tạo URL thanh toán (VNPay PAY 2.1.0)

| Tham số | Giá trị |
|---|---|
| `vnp_Version` | `2.1.0` |
| `vnp_Command` | `pay` |
| `vnp_TmnCode` | mã website do VNPay cấp |
| `vnp_Amount` | VND × 100 |
| `vnp_CreateDate` / `vnp_ExpireDate` | `yyyyMMddHHmmss`, **giờ GMT+7** (hạn nên ~15 phút) |
| `vnp_CurrCode` | `VND` |
| `vnp_IpAddr` | IP người dùng |
| `vnp_Locale` | `vn` hoặc `en` |
| `vnp_OrderInfo` | tiếng Việt **không dấu**, không ký tự đặc biệt |
| `vnp_OrderType` | mã loại hàng (vd `other`) |
| `vnp_ReturnUrl` | URL quay về |
| `vnp_TxnRef` | mã giao dịch duy nhất (không trùng trong ngày) |
| `vnp_SecureHash` | chữ ký, **gắn cuối cùng** |

Cách ký: lấy các tham số `vnp_*` (trừ `vnp_SecureHash`), **sắp xếp theo tên tăng dần**, nối `key=value` bằng `&`
(URL-encode, khoảng trắng → `+`), rồi **HMAC-SHA512** với `vnp_HashSecret`, xuất hex.
URL sandbox: `https://sandbox.vnpayment.vn/paymentv2/vpcpay.html`.

> Các ví dụ của VNPay không thống nhất về việc có URL-encode hay không (Node không, PHP/Java có).
> Hãy thử 1 giao dịch sandbox thật; nếu báo sai chữ ký, kiểm tra lại chỗ này đầu tiên.

## 3. IPN và Return URL

**IPN** (VNPay gọi server của bạn, method `GET`, URL phải là HTTPS công khai, khai báo trong cổng sandbox/merchant):
verify chữ ký → tìm payment theo `vnp_TxnRef` → đối chiếu `vnp_Amount` → kiểm tra còn `PENDING` → cập nhật. Trả JSON:

| RspCode | Ý nghĩa | VNPay làm gì |
|---|---|---|
| `00` | Ghi nhận thành công | dừng |
| `02` | Đơn đã được xác nhận trước đó | dừng |
| `01` | Không tìm thấy đơn | gọi lại |
| `04` | Sai số tiền | gọi lại |
| `97` | Sai chữ ký | gọi lại |
| `99` | Lỗi khác | gọi lại |

Khi nhận mã gọi lại, VNPay thử lại tối đa 10 lần, cách nhau 5 phút.

**Return URL**: người dùng được chuyển về đây sau khi thanh toán. Chỉ hiển thị kết quả và để WebView nhận biết để tự đóng.
Sau đó app gọi `GET /api/payments/:id` để biết trạng thái thật.

Khi dev chưa có IPN công khai, có thể bật `VNPAY_CONFIRM_ON_RETURN=true` cho Return URL (đã xác thực chữ ký) cũng ghi nhận
thanh toán — vẫn dùng chung logic idempotent. Khi đã có IPN thì nên tắt.

## 4. Thay đổi DB (migration `V2__vnpay_payments.sql`)

- Thêm `VNPAY` vào enum `payment_method`.
- Bảng `payments`: thêm `gateway_txn_no`, `bank_code`, `response_code`, `txn_status`, `vnp_create_date`,
  `expires_at`, `raw_callback JSONB`, `updated_at`.
- Index duy nhất: mỗi đơn chỉ có tối đa 1 khoản `PAID` (chống thu tiền hai lần).
- Trạng thái đơn **không** thêm giá trị `PAID`: "đã thanh toán" = có payment `PAID`. Đơn vẫn đi tiếp `CONFIRMED → IN_TRANSIT → DELIVERED`.

## 5. API back-end

| Method | Đường dẫn | Quyền | Ghi chú |
|---|---|---|---|
| POST | `/api/payments/vnpay/create` | JWT, người mua | body `{ order_id }` → `payment_url`, `payment_id`, `expires_at` |
| GET | `/api/payments/vnpay/ipn` | công khai (ký HMAC) | VNPay gọi |
| GET | `/api/payments/vnpay/return` | công khai (ký HMAC) | trả trang HTML kết quả |
| GET | `/api/payments/:id` | JWT, người mua/bán/admin | trạng thái 1 khoản thanh toán |
| GET | `/api/payments/order/:orderId` | JWT, người mua/bán/admin | `{ paid, payments[] }` |

## 6. Cấu hình `.env` (back-end)

```
VNPAY_TMN_CODE=
VNPAY_HASH_SECRET=
VNPAY_URL=https://sandbox.vnpayment.vn/paymentv2/vpcpay.html
VNPAY_RETURN_URL=http://<IP-LAN-may-tinh>:5000/api/payments/vnpay/return
VNPAY_EXPIRE_MINUTES=15
VNPAY_CONFIRM_ON_RETURN=true   # chỉ khi dev chưa có IPN công khai
```

Đăng ký tài khoản test: <http://sandbox.vnpayment.vn/devreg/> (VNPay gửi email chứa TmnCode, HashSecret và thông tin thẻ test).

## 7. Việc làm phía mobile (Expo / React Native)

1. Trên thẻ tin nhắn `OFFER_ACCEPTED` trong `ChatThread.js`: thêm nút **"Thanh toán"** (chỉ hiện cho người mua).
2. Nút gọi `POST /api/payments/vnpay/create` với `order_id` (đã có trong tin nhắn `OFFER_ACCEPTED`).
3. Mở `payment_url` trong **WebView** (kiểm tra `react-native-webview` đã cài chưa; nếu chưa: `npx expo install react-native-webview`).
4. Trong `onNavigationStateChange`: nếu URL chứa `/api/payments/vnpay/return` → đóng WebView.
5. Gọi `GET /api/payments/:id` (poll vài lần, cách ~2 giây) cho tới khi `status` khác `PENDING`; hiển thị "Thành công / Thất bại".
6. Hiển thị nhãn "Đã thanh toán" bằng `GET /api/payments/order/:orderId` (`paid: true`).

## 8. Bảo mật — checklist

- [ ] `VNPAY_HASH_SECRET` chỉ có trong `.env`, `.env` nằm trong `.gitignore`.
- [ ] Số tiền không lấy từ app; kiểm tra người gọi đúng là `buyer_id` của đơn.
- [ ] IPN luôn verify chữ ký + đối chiếu số tiền + kiểm tra trạng thái trước khi ghi.
- [ ] Không ghi log chứa HashSecret.
- [ ] Production: dùng HTTPS cho Return/IPN; tắt `VNPAY_CONFIRM_ON_RETURN` khi đã có IPN.

## 9. Giới hạn đã biết

- **Chưa có đối soát tự động.** Nếu IPN bị mất và người dùng không về Return URL, khoản thanh toán nằm `PENDING`.
  API truy vấn giao dịch `querydr` của VNPay chưa được cài (chưa đọc được tài liệu chính thức nên không viết theo trí nhớ).
- **Hoàn tiền** chưa có: đơn bị huỷ sau khi đã thu tiền → xử lý tay trên cổng VNPay / ghi `REFUNDED` thủ công.
- VNPay chuyển tiền về tài khoản merchant của nền tảng, **không tự chia cho người bán**; khâu trả tiền cho chủ tàu
  (sau khi giao nhận xong) là việc của nền tảng — đồ án có thể mô phỏng bằng thao tác "đã chi trả" của admin.
  Thu hộ tiền cho bên thứ ba ngoài đời thực có thể cần giấy phép; hãy hỏi lại giảng viên/đơn vị pháp lý.

## 10. Code đã cài đặt

**Back-end**
- `back-end/migrations/V2__vnpay_payments.sql` — enum `VNPAY`, cột kết quả cổng, index 1 khoản `PAID`/đơn.
- `back-end/src/modules/payments/` — `vnpay.util.js` (ký/xác thực), `payment.service.js`, `payment.controller.js`, `payment.routes.js`.
  - Thiếu `VNPAY_*` trong `.env` → `create` trả `503` kèm thông báo rõ ràng.
  - `vnp_IpAddr` lấy từ `X-Forwarded-For` (chạy sau ngrok/proxy vẫn đúng IP).
  - Khi đơn vừa chuyển `PAID` (IPN hoặc Return), back-end gửi tin `PAYMENT_SUCCESS` vào hội thoại gốc của đơn
    và phát Socket.io `new_message_<conversationId>`, `payment_updated_<orderId>`.
  - `GET /api/payments/order/:orderId` trả thêm `order_status`, `is_buyer`, `can_pay`.
- `GET /api/orders` trả thêm `is_paid` cho mỗi đơn.

**Mobile**
- `mobile/src/api/paymentsApi.js` — gọi `create`, `GET /:id`, `GET /order/:orderId`.
- `mobile/src/components/VnpayCheckoutModal.js` — tạo link → WebView → bắt Return URL → poll trạng thái
  (2 giây × 8 lần) → hiện Thành công / Thất bại (thanh toán lại) / Đang chờ (kiểm tra lại).
  Trên Expo web thì mở VNPay ở tab mới và có nút "Tôi đã thanh toán xong".
- `mobile/src/components/OrderPaymentPanel.js` — gắn dưới thẻ "Đã chốt đơn" trong `ChatThread.js`:
  người mua thấy nút **Thanh toán VNPay**, người bán thấy "Chờ người mua thanh toán", đã trả thì hiện "Đã thanh toán".
- `HistoryScreen.js` (tab Giao dịch) — nhãn đã/chưa thanh toán và nút thanh toán cho người mua.

**Web admin**
- `web/src/components/OrderManagement.jsx` — nhãn "Đã thanh toán / Chưa thanh toán" ở bảng và chi tiết đơn.

## 11. Cách thử trên sandbox

1. Điền `.env`, chạy `npm run db:migrate`, khởi động lại back-end.
2. Tạo đơn `CONFIRMED` (chấp nhận 1 offer trong chat).
3. Gọi `POST /api/payments/vnpay/create` bằng token của người mua → mở `payment_url` trên trình duyệt.
4. Thanh toán bằng thẻ test do VNPay cung cấp → kiểm tra `payments.status = 'PAID'` và thông báo cho cả hai bên.
5. Thử các trường hợp: huỷ giữa chừng, để hết hạn, mở lại link khi đã trả, gọi IPN hai lần.
