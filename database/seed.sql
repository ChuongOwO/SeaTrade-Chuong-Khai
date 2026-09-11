-- ============================================================================
-- Seed data mẫu cho bản schema hợp nhất — đủ để chạy thử toàn bộ luồng:
-- user đăng ký -> tàu đánh bắt -> chụp ảnh AI nhận diện -> đăng tin -> đàm
-- phán -> tạo đơn -> hẹn giao hàng -> thanh toán -> đánh giá -> nhắn tin.
-- Chạy sau schema.sql: psql -f schema.sql -f seed.sql
-- ============================================================================

-- ---------- Danh mục loài & hạng ----------
INSERT INTO species (id, name, scientific_name, category, unit, base_price_min, base_price_max, description, sample_image_url, ai_label) VALUES
    ('a0000000-0000-0000-0000-000000000001', 'Cá Ngừ Vây Vàng', 'Thunnus albacares', 'Fish', 'kg', 150000, 220000,
        'Cá ngừ vây vàng đại dương tươi nguyên con, thịt đỏ tươi chắc, phù hợp làm Sashimi và xuất khẩu.',
        'https://images.unsplash.com/photo-1544551763-46a013bb70d5?auto=format&fit=crop&w=600&q=80', NULL),
    ('a0000000-0000-0000-0000-000000000002', 'Cá Thu Thuận Hải', 'Scomberomorus commerson', 'Fish', 'kg', 180000, 240000,
        'Cá thu tươi nguyên con vừa đánh bắt, thân dẹp lóng lánh ánh bạc, thịt ngọt đậm đà.',
        'https://images.unsplash.com/photo-1534483509719-3feaee7c30da?auto=format&fit=crop&w=600&q=80', NULL),
    ('a0000000-0000-0000-0000-000000000003', 'Tôm Hùm Bông / Tôm Hùm Đá', 'Panulirus ornatus', 'Shrimp', 'kg', 950000, 1400000,
        'Tôm hùm bông thiên nhiên đánh bắt rạn bãi ven đảo, vỏ rực rỡ, thịt săn dai đặc sản.',
        'https://images.unsplash.com/photo-1565680018434-b513d5e5fd47?auto=format&fit=crop&w=600&q=80', 'Shrimp'),
        -- ai_label = 'Shrimp' vì đây là loài DUY NHẤT model AI hiện tại (shrimp_model.pt) nhận diện được
    ('a0000000-0000-0000-0000-000000000004', 'Mực Lá Đại Dương', 'Sepioteuthis lessoniana', 'Squid', 'kg', 220000, 310000,
        'Mực lá thân dày, da đổi màu chớp nháy khi vừa kéo lưới, giòn ngọt hảo hạng.',
        'https://images.unsplash.com/photo-1599488615731-7e5c2823ff28?auto=format&fit=crop&w=600&q=80', NULL),
    ('a0000000-0000-0000-0000-000000000005', 'Cua Biển Cà Mau / Cua Gạch', 'Scylla serrata', 'Crab', 'kg', 350000, 550000,
        'Cua gạch và cua thịt đánh bắt vùng bãi bồi cửa sông ven biển, chắc thịt gạch béo ngậy.',
        'https://images.unsplash.com/photo-1559742811-822863c46f43?auto=format&fit=crop&w=600&q=80', NULL);

INSERT INTO species_grades (id, species_id, grade_label, price_multiplier, criteria, sort_order) VALUES
    ('b0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000003', 'Size A (>1.2kg/con)', 1.30, 'Tôm sống bơi khỏe, vỏ bóng đẹp', 1),
    ('b0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000003', 'Size B (0.7-1.2kg/con)', 1.00, 'Tôm sống khỏe tiêu chuẩn', 2),
    ('b0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000003', 'Size C (<0.7kg/con)', 0.80, 'Tôm nhỏ', 3);

INSERT INTO market_price_snapshots (species_id, snapshot_date, avg_price, grade_a_price, grade_b_price, sample_size) VALUES
    ('a0000000-0000-0000-0000-000000000003', CURRENT_DATE - 1, 1150000, 1300000, 1000000, 18),
    ('a0000000-0000-0000-0000-000000000003', CURRENT_DATE, 1180000, 1330000, 1020000, 22);

-- ---------- Người dùng ----------
INSERT INTO users (id, full_name, phone, email, role, password_hash) VALUES
    ('c0000000-0000-0000-0000-000000000001', 'Quản trị viên SeaTrade', '0900000000', 'admin@seatrade.vn', 'admin', 'CHANGE_ME_bcrypt_hash'),
    ('c0000000-0000-0000-0000-000000000002', 'Trần Văn Hải', '0901111111', 'hai.fisher@seatrade.vn', 'fisherman', 'CHANGE_ME_bcrypt_hash'),
    ('c0000000-0000-0000-0000-000000000003', 'Nguyễn Thị Kim Trang', '0902222222', 'trang.trader@seatrade.vn', 'trader', 'CHANGE_ME_bcrypt_hash');

-- ---------- Tàu ----------
INSERT INTO vessels (id, owner_id, registration_code, name, vessel_type, home_port, power_hp,
                      cold_storage_capacity_kg, current_location, status) VALUES
    ('d0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000002',
        'BTH-90123-TS', 'Hải Nam 09', 'fishing', 'Cảng Phan Thiết', 320,
        2500, ST_SetSRID(ST_MakePoint(108.15, 10.75), 4326)::geography, 'ACTIVE_FISHING');

INSERT INTO vessel_locations (vessel_id, location, heading_degrees, speed_knots, accuracy_m) VALUES
    ('d0000000-0000-0000-0000-000000000001', ST_SetSRID(ST_MakePoint(108.15, 10.75), 4326)::geography, 45, 6.2, 8);

-- ---------- Mẻ đánh bắt + ảnh + AI detect ----------
INSERT INTO catch_batches (id, vessel_id, species_id, quantity_kg, quality_level, freshness_score,
                            size_min_cm, size_max_cm, catch_location, status) VALUES
    ('e0000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000001',
        'a0000000-0000-0000-0000-000000000003', 45.5, 'A', 92.5, 18, 32,
        ST_SetSRID(ST_MakePoint(108.20, 10.80), 4326)::geography, 'LISTED');

INSERT INTO catch_images (id, batch_id, image_url, uploaded_by, captured_at) VALUES
    ('f0000000-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-000000000001',
        'https://images.unsplash.com/photo-1565680018434-b513d5e5fd47?auto=format&fit=crop&w=600&q=80',
        'c0000000-0000-0000-0000-000000000002', now());

INSERT INTO ai_detections (image_id, model_version, species_id, raw_label, confidence,
                            bbox_x, bbox_y, bbox_width, bbox_height, estimated_size_cm, quality_score, freshness_score) VALUES
    ('f0000000-0000-0000-0000-000000000001', 'shrimp_model_v1.2', 'a0000000-0000-0000-0000-000000000003',
        'Shrimp', 0.9421, 120.5, 80.0, 210.0, 160.0, 24.5, 88.0, 92.5);

-- ---------- Tin đăng + đàm phán ----------
INSERT INTO listings (id, batch_id, vessel_id, species_id, grade_id, title, description, price_per_kg,
                       quantity_available_kg, listing_location, status) VALUES
    ('10000000-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-000000000001',
        'd0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000003',
        'b0000000-0000-0000-0000-000000000001', 'Tôm Hùm Bông Size A - Vừa Cập Bến',
        'Tôm hùm bông tươi sống, đánh bắt sáng nay, còn 45.5kg.', 1300000, 45.5,
        ST_SetSRID(ST_MakePoint(108.20, 10.80), 4326)::geography, 'IN_NEGOTIATION');

INSERT INTO listing_offers (id, listing_id, buyer_id, seller_id, parent_offer_id, quantity_kg, price_per_kg, message, status) VALUES
    ('20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001',
        'c0000000-0000-0000-0000-000000000003', 'c0000000-0000-0000-0000-000000000002', NULL,
        45.5, 1250000, 'Anh có thể để 1.250.000đ/kg lấy hết được không?', 'PENDING');

-- ---------- Đơn hàng (giả định offer trên đã được chấp nhận) ----------
INSERT INTO orders (id, order_code, buyer_id, seller_vessel_id, accepted_offer_id, total_amount, status) VALUES
    ('30000000-0000-0000-0000-000000000001', 'DH-000001', 'c0000000-0000-0000-0000-000000000003',
        'd0000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', 56875000, 'CONFIRMED');

INSERT INTO order_items (order_id, listing_id, quantity_kg, price_per_kg) VALUES
    ('30000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 45.5, 1250000);

INSERT INTO deliveries (order_id, buyer_vessel_id, seller_vessel_id, meeting_location, scheduled_at, status) VALUES
    ('30000000-0000-0000-0000-000000000001', NULL, 'd0000000-0000-0000-0000-000000000001',
        ST_SetSRID(ST_MakePoint(108.10, 10.70), 4326)::geography, now() + interval '3 hours', 'SCHEDULED');

INSERT INTO payments (order_id, amount, payment_method, status) VALUES
    ('30000000-0000-0000-0000-000000000001', 56875000, 'CASH', 'PENDING');

-- ---------- Nhắn tin & thông báo ----------
INSERT INTO conversations (id, buyer_id, seller_id, listing_id, order_id) VALUES
    ('40000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000003',
        'c0000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000001',
        '30000000-0000-0000-0000-000000000001');

INSERT INTO messages (conversation_id, sender_id, message) VALUES
    ('40000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000003', 'Anh có thể để 1.250.000đ/kg lấy hết được không?'),
    ('40000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000002', 'Được chị, em xác nhận đơn nhé!');

INSERT INTO notifications (user_id, title, content, notification_type, reference_id) VALUES
    ('c0000000-0000-0000-0000-000000000002', 'Đơn hàng mới', 'Bạn có đơn hàng DH-000001 vừa được xác nhận.', 'ORDER', '30000000-0000-0000-0000-000000000001');
