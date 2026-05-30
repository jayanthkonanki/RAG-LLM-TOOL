$ErrorActionPreference = "Stop"

$DOCKER_USER = "jayanthk82"
$VERSION = "latest"

Write-Host "========================================="
Write-Host " Building Images for Release ($VERSION)  "
Write-Host "========================================="

Write-Host "`n[1/4] Building Backend Image..."
docker build -t $DOCKER_USER/rag-llm-tool-backend:$VERSION ./backend

Write-Host "`n[2/4] Building Frontend Image..."
docker build -t $DOCKER_USER/rag-llm-tool-frontend:$VERSION ./api-context-manager

Write-Host "`n[3/4] Pushing Backend Image to Docker Hub..."
docker push $DOCKER_USER/rag-llm-tool-backend:$VERSION

Write-Host "`n[4/4] Pushing Frontend Image to Docker Hub..."
docker push $DOCKER_USER/rag-llm-tool-frontend:$VERSION

Write-Host "`n========================================="
Write-Host " Done! Release published to Docker Hub.  "
Write-Host "========================================="
