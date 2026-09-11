import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
from matplotlib.patches import FancyBboxPatch, FancyArrowPatch

C_CLIENT  = "#2E5EAA"   # Web Admin / Mobile App
C_APP     = "#1F7A5C"   # Backend API nghiệp vụ
C_AI      = "#0E7C7B"   # AI Service
C_DATA    = "#5B4B8A"   # PostgreSQL / lưu trữ file

FIG_W, FIG_H = 14.6, 9.8
fig, ax = plt.subplots(figsize=(FIG_W, FIG_H), dpi=200)
ax.set_xlim(0, FIG_W)
ax.set_ylim(0, FIG_H)
ax.axis("off")

def box(x, y, w, h, title, lines, color, title_fs=10.5, line_fs=8.3, warn_note=None):
    fb = FancyBboxPatch((x, y), w, h, boxstyle="round,pad=0.02,rounding_size=0.08",
                         linewidth=1.4, edgecolor=color, facecolor="white", zorder=3)
    ax.add_patch(fb)
    header_h = 0.42
    header = FancyBboxPatch((x, y + h - header_h), w, header_h,
                             boxstyle="round,pad=0.0,rounding_size=0.06", linewidth=0, facecolor=color, zorder=4)
    ax.add_patch(header)
    ax.text(x + w/2, y + h - header_h/2, title, ha="center", va="center",
            fontsize=title_fs, color="white", fontweight="bold", zorder=5)
    n = len(lines)
    body_h = h - header_h - (0.32 if warn_note else 0)
    for i, ln in enumerate(lines):
        ax.text(x + w/2, y + h - header_h - body_h*(i+1)/(n+1), ln, ha="center", va="center",
                fontsize=line_fs, color="#222222", zorder=5)
    if warn_note:
        ax.text(x + w/2, y + 0.16, warn_note, ha="center", va="center",
                fontsize=7.1, color="#B15A00", fontweight="bold", zorder=5)
    return (x, y, w, h)

def edge(b, side, at=None):
    """Điểm trên cạnh box. `at` là toạ độ tuyệt đối x (top/bottom) hoặc y (left/right);
    None = giữa cạnh."""
    x, y, w, h = b
    if side == "top":
        return (at if at is not None else x + w/2, y + h)
    if side == "bottom":
        return (at if at is not None else x + w/2, y)
    if side == "left":
        return (x, at if at is not None else y + h/2)
    if side == "right":
        return (x + w, at if at is not None else y + h/2)

def straight(p1, p2, label="", color="#333333", lw=1.4, dashed=False, label_pos=0.5, label_dy=0.14, label_fs=7.6, ha="center"):
    a = FancyArrowPatch(p1, p2, arrowstyle="-|>", mutation_scale=12, linewidth=lw, color=color,
                         zorder=2, shrinkA=2, shrinkB=2, linestyle=("dashed" if dashed else "solid"))
    ax.add_patch(a)
    if label:
        mx = p1[0] + (p2[0]-p1[0])*label_pos
        my = p1[1] + (p2[1]-p1[1])*label_pos
        ax.text(mx, my + label_dy, label, ha=ha, va="center", fontsize=label_fs,
                color=color, zorder=6, backgroundcolor="white")

def polyline(points, label="", color="#333333", lw=1.4, dashed=False, label_idx=1, label_dy=0.16, label_fs=7.6):
    xs = [p[0] for p in points]
    ys = [p[1] for p in points]
    ax.plot(xs[:-1], ys[:-1], color=color, linewidth=lw, zorder=2, linestyle=("dashed" if dashed else "solid"))
    a = FancyArrowPatch(points[-2], points[-1], arrowstyle="-|>", mutation_scale=12, linewidth=lw,
                         color=color, zorder=2, linestyle=("dashed" if dashed else "solid"))
    ax.add_patch(a)
    if label:
        p = points[label_idx]
        ax.text(p[0], p[1] + label_dy, label, ha="center", va="center", fontsize=label_fs,
                color=color, zorder=6, backgroundcolor="white")

# ============ Row 1: Client ============
web = box(0.6, 7.05, 6.0, 1.7, "WEB ADMIN",
          ["React 18 + Vite + TailwindCSS", "Trình duyệt — theo dõi & quản lý",
           "(Admin: tàu, đơn hàng, thị trường)"], C_CLIENT)
mobile = box(8.0, 6.85, 6.0, 1.9, "MOBILE APP",
             ["Expo (React Native) — Android/iOS/Web", "Ngư dân & thương lái",
              "Cảm biến: GPS (expo-location),", "Camera (expo-camera)"], C_CLIENT)

# ============ Row 2: Backend hub (full width) ============
backend = box(0.6, 3.95, 13.4, 2.3, "BACKEND API NGHIỆP VỤ",
              ["Auth, users, vessels, listings, offers, orders,", "deliveries, payments, reviews, notifications",
               "Chạy tại 172.16.240.188:5000"],
              C_APP, warn_note="⚠ Mã nguồn chưa có trong repo chung (không thấy thư mục back-end/)")

# ============ Row 3: AI / Data ============
db = box(0.6, 0.75, 4.2, 2.3, "PostgreSQL + PostGIS",
         ["20 bảng (users, vessels,", "listings, orders, ai_detections...)",
          "Toạ độ: GEOGRAPHY(Point,4326)"], C_DATA)
storage = box(5.1, 0.75, 4.2, 2.3, "LƯU TRỮ FILE / ẢNH",
              ["Ảnh mẻ cá, avatar người dùng", "(catch_images.image_url,", "users.avatar_url)"],
              C_DATA, warn_note="⚠ Chưa chốt: local disk / S3 / Cloudinary")
ai = box(9.6, 0.75, 4.4, 2.3, "AI SERVICE",
         ["Python (FastAPI)", "Nhận diện tôm/cua giống — YOLOv8",
          "Input: ảnh mẻ cá", "Output: bbox, species, confidence"],
         C_AI, warn_note="⚠ Hiện mới là khung sườn (routes.py, schemas.py... còn trống)")

# ============ Mũi tên: Client -> Backend (thẳng, không cắt nhau) ============
straight(edge(web, "bottom"), edge(backend, "top", at=web[0]+web[2]/2),
         "REST API (HTTPS/JSON)\nhiện Web Admin còn dùng mock data,\nchưa nối API thật", dashed=True, label_dy=0.06)
straight(edge(mobile, "bottom"), edge(backend, "top", at=mobile[0]+mobile[2]/2),
         "REST: /api/login, /api/register, ...\n+ WebSocket (Socket.IO): vessel_location_update",
         label_dy=0.06)

# ============ Mũi tên: Backend -> DB / Storage / AI (thẳng, không cắt nhau) ============
straight(edge(backend, "bottom", at=db[0]+db[2]/2), edge(db, "top"), "SQL\n(đọc/ghi)")
straight(edge(backend, "bottom", at=storage[0]+storage[2]/2), edge(storage, "top"), "Lưu / đọc\nfile ảnh")
straight(edge(backend, "bottom", at=ai[0]+ai[2]/2), edge(ai, "top"),
         "Gọi nội bộ: lưu kết quả\ndetect vào ai_detections")

# ============ Mobile -> AI: đường vòng ngoài rìa phải, đề xuất/chưa xác nhận ============
corridor_x = FIG_W - 0.35
polyline([
    edge(mobile, "right"),
    (corridor_x, mobile[1] + mobile[3]/2),
    (corridor_x, ai[1] + ai[3]/2),
    edge(ai, "right"),
], "Upload ảnh mẻ cá để nhận diện — luồng đề xuất,\ncần xác nhận lại với đồng đội cách đã nối thật",
   color="#0E7C7B", dashed=True, label_idx=1, label_dy=0.35)

# ============ Legend ============
legend_items = [("Client (Web / Mobile)", C_CLIENT), ("Tầng ứng dụng / Backend", C_APP),
                 ("AI Service", C_AI), ("Tầng dữ liệu", C_DATA)]
lx = 0.6
ly = FIG_H - 0.75
for label, color in legend_items:
    ax.add_patch(FancyBboxPatch((lx, ly), 0.24, 0.24, boxstyle="round,pad=0.01,rounding_size=0.05",
                                 linewidth=0, facecolor=color, zorder=5))
    ax.text(lx + 0.34, ly + 0.12, label, ha="left", va="center", fontsize=9, color="#222222", zorder=5)
    lx += 0.34 + len(label) * 0.082 + 0.4

note = ("Ghi chú: mũi tên nét đứt = luồng chưa xác nhận / chưa triển khai đầy đủ tại thời điểm báo cáo.\n"
        "Backend API nghiệp vụ và AI Service hiện độc lập theo thư mục (ai-service/), phần backend nghiệp vụ do đồng đội quản lý,\n"
        "chưa thấy trong repo chung — cần đồng bộ lại với nhóm trước khi coi đây là kiến trúc cuối cùng.")
ax.text(0.6, 0.15, note, ha="left", va="bottom", fontsize=7.6, color="#666666")

ax.set_title("Sơ đồ Kiến trúc Hệ thống — SeaTrade AI", fontsize=15.5, fontweight="bold", y=1.0, color="#1F4E79")

plt.tight_layout()
plt.savefig("/home/claude/seatrade-db-v2/architecture.png", dpi=200, bbox_inches="tight", facecolor="white")
print("saved")
