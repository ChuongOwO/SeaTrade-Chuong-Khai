from fastapi import FastAPI
from app.api.routes import router

# Khởi tạo ứng dụng FastAPI
app = FastAPI(title="API Nhận diện Tôm/Cua giống", version="1.0.0")

# Nhúng các API con từ thư mục app/api/routes.py
app.include_router(router, prefix="/api/v1")

# Một API test nhanh để kiểm tra server có sống không
@app.get("/")
def read_root():
    return {"status": "success", "message": "AI Service đang hoạt động bình thường!"}