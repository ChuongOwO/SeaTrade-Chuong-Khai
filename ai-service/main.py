from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes import router
from app.core.config import CORS_ORIGINS

# Khởi tạo ứng dụng FastAPI
# LƯU Ý: tiêu đề này TRƯỚC ĐÂY ghi "API Nhận diện Tôm/Cua giống" — sót lại từ
# đề tài cũ (tôm/cua giống) đã bị HỦY, đề tài thật hiện tại là nhận diện hải
# sản (cá ngừ, cá thu, tôm hùm, mực, cua...) — xem
# HUONG_DAN_TRAIN_MODEL_HAI_SAN.md ở gốc dự án để train model đúng phạm vi.
app = FastAPI(title="API Nhận Diện Hải Sản — SeaTrade AI", version="1.0.0")

# Cho phép mobile app (Expo, chạy trên điện thoại thật qua Wi-Fi LAN) và web
# admin gọi thẳng API này từ origin khác domain/port hiện tại — để "*" khi
# demo/dev, nên giới hạn lại đúng domain thật khi triển khai production.
app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Nhúng các API con từ thư mục app/api/routes.py
app.include_router(router, prefix="/api/v1")

# Một API test nhanh để kiểm tra server có sống không
@app.get("/")
def read_root():
    return {"status": "success", "message": "AI Service đang hoạt động bình thường!"}