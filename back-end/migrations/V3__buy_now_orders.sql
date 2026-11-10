-- ============================================================
-- V3: Mua ngay (mua cả mẻ theo giá niêm yết) + giữ hàng có thời hạn
-- Chạy bằng: npm run db:migrate
-- ============================================================

-- NEGOTIATED: đơn tạo khi chấp nhận đề xuất giá trong chat
-- BUY_NOW:    đơn tạo khi bấm "Mua ngay" trên chợ
ALTER TABLE orders
    ADD COLUMN IF NOT EXISTS purchase_type VARCHAR(20) NOT NULL DEFAULT 'NEGOTIATED'
        CHECK (purchase_type IN ('NEGOTIATED', 'BUY_NOW')),
    -- Hạn giữ mẻ cá cho đơn Mua ngay chưa thanh toán; NULL = không giữ (đã trả hoặc đơn thương lượng)
    ADD COLUMN IF NOT EXISTS hold_expires_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_orders_hold_expires
    ON orders(hold_expires_at) WHERE hold_expires_at IS NOT NULL;
