FROM python:3.11-slim

WORKDIR /app

# Prevent apt-get from prompting interactively
ENV DEBIAN_FRONTEND=noninteractive

# Install system dependencies required by psycopg2-binary
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy source code
COPY . .

# Keep Python output unbuffered (visible in docker logs)
ENV PYTHONUNBUFFERED=1

EXPOSE 8000

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
