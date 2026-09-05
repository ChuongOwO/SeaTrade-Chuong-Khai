import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
from matplotlib.patches import FancyBboxPatch, FancyArrowPatch

C_ACTOR   = "#2E5EAA"   # Người dùng / Tàu
C_CATALOG = "#5B4B8A"   # Danh mục tham chiếu
C_AI      = "#0E7C7B"   # Mẻ đánh bắt & pipeline AI
C_CORE    = "#1F7A5C"   # Giao dịch lõi (tin đăng, đàm phán, đơn hàng)
C_SUPPORT = "#B15A00"   # Giao nhận / thanh toán / liên lạc / hạ tầng

# (col_index, name, color, [fields...])
TABLES = [
    (0, "users", C_ACTOR, ["id (PK)", "full_name, phone, email", "role, is_active", "client_id, deleted_at"]),
    (0, "vessels", C_ACTOR, ["id (PK)", "owner_id → users", "registration_code, name", "vessel_type, status",
                              "current_location (geo)", "heading/speed/fuel/battery"]),
    (0, "vessel_locations", C_ACTOR, ["id (PK, BIGSERIAL)", "vessel_id → vessels", "location (geo)", "heading, speed, recorded_at"]),

    (1, "species", C_CATALOG, ["id (PK)", "name, category, unit", "ai_label", "base_price_min/max"]),
    (1, "species_grades", C_CATALOG, ["id (PK)", "species_id → species", "grade_label", "price_multiplier"]),
    (1, "market_price_\nsnapshots", C_CATALOG, ["id (PK)", "species_id → species", "snapshot_date, avg_price", "sample_size"]),

    (2, "catch_batches", C_AI, ["id (PK)", "vessel_id → vessels", "species_id → species", "quantity_kg, quality_level",
                                  "catch_location (geo)", "status, client_id"]),
    (2, "catch_images", C_AI, ["id (PK)", "batch_id → catch_batches", "image_url, uploaded_by", "captured_at"]),
    (2, "ai_detections", C_AI, ["id (PK, BIGSERIAL)", "image_id → catch_images", "model_version, species_id", "confidence, bbox_x/y/w/h",
                                  "quality/freshness_score"]),

    (3, "listings", C_CORE, ["id (PK)", "batch_id → catch_batches", "vessel_id → vessels", "species_id, grade_id",
                               "price_per_kg", "total_value (generated)", "status, client_id"]),
    (3, "listing_offers", C_CORE, ["id (PK)", "listing_id → listings", "buyer_id / seller_id → users", "parent_offer_id (self)",
                                     "quantity_kg, price_per_kg", "status"]),

    (4, "orders", C_CORE, ["id (PK)", "order_code", "buyer_id → users", "seller_vessel_id → vessels",
                             "accepted_offer_id", "total_amount", "status"]),
    (4, "order_items", C_CORE, ["id (PK)", "order_id → orders", "listing_id → listings", "quantity_kg, price_per_kg",
                                  "subtotal (generated)"]),

    (5, "deliveries", C_SUPPORT, ["id (PK)", "order_id → orders", "buyer/seller_vessel_id → vessels", "meeting_location (geo)",
                                    "scheduled_at, status"]),
    (5, "payments", C_SUPPORT, ["id (PK)", "order_id → orders", "amount, payment_method", "status, paid_at"]),
    (5, "reviews", C_SUPPORT, ["id (PK)", "order_id → orders", "reviewer_id / reviewed_user_id", "rating, comment"]),

    (6, "conversations", C_SUPPORT, ["id (PK)", "buyer_id / seller_id → users", "listing_id / order_id"]),
    (6, "messages", C_SUPPORT, ["id (PK)", "conversation_id → conversations", "sender_id → users", "message, is_read"]),
    (6, "notifications", C_SUPPORT, ["id (PK)", "user_id → users", "title, notification_type", "reference_id, is_read"]),
    (6, "idempotency_keys", C_SUPPORT, ["idempotency_key (PK)", "endpoint, request_hash", "response_status/body"]),
]

COL_W = 2.55
COL_GAP = 0.28
ROW_LINE_H = 0.235
HEADER_H = 0.4
BOX_GAP = 0.3
TOP_Y = 10.6

n_cols = max(t[0] for t in TABLES) + 1
fig_w = n_cols * (COL_W + COL_GAP) + 0.3
fig, ax = plt.subplots(figsize=(fig_w, 11.6), dpi=200)
ax.set_xlim(0, fig_w)
ax.set_ylim(0, 11.6)
ax.axis("off")

boxes = {}  # name -> (x, y, w, h)
col_cursor_y = {c: TOP_Y for c in range(n_cols)}

for col, name, color, fields in TABLES:
    h = HEADER_H + ROW_LINE_H * len(fields) + 0.14
    x = 0.25 + col * (COL_W + COL_GAP)
    y = col_cursor_y[col] - h
    col_cursor_y[col] = y - BOX_GAP

    fb = FancyBboxPatch((x, y), COL_W, h, boxstyle="round,pad=0.015,rounding_size=0.05",
                         linewidth=1.1, edgecolor=color, facecolor="white", zorder=3)
    ax.add_patch(fb)
    header = FancyBboxPatch((x, y + h - HEADER_H), COL_W, HEADER_H,
                             boxstyle="round,pad=0.0,rounding_size=0.04", linewidth=0, facecolor=color, zorder=4)
    ax.add_patch(header)
    title_fs = 8.6 if "\n" not in name else 7.6
    ax.text(x + COL_W/2, y + h - HEADER_H/2, name, ha="center", va="center",
            fontsize=title_fs, color="white", fontweight="bold", zorder=5)
    for i, f in enumerate(fields):
        ax.text(x + 0.1, y + h - HEADER_H - ROW_LINE_H*(i + 0.8), f, ha="left", va="center",
                fontsize=6.9, color="#222222", family="monospace", zorder=5)
    boxes[name] = (x, y, COL_W, h)

def pt(box, side):
    x, y, w, h = box
    return {"top": (x + w/2, y + h), "bottom": (x + w/2, y),
            "left": (x, y + h/2), "right": (x + w, y + h/2)}[side]

def arrow(n1, s1, n2, s2, color="#333333", lw=1.0):
    b1, b2 = boxes[n1], boxes[n2]
    p1, p2 = pt(b1, s1), pt(b2, s2)
    a = FancyArrowPatch(p1, p2, arrowstyle="-|>", mutation_scale=9, linewidth=lw,
                         color=color, zorder=2, shrinkA=1, shrinkB=1,
                         connectionstyle="arc3,rad=0.08")
    ax.add_patch(a)

# Quan hệ chính (spine) — các FK phụ còn lại xem đầy đủ trong schema.sql
arrow("users", "right", "vessels", "left")
arrow("vessels", "bottom", "vessel_locations", "top")
arrow("species", "bottom", "species_grades", "top")
arrow("species", "bottom", "market_price_\nsnapshots", "top")
arrow("vessels", "right", "catch_batches", "left")
arrow("species", "right", "catch_batches", "left")
arrow("catch_batches", "bottom", "catch_images", "top")
arrow("catch_images", "bottom", "ai_detections", "top")
arrow("catch_batches", "right", "listings", "left")
arrow("listings", "bottom", "listing_offers", "top")
arrow("listing_offers", "right", "orders", "left")
arrow("listings", "bottom", "order_items", "top")
arrow("orders", "bottom", "order_items", "top")
arrow("orders", "right", "deliveries", "left")
arrow("orders", "right", "payments", "left")
arrow("orders", "right", "reviews", "left")
arrow("vessels", "right", "deliveries", "left")
arrow("orders", "right", "conversations", "left")
arrow("conversations", "bottom", "messages", "top")
arrow("users", "right", "notifications", "left")

# Legend
legend_items = [("Người dùng / Tàu", C_ACTOR), ("Danh mục tham chiếu", C_CATALOG),
                 ("Mẻ đánh bắt & AI", C_AI), ("Giao dịch lõi", C_CORE),
                 ("Giao nhận / liên lạc / hạ tầng", C_SUPPORT)]
lx = 0.25
for label, color in legend_items:
    ax.add_patch(FancyBboxPatch((lx, 11.28), 0.22, 0.22, boxstyle="round,pad=0.01,rounding_size=0.04",
                                 linewidth=0, facecolor=color, zorder=5))
    ax.text(lx + 0.32, 11.39, label, ha="left", va="center", fontsize=8.6, color="#222222", zorder=5)
    lx += 0.32 + len(label) * 0.078 + 0.35

note = ("Ghi chú: sơ đồ chỉ vẽ các quan hệ chính để dễ đọc; toàn bộ FK (kể cả buyer_id/seller_id/reviewer_id → users,\n"
        "species_id → species trong listings/ai_detections, v.v.) xem đầy đủ trong schema.sql. Tọa độ dùng PostGIS GEOGRAPHY(Point,4326).")
ax.text(0.25, 0.08, note, ha="left", va="bottom", fontsize=7.3, color="#666666")

ax.set_title("Sơ đồ ERD — SeaTrade AI (bản hợp nhất chính thức, 04/09/2026)",
              fontsize=14.5, fontweight="bold", y=1.0, color="#1F4E79")

plt.tight_layout()
plt.savefig("/home/claude/seatrade-db-v2/erd.png", dpi=200, bbox_inches="tight", facecolor="white")
print("saved")
