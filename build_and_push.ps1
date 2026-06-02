$ErrorActionPreference = "Stop"

$DOCKER_USER = "jayanthk82"
$VERSION     = "v3"

Write-Host "========================================="
Write-Host " Building Images for Release ($VERSION)  "
Write-Host "========================================="

# ── Backend ────────────────────────────────────────────────────
Write-Host "`n[1/4] Building Backend Image..."
docker build `
  --file ./backend/Dockerfile `
  --tag  $DOCKER_USER/rag-llm-tool-backend:$VERSION `
  --tag  $DOCKER_USER/rag-llm-tool-backend:latest `
  ./backend

# ── Frontend ───────────────────────────────────────────────────
Write-Host "`n[2/4] Building Frontend Image..."
docker build `
  --file ./api-context-manager/Dockerfile `
  --tag  $DOCKER_USER/rag-llm-tool-frontend:$VERSION `
  --tag  $DOCKER_USER/rag-llm-tool-frontend:latest `
  ./api-context-manager

# ── Push ───────────────────────────────────────────────────────
Write-Host "`n[3/4] Pushing Backend to Docker Hub..."
docker push $DOCKER_USER/rag-llm-tool-backend:$VERSION
docker push $DOCKER_USER/rag-llm-tool-backend:latest

Write-Host "`n[4/4] Pushing Frontend to Docker Hub..."
docker push $DOCKER_USER/rag-llm-tool-frontend:$VERSION
docker push $DOCKER_USER/rag-llm-tool-frontend:latest

Write-Host "`n========================================="
Write-Host " Done! $VERSION published to Docker Hub. "
Write-Host "========================================="
