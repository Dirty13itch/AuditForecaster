$ErrorActionPreference = "Stop"

$UNRAID_IP = "192.168.1.244"
$UNRAID_USER = "root"
$UNRAID_PATH = "/mnt/user/appdata/auditforecaster"
$IMAGE_NAME = "auditforecaster:latest"
$TAR_NAME = "auditforecaster.tar"

Write-Host "🚀 Starting Unraid Deployment..." -ForegroundColor Cyan

# 1. Build Docker Image
Write-Host "📦 Building Docker image..." -ForegroundColor Yellow
docker build -t $IMAGE_NAME .
if ($LASTEXITCODE -ne 0) { Write-Error "Build failed"; exit 1 }

# 2. Save Image to Tar
Write-Host "💾 Saving image to tar..." -ForegroundColor Yellow
docker save -o $TAR_NAME $IMAGE_NAME
if ($LASTEXITCODE -ne 0) { Write-Error "Save failed"; exit 1 }

# 3. Transfer Files (Image + Compose)
Write-Host "uploading files to Unraid ($UNRAID_IP)..." -ForegroundColor Yellow
scp $TAR_NAME docker-compose.prod.yml "$UNRAID_USER@$UNRAID_IP`:$UNRAID_PATH"
if ($LASTEXITCODE -ne 0) { Write-Error "Transfer failed"; exit 1 }

# 4. SSH Commands (Load & Restart)
Write-Host "🔄 Restarting service on Unraid..." -ForegroundColor Yellow
ssh "$UNRAID_USER@$UNRAID_IP" "cd $UNRAID_PATH && docker load -i $TAR_NAME && docker compose -f docker-compose.prod.yml up -d --force-recreate app"
if ($LASTEXITCODE -ne 0) { Write-Error "Remote command failed"; exit 1 }

# 5. Cleanup
Write-Host "🧹 Cleaning up local artifacts..." -ForegroundColor Yellow
Remove-Item $TAR_NAME

Write-Host "✅ Deployment Complete!" -ForegroundColor Green
