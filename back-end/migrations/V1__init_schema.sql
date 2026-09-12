-- ============================================================
-- SEAFOOD TRADING PLATFORM
-- PostgreSQL Database Schema (Integrated with PostGIS & Offers)
-- ============================================================

-- ============================================================
-- 1. CREATE DATABASE
-- ============================================================
-- Chạy 2 dòng này riêng biệt nếu bạn muốn tạo mới database:
-- DROP DATABASE IF EXISTS Seafood_trading;
-- CREATE DATABASE Seafood_trading;

-- ============================================================
-- 2. EXTENSIONS
-- ============================================================
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "postgis"; 

-- ============================================================
-- 3. ENUM TYPES
-- ============================================================
CREATE TYPE user_role AS ENUM ('FISHERMAN', 'COLLECTOR', 'TRADER', 'ADMIN');
CREATE TYPE user_status AS ENUM ('ACTIVE', 'INACTIVE', 'BANNED');
CREATE TYPE vessel_type AS ENUM ('FISHING', 'COLLECTOR', 'TRANSPORT');
CREATE TYPE vessel_status AS ENUM ('ACTIVE', 'INACTIVE', 'OFFLINE', 'MAINTENANCE');
CREATE TYPE listing_status AS ENUM ('DRAFT', 'PUBLISHED', 'RESERVED', 'SOLD', 'EXPIRED', 'CANCELLED');
CREATE TYPE batch_status AS ENUM ('AVAILABLE', 'RESERVED', 'SOLD', 'EXPIRED');
CREATE TYPE order_status AS ENUM ('PENDING', 'CONFIRMED', 'IN_TRANSIT', 'DELIVERED', 'CANCELLED', 'REJECTED');
CREATE TYPE payment_method AS ENUM ('CASH', 'BANK_TRANSFER', 'E_WALLET');
CREATE TYPE payment_status AS ENUM ('PENDING', 'PAID', 'FAILED', 'REFUNDED');
CREATE TYPE delivery_status AS ENUM ('PENDING', 'MEETING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');
CREATE TYPE quality_level AS ENUM ('PREMIUM', 'GOOD', 'NORMAL', 'LOW');
CREATE TYPE offer_status AS ENUM ('PENDING', 'ACCEPTED', 'REJECTED', 'COUNTERED', 'EXPIRED', 'CANCELLED');

-- ============================================================
-- 4. USERS
-- ============================================================
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    phone VARCHAR(20) UNIQUE,
    email VARCHAR(255) UNIQUE,
    password_hash TEXT NOT NULL,
    full_name VARCHAR(150) NOT NULL,
    avatar_url TEXT,
    role user_role NOT NULL DEFAULT 'FISHERMAN',
    status user_status NOT NULL DEFAULT 'ACTIVE',
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- 5. VESSELS
-- ============================================================
CREATE TABLE vessels (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id UUID NOT NULL,
    vessel_code VARCHAR(50) UNIQUE NOT NULL,
    vessel_name VARCHAR(150) NOT NULL,
    vessel_type vessel_type NOT NULL DEFAULT 'FISHING',
    registration_number VARCHAR(100) UNIQUE,
    capacity_kg NUMERIC(12,2) CHECK (capacity_kg IS NULL OR capacity_kg > 0),
    phone VARCHAR(20),
    status vessel_status NOT NULL DEFAULT 'ACTIVE',
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_vessel_owner FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE RESTRICT
);
CREATE INDEX idx_vessels_owner ON vessels(owner_id);
CREATE INDEX idx_vessels_status ON vessels(status);

-- ============================================================
-- 6. VESSEL LOCATIONS (PostGIS)
-- ============================================================
CREATE TABLE vessel_locations (
    id BIGSERIAL PRIMARY KEY,
    vessel_id UUID NOT NULL,
    location GEOGRAPHY(Point, 4326) NOT NULL,
    speed NUMERIC(8,2) CHECK (speed IS NULL OR speed >= 0),
    heading NUMERIC(6,2) CHECK (heading IS NULL OR (heading >= 0 AND heading < 360)),
    accuracy NUMERIC(8,2), CHECK (accuracy IS NULL OR accuracy >= 0),
    recorded_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_location_vessel FOREIGN KEY (vessel_id) REFERENCES vessels(id) ON DELETE CASCADE
);
CREATE INDEX idx_vessel_locations_vessel_time ON vessel_locations(vessel_id, recorded_at DESC);
CREATE INDEX idx_vessel_locations_time ON vessel_locations(recorded_at DESC);

-- ============================================================
-- 7. SEAFOOD SPECIES
-- ============================================================
CREATE TABLE seafood_species (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name_vi VARCHAR(150) NOT NULL,
    name_en VARCHAR(150),
    scientific_name VARCHAR(200),
    description TEXT,
    image_url TEXT,
    status BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX idx_species_name_vi ON seafood_species(name_vi);

-- ============================================================
-- 8. SEAFOOD BATCHES (PostGIS)
-- ============================================================
CREATE TABLE seafood_batches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vessel_id UUID NOT NULL,
    species_id UUID NOT NULL,
    quantity_kg NUMERIC(12,2) NOT NULL CHECK (quantity_kg > 0),
    estimated_quantity_kg NUMERIC(12,2) CHECK (estimated_quantity_kg IS NULL OR estimated_quantity_kg > 0),
    catch_time TIMESTAMPTZ,
    catch_location GEOGRAPHY(Point, 4326), 
    quality_level quality_level,
    freshness_score NUMERIC(5,2) CHECK (freshness_score IS NULL OR freshness_score BETWEEN 0 AND 100),
    size_min_cm NUMERIC(8,2) CHECK (size_min_cm IS NULL OR size_min_cm > 0),
    size_max_cm NUMERIC(8,2) CHECK (size_max_cm IS NULL OR size_max_cm > 0),
    status batch_status NOT NULL DEFAULT 'AVAILABLE',
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_batch_vessel FOREIGN KEY (vessel_id) REFERENCES vessels(id) ON DELETE RESTRICT,
    CONSTRAINT fk_batch_species FOREIGN KEY (species_id) REFERENCES seafood_species(id) ON DELETE RESTRICT,
    CONSTRAINT chk_batch_size CHECK (size_min_cm IS NULL OR size_max_cm IS NULL OR size_max_cm >= size_min_cm)
);
CREATE INDEX idx_batches_vessel ON seafood_batches(vessel_id);
CREATE INDEX idx_batches_species ON seafood_batches(species_id);
CREATE INDEX idx_batches_status ON seafood_batches(status);
CREATE INDEX idx_batches_catch_time ON seafood_batches(catch_time DESC);

-- ============================================================
-- 9. SEAFOOD IMAGES
-- ============================================================
CREATE TABLE seafood_images (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    batch_id UUID NOT NULL,
    image_url TEXT NOT NULL,
    thumbnail_url TEXT,
    uploaded_by UUID,
    captured_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_image_batch FOREIGN KEY (batch_id) REFERENCES seafood_batches(id) ON DELETE CASCADE,
    CONSTRAINT fk_image_uploader FOREIGN KEY (uploaded_by) REFERENCES users(id) ON DELETE SET NULL
);
CREATE INDEX idx_seafood_images_batch ON seafood_images(batch_id);

-- ============================================================
-- 10. AI DETECTIONS
-- ============================================================
CREATE TABLE ai_detections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    image_id UUID NOT NULL,
    model_version VARCHAR(100) NOT NULL,
    species_id UUID,
    confidence NUMERIC(5,4) CHECK (confidence IS NULL OR confidence BETWEEN 0 AND 1),
    bbox_x NUMERIC(10,4) CHECK (bbox_x IS NULL OR bbox_x >= 0),
    bbox_y NUMERIC(10,4) CHECK (bbox_y IS NULL OR bbox_y >= 0),
    bbox_width NUMERIC(10,4) CHECK (bbox_width IS NULL OR bbox_width >= 0),
    bbox_height NUMERIC(10,4) CHECK (bbox_height IS NULL OR bbox_height >= 0),
    estimated_size_cm NUMERIC(8,2) CHECK (estimated_size_cm IS NULL OR estimated_size_cm > 0),
    quality_score NUMERIC(5,2) CHECK (quality_score IS NULL OR quality_score BETWEEN 0 AND 100),
    freshness_score NUMERIC(5,2) CHECK (freshness_score IS NULL OR freshness_score BETWEEN 0 AND 100),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_detection_image FOREIGN KEY (image_id) REFERENCES seafood_images(id) ON DELETE CASCADE,
    CONSTRAINT fk_detection_species FOREIGN KEY (species_id) REFERENCES seafood_species(id) ON DELETE SET NULL
);
CREATE INDEX idx_ai_detection_image ON ai_detections(image_id);
CREATE INDEX idx_ai_detection_species ON ai_detections(species_id);

-- ============================================================
-- 11. SEAFOOD LISTINGS
-- ============================================================
CREATE TABLE seafood_listings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    batch_id UUID NOT NULL,
    seller_id UUID NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    price_per_kg NUMERIC(15,2) NOT NULL CHECK (price_per_kg >= 0),
    quantity_available NUMERIC(12,2) NOT NULL CHECK (quantity_available >= 0),
    status listing_status NOT NULL DEFAULT 'DRAFT',
    published_at TIMESTAMPTZ,
    expired_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_listing_batch FOREIGN KEY (batch_id) REFERENCES seafood_batches(id) ON DELETE RESTRICT,
    CONSTRAINT fk_listing_seller FOREIGN KEY (seller_id) REFERENCES users(id) ON DELETE RESTRICT,
    CONSTRAINT chk_listing_expiry CHECK (expired_at IS NULL OR published_at IS NULL OR expired_at > published_at)
);
CREATE INDEX idx_listings_seller ON seafood_listings(seller_id);
CREATE INDEX idx_listings_batch ON seafood_listings(batch_id);
CREATE INDEX idx_listings_status ON seafood_listings(status);
CREATE INDEX idx_listings_price ON seafood_listings(price_per_kg);

-- ============================================================
-- 12. ORDERS (PostGIS)
-- Chú ý: Cột accepted_offer_id sẽ được thêm vào sau ở bước 20
-- ============================================================
CREATE TABLE orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    buyer_id UUID NOT NULL,
    seller_id UUID NOT NULL,
    total_amount NUMERIC(15,2) NOT NULL DEFAULT 0 CHECK (total_amount >= 0),
    status order_status NOT NULL DEFAULT 'PENDING',
    pickup_location GEOGRAPHY(Point, 4326), 
    note TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_order_buyer FOREIGN KEY (buyer_id) REFERENCES users(id) ON DELETE RESTRICT,
    CONSTRAINT fk_order_seller FOREIGN KEY (seller_id) REFERENCES users(id) ON DELETE RESTRICT,
    CONSTRAINT chk_order_different_users CHECK (buyer_id <> seller_id)
);
CREATE INDEX idx_orders_buyer ON orders(buyer_id);
CREATE INDEX idx_orders_seller ON orders(seller_id);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_created ON orders(created_at DESC);

-- ============================================================
-- 13. ORDER ITEMS
-- ============================================================
CREATE TABLE order_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL,
    listing_id UUID NOT NULL,
    quantity_kg NUMERIC(12,2) NOT NULL CHECK (quantity_kg > 0),
    price_per_kg NUMERIC(15,2) NOT NULL CHECK (price_per_kg >= 0),
    subtotal NUMERIC(15,2) GENERATED ALWAYS AS (quantity_kg * price_per_kg) STORED,
    CONSTRAINT fk_order_item_order FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
    CONSTRAINT fk_order_item_listing FOREIGN KEY (listing_id) REFERENCES seafood_listings(id) ON DELETE RESTRICT
);
CREATE INDEX idx_order_items_order ON order_items(order_id);
CREATE INDEX idx_order_items_listing ON order_items(listing_id);

-- ============================================================
-- 14. PAYMENTS
-- ============================================================
CREATE TABLE payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL,
    amount NUMERIC(15,2) NOT NULL CHECK (amount >= 0),
    payment_method payment_method NOT NULL DEFAULT 'CASH',
    status payment_status NOT NULL DEFAULT 'PENDING',
    transaction_code VARCHAR(150) UNIQUE,
    paid_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_payment_order FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
);
CREATE INDEX idx_payments_order ON payments(order_id);
CREATE INDEX idx_payments_status ON payments(status);

-- ============================================================
-- 15. DELIVERIES (PostGIS)
-- ============================================================
CREATE TABLE deliveries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL UNIQUE,
    seller_vessel_id UUID NOT NULL,
    buyer_vessel_id UUID NOT NULL,
    meeting_location GEOGRAPHY(Point, 4326) NOT NULL,
    scheduled_time TIMESTAMPTZ,
    actual_time TIMESTAMPTZ,
    status delivery_status NOT NULL DEFAULT 'PENDING',
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_delivery_order FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
    CONSTRAINT fk_delivery_seller_vessel FOREIGN KEY (seller_vessel_id) REFERENCES vessels(id) ON DELETE RESTRICT,
    CONSTRAINT fk_delivery_buyer_vessel FOREIGN KEY (buyer_vessel_id) REFERENCES vessels(id) ON DELETE RESTRICT,
    CONSTRAINT chk_delivery_different_vessels CHECK (seller_vessel_id <> buyer_vessel_id)
);
CREATE INDEX idx_deliveries_status ON deliveries(status);

-- ============================================================
-- 16. REVIEWS
-- ============================================================
CREATE TABLE reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL,
    reviewer_id UUID NOT NULL,
    reviewed_user_id UUID NOT NULL,
    rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
    comment TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_review_order FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
    CONSTRAINT fk_review_reviewer FOREIGN KEY (reviewer_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_review_reviewed FOREIGN KEY (reviewed_user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT chk_review_different_users CHECK (reviewer_id <> reviewed_user_id),
    CONSTRAINT uq_review_order_reviewer UNIQUE (order_id, reviewer_id)
);
CREATE INDEX idx_reviews_reviewed_user ON reviews(reviewed_user_id);
CREATE INDEX idx_reviews_order ON reviews(order_id);

-- ============================================================
-- 17. CONVERSATIONS
-- ============================================================
CREATE TABLE conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    buyer_id UUID NOT NULL,
    seller_id UUID NOT NULL,
    listing_id UUID,
    order_id UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_conversation_buyer FOREIGN KEY (buyer_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_conversation_seller FOREIGN KEY (seller_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_conversation_listing FOREIGN KEY (listing_id) REFERENCES seafood_listings(id) ON DELETE SET NULL,
    CONSTRAINT fk_conversation_order FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE SET NULL,
    CONSTRAINT chk_conversation_different_users CHECK (buyer_id <> seller_id)
);
CREATE INDEX idx_conversations_buyer ON conversations(buyer_id);
CREATE INDEX idx_conversations_seller ON conversations(seller_id);
CREATE INDEX idx_conversations_listing ON conversations(listing_id);
CREATE INDEX idx_conversations_order ON conversations(order_id);
CREATE INDEX idx_conversations_updated ON conversations(updated_at DESC);

-- ============================================================
-- 18. MESSAGES
-- ============================================================
CREATE TABLE messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID NOT NULL,
    sender_id UUID NOT NULL,
    message TEXT NOT NULL,
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_message_conversation FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE,
    CONSTRAINT fk_message_sender FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE INDEX idx_messages_conversation ON messages(conversation_id, created_at ASC);
CREATE INDEX idx_messages_sender ON messages(sender_id);
CREATE INDEX idx_messages_unread ON messages(conversation_id, is_read);

-- ============================================================
-- 19. OFFERS (Bảng Thương Lượng)
-- ============================================================
CREATE TABLE offers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID NOT NULL,
    listing_id UUID NOT NULL,
    buyer_id UUID NOT NULL,
    seller_id UUID NOT NULL,
    parent_offer_id UUID,
    quantity_kg NUMERIC(12,2) NOT NULL CHECK (quantity_kg > 0),
    price_per_kg NUMERIC(15,2) NOT NULL CHECK (price_per_kg >= 0),
    total_amount NUMERIC(15,2) GENERATED ALWAYS AS (quantity_kg * price_per_kg) STORED,
    status offer_status NOT NULL DEFAULT 'PENDING',
    message TEXT,
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    responded_at TIMESTAMPTZ,
    CONSTRAINT fk_offer_conversation FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE,
    CONSTRAINT fk_offer_listing FOREIGN KEY (listing_id) REFERENCES seafood_listings(id) ON DELETE RESTRICT,
    CONSTRAINT fk_offer_buyer FOREIGN KEY (buyer_id) REFERENCES users(id) ON DELETE RESTRICT,
    CONSTRAINT fk_offer_seller FOREIGN KEY (seller_id) REFERENCES users(id) ON DELETE RESTRICT,
    CONSTRAINT fk_offer_parent FOREIGN KEY (parent_offer_id) REFERENCES offers(id) ON DELETE SET NULL,
    CONSTRAINT chk_offer_different_users CHECK (buyer_id <> seller_id)
);
CREATE INDEX idx_offers_conversation ON offers(conversation_id);
CREATE INDEX idx_offers_listing ON offers(listing_id);
CREATE INDEX idx_offers_buyer ON offers(buyer_id);
CREATE INDEX idx_offers_seller ON offers(seller_id);
CREATE INDEX idx_offers_status ON offers(status);
CREATE INDEX idx_offers_parent ON offers(parent_offer_id);
CREATE INDEX idx_offers_created ON offers(created_at DESC);

-- ============================================================
-- 20. ALTER ORDERS (Xử lý tham chiếu vòng vòng)
-- ============================================================
ALTER TABLE orders ADD COLUMN accepted_offer_id UUID;
ALTER TABLE orders ADD CONSTRAINT fk_order_accepted_offer 
    FOREIGN KEY (accepted_offer_id) REFERENCES offers(id) ON DELETE SET NULL;
CREATE INDEX idx_orders_accepted_offer ON orders(accepted_offer_id);

-- ============================================================
-- 21. NOTIFICATIONS
-- ============================================================
CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    notification_type VARCHAR(50) NOT NULL,
    reference_id UUID,
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_notification_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE INDEX idx_notifications_user ON notifications(user_id);
CREATE INDEX idx_notifications_unread ON notifications(user_id, is_read);
CREATE INDEX idx_notifications_created ON notifications(created_at DESC);

-- ============================================================
-- 22. PRICE HISTORY
-- ============================================================
CREATE TABLE price_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    species_id UUID NOT NULL,
    price_per_kg NUMERIC(15,2) NOT NULL CHECK (price_per_kg >= 0),
    recorded_date DATE NOT NULL DEFAULT CURRENT_DATE,
    source VARCHAR(100),
    note TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_price_species FOREIGN KEY (species_id) REFERENCES seafood_species(id) ON DELETE CASCADE
);
CREATE INDEX idx_price_history_species ON price_history(species_id);
CREATE INDEX idx_price_history_date ON price_history(recorded_date DESC);
CREATE INDEX idx_price_history_species_date ON price_history(species_id, recorded_date DESC);

-- ============================================================
-- 23. AUTO UPDATE TIMESTAMP TRIGGERS
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trg_vessels_updated_at BEFORE UPDATE ON vessels FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trg_batches_updated_at BEFORE UPDATE ON seafood_batches FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trg_listings_updated_at BEFORE UPDATE ON seafood_listings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trg_orders_updated_at BEFORE UPDATE ON orders FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trg_conversations_updated_at BEFORE UPDATE ON conversations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- 24. SAMPLE SEAFOOD SPECIES & CHECK TABLES
-- ============================================================
INSERT INTO seafood_species (name_vi, name_en, scientific_name, description) VALUES
    ('Cá ngừ', 'Tuna', 'Thunnus', 'Các loài cá ngừ phổ biến trong khai thác hải sản'),
    ('Cá thu', 'Mackerel', 'Scomberomorus', 'Cá thu biển'),
    ('Mực', 'Squid', 'Teuthida', 'Các loại mực biển'),
    ('Tôm', 'Shrimp', 'Caridea', 'Các loại tôm biển'),
    ('Cua', 'Crab', 'Brachyura', 'Các loại cua biển'),
    ('Ghẹ', 'Blue Crab', 'Portunus', 'Ghẹ biển'),
    ('Cá nục', 'Round Scad', 'Decapterus', 'Cá nục biển'),
    ('Cá cơm', 'Anchovy', 'Engraulidae', 'Các loại cá cơm');

SELECT ROW_NUMBER() OVER (ORDER BY table_name) AS no, table_name
FROM information_schema.tables
WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
ORDER BY table_name;