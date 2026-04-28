# ============================================================
#  Mantis Agent Assist — Backend Dockerfile
# ============================================================
FROM python:3.11-slim

WORKDIR /app

# System dependencies required by librosa / soundfile
RUN apt-get update && apt-get install -y --no-install-recommends \
    libsndfile1 \
    ffmpeg \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements first (layer cache optimisation)
COPY requirements.txt .

# Install all Python deps; use CPU-only torch to keep the image lean
RUN pip install --no-cache-dir \
    --extra-index-url https://download.pytorch.org/whl/cpu \
    -r requirements.txt

# Copy application source
COPY . .

EXPOSE 8000

# HuggingFace model cache is mounted via docker-compose volume on first run
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
