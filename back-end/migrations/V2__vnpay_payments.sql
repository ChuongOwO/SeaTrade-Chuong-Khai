-- ============================================================
-- V2: Thanh toán VNPay
-- Chạy bằng: npm run db:migrate (Flyway) trong thư mục back-end/
-- ============================================================

-- Thêm phương thức VNPAY. (Postgres >= 12 cho phép ADD VALUE trong transaction,
-- miễn là giá trị mới chưa được dùng trong CHÍNH migration này.)
ALTER TYPE payment_method ADD VALUE IF NOT EXISTS 'VNPAY';

-- transaction_code (đã có, UNIQUE) được dùng làm vnp_TxnRef gửi sang VNPay.
-- Các cột dưới đây lưu kết quả cổng trả về.
ALTER TABLE payments
    ADD COLUMN IF NOT EXISTS gateway_txn_no   VARCHAR(50),    -- vnp_TransactionNo (mã GD bên VNPay)
    ADD COLUMN IF NOT EXISTS bank_code        VARCHAR(30),    -- vnp_BankCode
    ADD COLUMN IF NOT EXISTS response_code    VARCHAR(10),    -- vnp_ResponseCode
    ADD COLUMN IF NOT EXISTS txn_status       VARCHAR(10),    -- vnp_TransactionStatus
    ADD COLUMN IF NOT EXISTS vnp_create_date VARCHAR(14),     -- vnp_CreateDate đã gửi (yyyyMMddHHmmss, GMT+7)
    ADD COLUMN IF NOT EXISTS expires_at       TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS raw_callback     JSONB,          -- toàn bộ tham số IPN/Return đã xác thực (để đối soát)
    ADD COLUMN IF NOT EXISTS updated_at       TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- Mỗi đơn chỉ được có TỐI ĐA 1 khoản thanh toán đã PAID (chống thu tiền 2 lần).
CREATE UNIQUE INDEX IF NOT EXISTS uq_payments_one_paid_per_order
    ON payments(order_id) WHERE status = 'PAID';
