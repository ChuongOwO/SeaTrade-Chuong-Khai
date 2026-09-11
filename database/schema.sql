-- ============================================================================
-- SeaTrade AI — Thiết kế Database hợp nhất (bản chính thức, dùng xuyên suốt dự án)
-- PostgreSQL 14+
--
-- Đây là bản gộp giữa:
--   (1) bản nháp ban đầu do Khải thiết kế (bám theo mockData.js của web),
--   (2) bản do đồng đội phụ trách AI/backend thiết kế (đầy đủ nghiệp vụ hơn:
--       AI detection theo bounding box, batch tách khỏi listing, offers đàm
--       phán nhiều vòng, deliveries, payments, reviews, notifications).
-- Quyết định kỹ thuật đã chốt cùng người dùng (04/09/2026):
--   - Phạm vi: đầy đủ toàn bộ nghiệp vụ (không chỉ phần đang có UI).
--   - Tọa độ: PostGIS GEOGRAPHY(Point, 4326) thay vì lat/lng rời rạc.
--   - Cột trạng thái: VARCHAR + CHECK (không dùng Postgres ENUM) để dễ mở
--     rộng giá trị mới về sau mà không cần ALTER TYPE.
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;   -- gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS postgis;    -- kiểu GEOGRAPHY + hàm ST_*

-- Hàm dùng chung cho trigger updated_at
CREATE OR REPLACE FUNCTION set_updated_at() RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- NHÓM 1: NGƯỜI DÙNG / TÀU
-- ============================================================================

CREATE TABLE users (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    full_name       VARCHAR(150) NOT NULL,
    phone           VARCHAR(20) UNIQUE NOT NULL,
    email           VARCHAR(150) UNIQUE,
    password_hash   TEXT NOT NULL,
    role            VARCHAR(20) NOT NULL DEFAULT 'trader'
                        CHECK (role IN ('fisherman', 'trader', 'admin')),
    avatar_url      TEXT,
    is_active       BOOLEAN NOT NULL DEFAULT TRUE,
    client_id       UUID,                       -- id sinh trên mobile lúc offline, để chống trùng khi sync
    deleted_at      TIMESTAMPTZ,                 -- soft delete
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TRIGGER trg_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE vessels (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id                UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    registration_code       VARCHAR(30) UNIQUE NOT NULL,
    name                    VARCHAR(150) NOT NULL,
    vessel_type             VARCHAR(20) NOT NULL DEFAULT 'fishing'
                                CHECK (vessel_type IN ('fishing', 'collector')),
    home_port               VARCHAR(150),
    power_hp                NUMERIC(8,2),
    cold_storage_capacity_kg NUMERIC(10,2),
    current_load_kg         NUMERIC(10,2) DEFAULT 0,
    -- snapshot vị trí/telemetry mới nhất (truy vấn nhanh cho bản đồ, không cần join vessel_locations)
    current_location        GEOGRAPHY(Point, 4326),
    heading_degrees         NUMERIC(5,2),
    speed_knots             NUMERIC(5,2),
    fuel_percent            NUMERIC(5,2),
    battery_percent         NUMERIC(5,2),
    last_position_at        TIMESTAMPTZ,
    status                  VARCHAR(30) NOT NULL DEFAULT 'OFFLINE'
                                CHECK (status IN ('ACTIVE_FISHING', 'ANCHORED_HAULING',
                                                   'PATROLLING_BUYING', 'DOCKED', 'OFFLINE')),
    client_id               UUID,
    deleted_at              TIMESTAMPTZ,
    created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at              TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_vessels_owner ON vessels(owner_id);
CREATE INDEX idx_vessels_location ON vessels USING GIST(current_location);
CREATE TRIGGER trg_vessels_updated_at BEFORE UPDATE ON vessels
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Lịch sử đầy đủ vị trí GPS — tách khỏi vessels để bảng vessels luôn nhỏ/nhanh,
-- trong khi vẫn giữ được toàn bộ hành trình để vẽ lại đường đi trên bản đồ.
CREATE TABLE vessel_locations (
    id              BIGSERIAL PRIMARY KEY,
    vessel_id       UUID NOT NULL REFERENCES vessels(id) ON DELETE CASCADE,
    location        GEOGRAPHY(Point, 4326) NOT NULL,
    heading_degrees NUMERIC(5,2),
    speed_knots     NUMERIC(5,2),
    accuracy_m      NUMERIC(6,2),
    recorded_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_vessel_locations_vessel_time ON vessel_locations(vessel_id, recorded_at DESC);
CREATE INDEX idx_vessel_locations_geo ON vessel_locations USING GIST(location);

-- ============================================================================
-- NHÓM 2: DANH MỤC THAM CHIẾU
-- ============================================================================

CREATE TABLE species (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name              VARCHAR(150) NOT NULL,
    scientific_name   VARCHAR(150),
    category          VARCHAR(30) NOT NULL
                          CHECK (category IN ('Fish', 'Shrimp', 'Squid', 'Crab', 'Other')),
    unit              VARCHAR(10) NOT NULL DEFAULT 'kg',
    base_price_min    NUMERIC(12,2),
    base_price_max    NUMERIC(12,2),
    description       TEXT,
    sample_image_url  TEXT,
    -- Cầu nối tới model AI: nhãn thô model trả về (vd model hiện tại chỉ nhận
    -- diện được 'Shrimp'). NULL nghĩa là loài này AI chưa nhận diện được.
    ai_label          VARCHAR(50),
    is_active         BOOLEAN NOT NULL DEFAULT TRUE,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX uq_species_ai_label ON species(ai_label) WHERE ai_label IS NOT NULL;

CREATE TABLE species_grades (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    species_id       UUID NOT NULL REFERENCES species(id) ON DELETE CASCADE,
    grade_label      VARCHAR(100) NOT NULL,
    price_multiplier NUMERIC(4,2) NOT NULL DEFAULT 1.00,
    criteria         TEXT,
    sort_order       SMALLINT NOT NULL DEFAULT 0
);
CREATE INDEX idx_species_grades_species ON species_grades(species_id);

-- Snapshot giá thị trường theo ngày, dùng cho biểu đồ chỉ số giá trên web.
-- Không lưu % thay đổi trực tiếp vì % chỉ có ý nghĩa khi so 2 mốc thời gian.
CREATE TABLE market_price_snapshots (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    species_id      UUID NOT NULL REFERENCES species(id) ON DELETE CASCADE,
    snapshot_date   DATE NOT NULL,
    avg_price       NUMERIC(12,2) NOT NULL,
    grade_a_price   NUMERIC(12,2),
    grade_b_price   NUMERIC(12,2),
    sample_size     INTEGER NOT NULL DEFAULT 0,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(species_id, snapshot_date)
);

-- ============================================================================
-- NHÓM 3: MẺ ĐÁNH BẮT & PIPELINE AI
-- (tách "mẻ cá vừa đánh bắt" ra khỏi "tin đăng bán" — một mẻ có thể sinh ra
--  một hoặc nhiều tin đăng, hoặc bán một phần / gộp nhiều mẻ vào một tin)
-- ============================================================================

CREATE TABLE catch_batches (
    id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vessel_id             UUID NOT NULL REFERENCES vessels(id) ON DELETE RESTRICT,
    species_id            UUID REFERENCES species(id),          -- có thể NULL nếu AI chưa xác định xong
    quantity_kg           NUMERIC(10,2) NOT NULL,
    quality_level         VARCHAR(10) NOT NULL DEFAULT 'B'
                              CHECK (quality_level IN ('A', 'B', 'C')),
    freshness_score       NUMERIC(5,2),
    size_min_cm           NUMERIC(6,2),
    size_max_cm           NUMERIC(6,2),
    catch_location         GEOGRAPHY(Point, 4326),
    catch_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
    status                VARCHAR(20) NOT NULL DEFAULT 'RECORDED'
                              CHECK (status IN ('RECORDED', 'LISTED', 'SOLD_OUT', 'DISCARDED')),
    client_id             UUID,
    created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_catch_batches_vessel ON catch_batches(vessel_id);
CREATE TRIGGER trg_catch_batches_updated_at BEFORE UPDATE ON catch_batches
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE catch_images (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    batch_id     UUID NOT NULL REFERENCES catch_batches(id) ON DELETE CASCADE,
    image_url    TEXT NOT NULL,
    thumbnail_url TEXT,
    uploaded_by  UUID REFERENCES users(id),
    captured_at  TIMESTAMPTZ,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_catch_images_batch ON catch_images(batch_id);

-- Kết quả AI detect theo từng ảnh — 1 ảnh có thể có nhiều vùng phát hiện
-- (bounding box), khớp với cách model computer vision thật trả kết quả.
CREATE TABLE ai_detections (
    id                 BIGSERIAL PRIMARY KEY,
    image_id           UUID NOT NULL REFERENCES catch_images(id) ON DELETE CASCADE,
    model_version       VARCHAR(50) NOT NULL,
    species_id          UUID REFERENCES species(id),      -- NULL nếu model không map được nhãn
    raw_label           VARCHAR(50),                       -- nhãn thô model trả, trước khi map sang species
    confidence          NUMERIC(5,4),
    bbox_x              NUMERIC(6,2),
    bbox_y              NUMERIC(6,2),
    bbox_width          NUMERIC(6,2),
    bbox_height         NUMERIC(6,2),
    estimated_size_cm   NUMERIC(6,2),
    quality_score       NUMERIC(5,2),
    freshness_score     NUMERIC(5,2),
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_ai_detections_image ON ai_detections(image_id);

-- ============================================================================
-- NHÓM 4: GIAO DỊCH LÕI — TIN ĐĂNG & ĐÀM PHÁN
-- ============================================================================

CREATE TABLE listings (
    id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    batch_id              UUID NOT NULL REFERENCES catch_batches(id) ON DELETE RESTRICT,
    vessel_id             UUID NOT NULL REFERENCES vessels(id) ON DELETE RESTRICT,
    species_id            UUID NOT NULL REFERENCES species(id),
    grade_id              UUID REFERENCES species_grades(id),
    title                 VARCHAR(200),
    description           TEXT,
    price_per_kg          NUMERIC(12,2) NOT NULL,
    quantity_available_kg NUMERIC(10,2) NOT NULL,
    total_value           NUMERIC(14,2) GENERATED ALWAYS AS (price_per_kg * quantity_available_kg) STORED,
    listing_location      GEOGRAPHY(Point, 4326),
    status                VARCHAR(20) NOT NULL DEFAULT 'OPEN'
                              CHECK (status IN ('OPEN', 'IN_NEGOTIATION', 'LOCKED',
                                                 'SOLD', 'EXPIRED', 'CANCELLED')),
    published_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    expires_at            TIMESTAMPTZ,
    client_id             UUID,
    deleted_at            TIMESTAMPTZ,
    created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_listings_vessel ON listings(vessel_id);
CREATE INDEX idx_listings_species ON listings(species_id);
CREATE INDEX idx_listings_status ON listings(status);
CREATE INDEX idx_listings_location ON listings USING GIST(listing_location);
CREATE TRIGGER trg_listings_updated_at BEFORE UPDATE ON listings
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Đàm phán giá — hỗ trợ trả giá qua lại nhiều vòng qua parent_offer_id.
CREATE TABLE listing_offers (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    listing_id      UUID NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
    buyer_id        UUID NOT NULL REFERENCES users(id),
    seller_id       UUID NOT NULL REFERENCES users(id),
    parent_offer_id UUID REFERENCES listing_offers(id),   -- offer trước đó trong cùng chuỗi đàm phán, NULL nếu là offer đầu tiên
    quantity_kg     NUMERIC(10,2) NOT NULL,
    price_per_kg    NUMERIC(12,2) NOT NULL,
    message         TEXT,
    status          VARCHAR(20) NOT NULL DEFAULT 'PENDING'
                        CHECK (status IN ('PENDING', 'ACCEPTED', 'REJECTED', 'WITHDRAWN', 'EXPIRED')),
    expires_at      TIMESTAMPTZ,
    responded_at    TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_listing_offers_listing ON listing_offers(listing_id);
CREATE INDEX idx_listing_offers_buyer ON listing_offers(buyer_id);

-- ============================================================================
-- NHÓM 5: ĐƠN HÀNG & GIAO NHẬN
-- ============================================================================

CREATE TABLE orders (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_code        VARCHAR(30) UNIQUE NOT NULL,
    buyer_id          UUID NOT NULL REFERENCES users(id),
    seller_vessel_id  UUID NOT NULL REFERENCES vessels(id),
    accepted_offer_id UUID REFERENCES listing_offers(id),  -- đơn có thể phát sinh từ 1 offer đã accept, hoặc mua thẳng (NULL)
    -- total_amount là tổng nhiều order_items => KHÔNG dùng generated column
    -- (Postgres generated column không tham chiếu được bảng khác); backend/
    -- trigger phải tự cập nhật khi order_items thay đổi.
    total_amount      NUMERIC(14,2) NOT NULL DEFAULT 0,
    status            VARCHAR(20) NOT NULL DEFAULT 'PENDING'
                          CHECK (status IN ('PENDING', 'CONFIRMED', 'IN_TRANSIT',
                                             'COMPLETED', 'CANCELLED')),
    note              TEXT,
    client_id         UUID,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_orders_buyer ON orders(buyer_id);
CREATE INDEX idx_orders_seller_vessel ON orders(seller_vessel_id);
CREATE INDEX idx_orders_status ON orders(status);
CREATE TRIGGER trg_orders_updated_at BEFORE UPDATE ON orders
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Một đơn có thể gồm nhiều dòng hàng (nhiều tin đăng khác nhau gộp vào 1 đơn).
CREATE TABLE order_items (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id      UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    listing_id    UUID NOT NULL REFERENCES listings(id),
    quantity_kg   NUMERIC(10,2) NOT NULL,
    price_per_kg  NUMERIC(12,2) NOT NULL,
    subtotal      NUMERIC(14,2) GENERATED ALWAYS AS (quantity_kg * price_per_kg) STORED,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_order_items_order ON order_items(order_id);
CREATE INDEX idx_order_items_listing ON order_items(listing_id);

-- Điểm hẹn giao nhận hàng giữa 2 tàu trên biển — tách khỏi orders vì lịch hẹn
-- có thể đổi nhiều lần trước khi giao nhận thực tế diễn ra.
CREATE TABLE deliveries (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id          UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    buyer_vessel_id   UUID REFERENCES vessels(id),        -- NULL nếu buyer là thương lái trên bờ, không có tàu
    seller_vessel_id  UUID NOT NULL REFERENCES vessels(id),
    meeting_location  GEOGRAPHY(Point, 4326),
    scheduled_at      TIMESTAMPTZ,
    actual_at         TIMESTAMPTZ,
    status            VARCHAR(20) NOT NULL DEFAULT 'SCHEDULED'
                          CHECK (status IN ('SCHEDULED', 'EN_ROUTE', 'COMPLETED', 'FAILED', 'CANCELLED')),
    created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_deliveries_order ON deliveries(order_id);

CREATE TABLE payments (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id        UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    amount          NUMERIC(14,2) NOT NULL,
    payment_method  VARCHAR(20) NOT NULL DEFAULT 'CASH'
                        CHECK (payment_method IN ('CASH', 'BANK_TRANSFER', 'E_WALLET')),
    status          VARCHAR(20) NOT NULL DEFAULT 'PENDING'
                        CHECK (status IN ('PENDING', 'PAID', 'FAILED', 'REFUNDED')),
    transaction_code VARCHAR(60),
    paid_at         TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_payments_order ON payments(order_id);

-- Đánh giá 2 chiều: buyer đánh giá seller VÀ seller đánh giá buyer đều dùng
-- chung bảng này (reviewer_id / reviewed_user_id), thay vì gắn cứng rating
-- lên orders (chỉ cho 1 chiều đánh giá).
CREATE TABLE reviews (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id         UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    reviewer_id      UUID NOT NULL REFERENCES users(id),
    reviewed_user_id UUID NOT NULL REFERENCES users(id),
    rating           SMALLINT NOT NULL CHECK (rating BETWEEN 1 AND 5),
    comment          TEXT,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(order_id, reviewer_id)
);
CREATE INDEX idx_reviews_reviewed_user ON reviews(reviewed_user_id);

-- ============================================================================
-- NHÓM 6: LIÊN LẠC & HẠ TẦNG HỖ TRỢ
-- ============================================================================

CREATE TABLE conversations (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    buyer_id    UUID NOT NULL REFERENCES users(id),
    seller_id   UUID NOT NULL REFERENCES users(id),
    listing_id  UUID REFERENCES listings(id),
    order_id    UUID REFERENCES orders(id),
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    CHECK (listing_id IS NOT NULL OR order_id IS NOT NULL)
);
CREATE INDEX idx_conversations_buyer ON conversations(buyer_id);
CREATE INDEX idx_conversations_seller ON conversations(seller_id);
CREATE TRIGGER trg_conversations_updated_at BEFORE UPDATE ON conversations
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE messages (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    sender_id       UUID NOT NULL REFERENCES users(id),
    message         TEXT NOT NULL,
    is_read         BOOLEAN NOT NULL DEFAULT FALSE,
    client_id       UUID,   -- id sinh trên mobile khi gửi lúc mất mạng
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_messages_conversation ON messages(conversation_id, created_at);

CREATE TABLE notifications (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id           UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title             VARCHAR(200) NOT NULL,
    content           TEXT,
    notification_type VARCHAR(30) NOT NULL DEFAULT 'GENERAL'
                          CHECK (notification_type IN ('GENERAL', 'OFFER', 'ORDER', 'DELIVERY', 'PAYMENT', 'SYSTEM')),
    reference_id      UUID,   -- id của order/offer/listing liên quan, tùy notification_type
    is_read           BOOLEAN NOT NULL DEFAULT FALSE,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_notifications_user ON notifications(user_id, is_read);

-- Chống xử lý trùng khi mobile gửi lại request do mất mạng giữa biển
-- (retry với cùng idempotency_key sẽ trả lại đúng response cũ, không tạo
-- order/offer trùng lặp).
CREATE TABLE idempotency_keys (
    idempotency_key  VARCHAR(100) PRIMARY KEY,
    endpoint         VARCHAR(200) NOT NULL,
    request_hash     VARCHAR(64) NOT NULL,
    response_status  SMALLINT,
    response_body    JSONB,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);
