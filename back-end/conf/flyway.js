// ĐÃ NGƯNG DÙNG — không còn được tham chiếu ở đâu nữa, có thể xóa file này.
//
// File này từng là cấu hình cho gói `node-flywaydb`, nhưng gói đó có 2 lỗi
// không dùng được trên máy Windows + Node bản mới:
//   1) Tải nhầm dạng file Flyway CLI cũ (...-windows-x64.zip) không còn tồn
//      tại cho Flyway bản 11 trở lên (Redgate đổi cách đóng gói) -> lỗi 404.
//   2) Tự spawn file flyway.cmd thiếu { shell: true } -> lỗi "spawn EINVAL"
//      trên Node 18+ ở Windows.
//
// Đã thay bằng wrapper tự viết: back-end/scripts/flyway.js (không phụ thuộc
// gói ngoài nào ngoài `adm-zip` để giải nén, tự xử lý đúng 2 vấn đề trên).
// Chạy vẫn y hệt: `npm run db:migrate`.
