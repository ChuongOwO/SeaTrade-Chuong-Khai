# Câu hỏi dự kiến về Database — SeaTrade AI

Tổng hợp các câu hỏi thầy/cô có thể hỏi khi báo cáo tiến độ, kèm gợi ý trả lời
ngắn gọn. Chia theo nhóm để dễ ôn.

## 1. Tổng quan & kiến trúc

**Vì sao chọn PostgreSQL mà không phải MySQL hay MongoDB?**
PostgreSQL hỗ trợ tốt cả dữ liệu quan hệ chặt (users, orders, payments — cần
ràng buộc khoá ngoại nghiêm ngặt) lẫn dữ liệu địa lý qua extension PostGIS
(tọa độ tàu, điểm giao hàng) và JSON (idempotency_keys.response_body) — phù
hợp hơn NoSQL cho một hệ thống giao dịch cần tính toàn vẹn dữ liệu cao.

**Sơ đồ có bao nhiêu bảng, chia nhóm theo tiêu chí gì?**
20 bảng, chia 5 nhóm theo chức năng nghiệp vụ: Người dùng/Tàu, Danh mục tham
chiếu (loài, hạng, giá), Mẻ đánh bắt & pipeline AI, Giao dịch lõi (tin đăng,
đàm phán, đơn hàng), Giao nhận/liên lạc/hạ tầng (giao hàng, thanh toán, đánh
giá, chat, thông báo).

**Vì sao dùng UUID làm khoá chính thay vì số tự tăng (auto-increment)?**
Hai lý do: (1) mobile app có thể tạo bản ghi lúc offline (ví dụ chụp ảnh mẻ
cá ngoài khơi không có sóng) — UUID sinh được ngay trên máy mà không cần hỏi
server trước, tránh trùng ID khi đồng bộ lại; (2) không lộ thông tin số
lượng bản ghi (ví dụ đối thủ không đoán được có bao nhiêu đơn hàng đã tạo
qua order_code dạng số tăng dần). Ngoại lệ: `vessel_locations` và
`ai_detections` dùng `BIGSERIAL` vì đây là bảng time-series ghi rất nhiều,
tự tăng cho tốc độ insert nhanh hơn và không cần tính offline-first.

**Thiết kế này có đáp ứng "kiến trúc mở" đã nêu trong đề cương không?**
Có, cụ thể: cột trạng thái dùng `VARCHAR + CHECK` thay vì ENUM cứng của
Postgres (thêm trạng thái mới chỉ sửa ràng buộc, không phải đổi kiểu dữ
liệu toàn hệ thống); `species`/`species_grades` tách riêng nên thêm loài
hải sản mới không đụng vào bảng giao dịch; `ai_detections.raw_label` tách
khỏi `species_id` đã map — cho phép mở rộng model AI nhận diện thêm loài
mới mà không phải sửa schema.

## 2. Quyết định kỹ thuật cụ thể

**VARCHAR + CHECK và ENUM khác nhau thế nào, vì sao chọn CHECK?**
ENUM là kiểu dữ liệu riêng của Postgres, cố định danh sách giá trị lúc tạo —
muốn thêm giá trị mới phải chạy `ALTER TYPE ... ADD VALUE`, và trong một số
phiên bản Postgres/ORM còn không cho thực hiện trong transaction. `VARCHAR +
CHECK constraint` thì thêm giá trị mới chỉ cần `ALTER TABLE ... DROP
CONSTRAINT` rồi tạo CHECK mới — đơn giản hơn nhiều khi dự án còn đang thay
đổi liên tục như hiện tại. Đánh đổi: tốn thêm vài byte lưu trữ so với ENUM,
không đáng kể ở quy mô dự án này.

**PostGIS GEOGRAPHY là gì, vì sao không lưu lat/lng như 2 cột số bình thường?**
`GEOGRAPHY(Point,4326)` là kiểu dữ liệu không gian của PostGIS, cho phép
Postgres tự tính khoảng cách thực tế giữa 2 điểm trên mặt cầu Trái Đất bằng
hàm `ST_Distance`, hoặc tìm "N tàu gần nhất" bằng `ST_DWithin` + chỉ mục
GiST — nhanh hơn nhiều so với việc tải hết toạ độ về rồi tính Haversine ở
tầng ứng dụng. Nếu chỉ lưu 2 cột `lat`/`lng` số thường, mọi phép tính
khoảng cách phải làm thủ công ở code, không tận dụng được index không gian.

**Nếu server thật của nhóm không cài được extension PostGIS thì sao?**
Đây là câu hỏi mở nhóm chưa chốt (ghi rõ trong README) — phương án dự
phòng là đổi `GEOGRAPHY` thành 2 cột `DOUBLE PRECISION` (lat, lng) và tính
khoảng cách bằng công thức Haversine ở tầng backend, đánh đổi lấy việc
không cần cài extension nhưng mất khả năng query không gian nhanh trong DB.

**Generated column là gì, dùng ở đâu trong schema này?**
Là cột Postgres tự tính từ các cột khác trong CÙNG một dòng, không cần
backend tính rồi ghi lại — dùng cho `listings.total_value` (=
price_per_kg × quantity_available_kg) và `order_items.subtotal` (=
quantity_kg × price_per_kg). Giúp dữ liệu luôn nhất quán, không sợ backend
quên cập nhật.

**Vì sao `orders.total_amount` KHÔNG phải generated column?**
Vì nó là tổng của nhiều dòng trong bảng `order_items` (bảng khác) — trong
khi generated column của Postgres chỉ được phép tính từ các cột trong cùng
một dòng, không được tham chiếu sang bảng khác. Nên cột này phải do backend
(hoặc một trigger `AFTER INSERT/UPDATE/DELETE` trên `order_items`) tự cập
nhật mỗi khi danh sách order_items thay đổi — đây cũng là 1 trong 5 câu hỏi
mở ghi trong README, nhóm cần thống nhất ai chịu trách nhiệm phần này.

**Soft delete (`deleted_at`) là gì, áp dụng ở đâu, vì sao không phải tất cả bảng?**
Thay vì xoá cứng (`DELETE`) một dòng, chỉ đánh dấu `deleted_at = now()` và
lọc ra khi query — giữ được lịch sử để tra cứu/đối chiếu sau này. Áp dụng
cho `users`, `vessels`, `listings` vì đây là những bảng đã có thể phát sinh
giao dịch liên quan (đơn hàng, đánh giá tham chiếu tới) — xoá cứng sẽ làm
gãy các bản ghi lịch sử đó. Các bảng phụ trợ như `notifications`,
`messages` không cần vì xoá cứng không ảnh hưởng gì tới tính toàn vẹn.

**`idempotency_keys` để làm gì, hoạt động ra sao?**
Chống xử lý trùng khi mobile gửi lại cùng một request do mất sóng giữa
biển (ví dụ bấm "Xác nhận đơn hàng" nhưng mất mạng ngay lúc gửi, app tự
retry) — mỗi request quan trọng đi kèm một `idempotency_key` duy nhất do
client sinh ra; server kiểm tra key này đã xử lý chưa trước khi tạo bản ghi
mới, nếu đã xử lý rồi thì trả lại đúng kết quả cũ thay vì tạo đơn hàng trùng
lặp.

## 3. Mô hình hoá nghiệp vụ

**Vì sao tách `catch_batches` (mẻ đánh bắt) ra khỏi `listings` (tin đăng)?**
Một mẻ cá thực tế có thể sinh ra nhiều tin đăng khác nhau (ví dụ 50kg tôm
chia thành 2 tin: 30kg giá A, 20kg giá thường), hoặc một tin đăng có thể
gộp từ nhiều mẻ nhỏ. Nếu gộp chung một bảng thì không biểu diễn được các
trường hợp này, và dữ liệu AI detect (gắn với ảnh chụp mẻ cá) sẽ bị lẫn với
dữ liệu bán hàng (giá, trạng thái đăng bán).

**`listing_offers.parent_offer_id` dùng để làm gì?**
Hỗ trợ đàm phán giá qua lại nhiều vòng: buyer trả giá A (offer 1, parent
NULL) → seller trả giá B (offer 2, parent = offer 1) → buyer chấp nhận
hoặc trả tiếp giá C (offer 3, parent = offer 2)... Truy vấn theo chuỗi
`parent_offer_id` sẽ dựng lại được toàn bộ lịch sử đàm phán của một tin
đăng.

**Vì sao một đơn hàng (`orders`) có thể chứa nhiều `order_items`?**
Thực tế một thương lái có thể mua cùng lúc nhiều loại hải sản (hoặc từ
nhiều tin đăng khác nhau của cùng một tàu) trong một lần giao dịch — gộp
vào một đơn để thanh toán/giao nhận một lần, thay vì phải tạo nhiều đơn
riêng lẻ.

**Vì sao `reviews` tách riêng khỏi `orders` thay vì để cột `rating` ngay
trên bảng orders?**
Vì đánh giá là 2 chiều — cả buyer đánh giá seller VÀ seller đánh giá buyer
đều cần được lưu cho cùng một đơn hàng. Nếu để `rating` là 1 cột trên
`orders` thì chỉ lưu được 1 chiều đánh giá. Bảng `reviews` riêng với
`reviewer_id`/`reviewed_user_id` cho phép cả 2 phía đều đánh giá nhau, ràng
buộc `UNIQUE(order_id, reviewer_id)` đảm bảo mỗi người chỉ đánh giá 1 lần
cho mỗi đơn.

**`ai_detections` lưu toạ độ bounding box để làm gì?**
Vì model AI khi phân tích một ảnh có thể phát hiện nhiều đối tượng trong
cùng một ảnh (ví dụ nhiều con tôm trong 1 khay), mỗi đối tượng có vùng toạ
độ (bbox_x/y/width/height) và độ tin cậy riêng — lưu chi tiết này cho phép
sau này hiển thị lại khung nhận diện trên ảnh (giống demo trong
AIVisionPlayground), và cho phép đối chiếu/kiểm tra lại khi model dự đoán
sai.

**`species.ai_label` dùng để làm gì?**
Là cầu nối giữa nhãn thô model AI trả về (chuỗi text, ví dụ `"Shrimp"`) và
bản ghi loài trong danh mục `species` của hệ thống. Hiện tại model AI
(`shrimp_model.pt`) chỉ nhận diện được đúng 1 loại là tôm, nên chỉ có bản
ghi tôm hùm có `ai_label = 'Shrimp'`, các loài khác `ai_label = NULL` —
nghĩa là chưa nhận diện tự động được, phải nhập tay. Khi có thêm model
nhận diện loài mới, chỉ cần cập nhật cột này, không cần sửa cấu trúc bảng.

## 4. Toàn vẹn dữ liệu

**Điều gì đảm bảo `orders.total_amount` luôn khớp với tổng `order_items`?**
Hiện schema chưa có ràng buộc DB tự động cho việc này (vì lý do kỹ thuật đã
nêu ở trên — generated column không tham chiếu được bảng khác) — đây là
trách nhiệm của tầng backend/trigger, và là một trong các câu hỏi mở nhóm
cần thống nhất trước khi triển khai thật.

**`ON DELETE CASCADE` và `ON DELETE RESTRICT` dùng khác nhau ở đâu, vì sao?**
`RESTRICT` dùng cho các quan hệ mà xoá "cha" sẽ làm mất dữ liệu quan trọng
không thể phục hồi — ví dụ không cho xoá `users` nếu còn `vessels` thuộc sở
hữu (`vessels.owner_id ON DELETE RESTRICT`). `CASCADE` dùng cho dữ liệu
"con" phụ thuộc hoàn toàn vào "cha" và không có ý nghĩa đứng riêng — ví dụ
xoá một `catch_batches` thì các `catch_images` của nó cũng nên xoá theo.

**Rating trong `reviews` giới hạn 1-5 bằng cách nào?**
Ràng buộc `CHECK (rating BETWEEN 1 AND 5)` ngay ở tầng database — đảm bảo
dù backend có bug hay ai đó thao tác trực tiếp trên DB cũng không thể lưu
giá trị ngoài khoảng cho phép.

## 5. Hiệu năng & khả năng mở rộng

**`vessel_locations` và `ai_detections` là bảng time-series, sẽ phình rất
nhanh — có chiến lược gì?**
Hiện đã tách 2 bảng này ra khỏi bảng chính (`vessels`, `catch_images`) để
bảng chính luôn nhỏ/nhanh cho các query thường xuyên (danh sách tàu, bản
đồ). Về lâu dài, khi dữ liệu lớn, có thể cân nhắc partition theo tháng
(Postgres declarative partitioning) hoặc archive dữ liệu cũ sang bảng/kho
lưu trữ riêng — điểm này schema hiện tại chưa triển khai, để dành cho giai
đoạn tối ưu sau khi có dữ liệu thật.

**Đã đánh index ở những đâu, theo nguyên tắc gì?**
Index trên mọi cột khoá ngoại dùng để JOIN thường xuyên (`vessel_id`,
`species_id`, `listing_id`,...), index GiST trên các cột `GEOGRAPHY` để
query không gian nhanh, và index kết hợp trên các cột hay lọc theo trạng
thái hoặc thời gian (`vessel_locations(vessel_id, recorded_at)`).

## 6. Bảo mật

**Mật khẩu người dùng lưu thế nào?**
Cột `password_hash` lưu giá trị đã băm (bcrypt hoặc tương đương), không
bao giờ lưu plaintext — việc chọn thuật toán băm cụ thể thuộc về tầng
backend, chưa chốt trong schema này.

**Phân quyền admin/trader/fisherman kiểm soát ở đâu?**
Hiện tại chỉ ở mức đơn giản: cột `users.role` với CHECK giới hạn 3 giá trị,
kiểm tra quyền do tầng backend xử lý (chưa có bảng permissions chi tiết
riêng) — đây là lựa chọn có chủ đích cho MVP, ghi rõ trong README là điểm
có thể mở rộng sau nếu cần phân quyền chi tiết hơn.

## 7. Quy trình làm việc nhóm

**Vì sao có 2 bản thiết kế khác nhau, quá trình hợp nhất diễn ra thế nào?**
Bản đầu (do em thiết kế) bám sát đúng dữ liệu mock đang chạy trên web hiện
tại — phạm vi hẹp. Bản thứ hai (đồng đội phụ trách AI/backend thiết kế)
bao quát đầy đủ nghiệp vụ hơn vì phản ánh đúng hướng backend thật đang xây
(gọi API thật, có model AI thật). Sau khi so sánh, em giữ lại toàn bộ phần
nghiệp vụ đầy đủ của bản đồng đội làm khung chính, chỉ sửa/bổ sung vài điểm
kỹ thuật (PostGIS, CHECK thay ENUM, hỗ trợ đồng bộ offline cho mobile) rồi
hợp nhất thành 1 bản chính thức duy nhất dùng cho cả nhóm.

**Đã kiểm chứng thiết kế này như thế nào, hay mới chỉ vẽ trên giấy?**
Đã chạy thử thật trên PostgreSQL 16: toàn bộ `schema.sql` chạy không lỗi,
`seed.sql` mô phỏng đủ một luồng giao dịch thật (đăng ký → đánh bắt → AI
nhận diện → đăng tin → đàm phán → tạo đơn → hẹn giao hàng → thanh toán →
đánh giá → nhắn tin) chạy thành công, và đã kiểm tra các cột tính toán tự
động (generated column) cho ra đúng giá trị.

## 8. Câu hỏi "bẫy" cần chuẩn bị tinh thần

**Hai tàu cùng lúc chấp nhận mua chung một tin đăng thì sao (race condition)?**
Schema hiện chưa có cơ chế khoá tường minh cho tình huống này — cần xử lý ở
tầng backend bằng transaction + `SELECT ... FOR UPDATE` khi chuyển trạng
thái `listings.status` từ `OPEN` sang `LOCKED`, để đảm bảo chỉ một giao
dịch thắng. Đây là điểm nên nêu chủ động nếu bị hỏi, thay vì để thầy phát
hiện ra là chưa nghĩ tới.

**Nếu mất kết nối giữa mobile và server ngay giữa lúc đang giao dịch thì dữ
liệu có bị "đứng nửa chừng" không?**
Đây chính là lý do có `idempotency_keys` và `client_id` trên các bảng
mobile có thể tạo dữ liệu offline — nhưng cần nói rõ đây là NỀN TẢNG đã
chuẩn bị sẵn trong schema, còn cơ chế đồng bộ (sync queue, retry logic) đầy
đủ ở tầng mobile app thì chưa triển khai, thuộc phạm vi giai đoạn sau.

**Vì sao không dùng NoSQL (MongoDB) cho phần lưu vị trí GPS tần suất cao?**
Vẫn chọn PostgreSQL vì cần transaction nhất quán xuyên suốt giữa dữ liệu vị
trí và dữ liệu giao dịch (một tàu ở gần vị trí giao hàng có thể ảnh hưởng
trực tiếp tới trạng thái `deliveries`) — tách riêng 2 loại database sẽ
phức tạp hoá việc đồng bộ mà lợi ích chưa rõ ràng ở quy mô dự án hiện tại.
PostGIS đã đủ đáp ứng nhu cầu query không gian mà không cần đổi hệ quản trị.
