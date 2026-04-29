FROM python:3.10-slim

# Install system dependencies for OpenCV
RUN apt-get update && apt-get install -y \
    libgl1 \
    libglib2.0-0t64 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
# Ensure headless version to avoid GUI dependency issues in Cloud Run
RUN pip install opencv-python-headless

COPY . .

# Cloud Run default port
ENV PORT 8080
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8080"]
