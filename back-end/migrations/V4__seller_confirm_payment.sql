-- ============================================================
-- V4: Người bán xác nhận đã nhận tiền (kể cả đơn đã trả qua VNPay)
-- Chạy bằng: npm run db:migrate
-- ============================================================

-- Thời điểm người bán bấm "Đã nhận tiền" cho khoản PAID. NULL = người bán chưa xác nhận.
-- Trả trực tiếp (BANK_TRANSFER/CASH): đặt luôn khi người bán ghi nhận khoản thanh toán.
-- VNPay: người bán xác nhận sau khi hệ thống đã ghi PAID.
ALTER TABLE payments
    ADD COLUMN IF NOT EXISTS seller_confirmed_at TIMESTAMPTZ;

-- Các khoản trả trực tiếp đã ghi trước đây đều do chính người bán xác nhận.
UPDATE payments SET seller_confirmed_at = paid_at
    WHERE status = 'PAID' AND payment_method IN ('BANK_TRANSFER', 'CASH') AND seller_confirmed_at IS NULL;
