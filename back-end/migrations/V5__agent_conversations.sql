-- ============================================================
-- V5: Lưu cuộc trò chuyện của Trợ lý AI (web admin) vào DB
-- Chạy bằng: npm run db:migrate
-- ============================================================

-- Mỗi admin có tối đa 1 cuộc trò chuyện đang mở (UNIQUE admin_id): bắt đầu cuộc
-- mới thì ghi đè cuộc cũ. Nhờ lưu ở DB, tải lại trang hay khởi động lại back-end
-- đều không làm mất cuộc trò chuyện.
CREATE TABLE IF NOT EXISTS agent_conversations (
    id UUID PRIMARY KEY,
    admin_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    -- Lịch sử gửi cho model, đúng định dạng `contents` của Gemini
    contents JSONB NOT NULL DEFAULT '[]',
    -- Thao tác ghi đang chờ admin duyệt: { results, actions }. NULL = không có.
    pending JSONB,
    -- Tin nhắn để web hiển thị lại: [{ role, text, actions? }]
    transcript JSONB NOT NULL DEFAULT '[]',
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
