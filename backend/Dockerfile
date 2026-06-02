FROM python:3.11-slim

WORKDIR /app

ENV DEBIAN_FRONTEND=noninteractive
# Ensure UTF-8 output (avoids cp1252 UnicodeEncodeError on Windows hosts)
ENV PYTHONUNBUFFERED=1
ENV PYTHONIOENCODING=utf-8

# System deps for psycopg2-binary
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    libpq-dev \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Install Python deps first (layer cache)
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy all backend source (includes api_executor.py and new setup_endpoints_db.py)
COPY . .

EXPOSE 8000

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
