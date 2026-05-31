$ErrorActionPreference = "Stop"

Write-Host "========================================="
Write-Host " Tearing down current system to free ports "
Write-Host "========================================="
docker-compose down

Write-Host "`n========================================="
Write-Host " Creating fresh deployment directory       "
Write-Host "========================================="
$DeployDir = "c:\Users\jkona\OneDrive\Documents\Jayanth\RAG-LLM-TOOL\fresh_deployment"
if (!(Test-Path $DeployDir)) {
    New-Item -ItemType Directory -Path $DeployDir | Out-Null
}
Set-Location $DeployDir

Write-Host "`n========================================="
Write-Host " Pulling files from GitHub                 "
Write-Host "========================================="
# Pull the release compose file
Invoke-WebRequest -Uri "https://raw.githubusercontent.com/jayanthkonanki/RAG-LLM-TOOL/main/docker-compose.release.yml" -OutFile "docker-compose.release.yml"
# Pull the env.example
Invoke-WebRequest -Uri "https://raw.githubusercontent.com/jayanthkonanki/RAG-LLM-TOOL/main/.env.example" -OutFile ".env.example"

Write-Host "`n========================================="
Write-Host " Filling .env file with configuration      "
Write-Host "========================================="
$EnvConfig = @"
# ---------------------------
# PostgreSQL
# ---------------------------
POSTGRES_USER=postgres
POSTGRES_PASSWORD=supersecurepassword
POSTGRES_DB=rag_llm_db

# ---------------------------
# Backend DB Connection
# ---------------------------
DB_HOST=postgres
DB_PORT=5432
DB_NAME=rag_llm_db
DB_USER=postgres
DB_PASSWORD=supersecurepassword

# ---------------------------
# RabbitMQ (Celery broker)
# ---------------------------
RABBITMQ_HOST=rabbitmq
RABBITMQ_USER=guest
RABBITMQ_PASSWORD=guest

# ---------------------------
# Milvus Vector DB
# ---------------------------
MILVUS_URI=http://milvus:19530
COLLECTION_NAME=rag_endpoints
EMBED_DIM=768

# ---------------------------
# Ollama (LLM + Embeddings)
# ---------------------------
OLLAMA_URI=http://host.docker.internal:11434
EMBED_MODEL=nomic-embed-text
LLM_MODEL=llama3.2
RAG_TOP_K=5

# ---------------------------
# Frontend
# ---------------------------
NEXT_PUBLIC_API_URL=http://localhost:8000
"@

Set-Content -Path ".env" -Value $EnvConfig

Write-Host "`n========================================="
Write-Host " Booting up the fresh release environment  "
Write-Host "========================================="
docker-compose -f docker-compose.release.yml up -d

Write-Host "`nDone! Fresh deployment is running."
