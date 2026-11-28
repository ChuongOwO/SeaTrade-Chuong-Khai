FROM python:3.11-slim-bookworm

ENV PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    YOLO_CONFIG_DIR=/tmp/Ultralytics

# OpenCV (ultralytics) cần các thư viện đồ hoạ hệ thống
RUN apt-get update \
    && apt-get install -y --no-install-recommends libgl1 libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# PyTorch bản CPU trước, để image không kéo bản CUDA (rất nặng)
COPY requirements.txt .
RUN pip install torch torchvision --index-url https://download.pytorch.org/whl/cpu \
    && pip install -r requirements.txt

COPY main.py .
COPY app ./app
# Cần file ml-models/seafood_model.pt đã được commit vào git
COPY ml-models ./ml-models

# Railway tự đặt biến PORT; mặc định 8000 khi chạy local
ENV PORT=8000
EXPOSE 8000
CMD ["sh", "-c", "uvicorn main:app --host 0.0.0.0 --port ${PORT}"]
