$ErrorActionPreference = "Stop"

$UNRAID_IP = "192.168.1.244"
$UNRAID_USER = "root"
$UNRAID_PATH = "/mnt/user/appdata/fieldinspect"
$IMAGE_NAME = "fieldinspect:latest"
$TAR_NAME = "fieldinspect.tar"

Write-Host "Starting Unraid Deployment..." -ForegroundColor Cyan

# 1. Build Docker Image
Write-Host "Building Docker image..." -ForegroundColor Yellow
docker build -t $IMAGE_NAME .
if ($LASTEXITCODE -ne 0) { Write-Error "Build failed"; exit 1 }

# 2. Save Image to Tar
Write-Host "Saving image to tar..." -ForegroundColor Yellow
docker save -o $TAR_NAME $IMAGE_NAME
if ($LASTEXITCODE -ne 0) { Write-Error "Save failed"; exit 1 }

# 3. Ensure remote directories exist
Write-Host "Preparing Unraid directories..." -ForegroundColor Yellow
ssh "$UNRAID_USER@$UNRAID_IP" "mkdir -p $UNRAID_PATH/postgres $UNRAID_PATH/uploads $UNRAID_PATH/backups"
if ($LASTEXITCODE -ne 0) { Write-Error "Directory creation failed"; exit 1 }

# 4. Transfer Files (Image + Compose + Env)
Write-Host "Uploading files to Unraid ($UNRAID_IP)..." -ForegroundColor Yellow
scp $TAR_NAME docker-compose.prod.yml "$UNRAID_USER@$UNRAID_IP`:$UNRAID_PATH/"
if ($LASTEXITCODE -ne 0) { Write-Error "Transfer failed"; exit 1 }

# Check if .env exists on remote, if not copy .env.example
$envExists = ssh "$UNRAID_USER@$UNRAID_IP" "test -f $UNRAID_PATH/.env && echo yes || echo no"
if ($envExists -eq "no") {
    Write-Host "No .env found on Unraid, copying .env.example..." -ForegroundColor Yellow
    scp .env.example "$UNRAID_USER@$UNRAID_IP`:$UNRAID_PATH/.env"
    Write-Host "IMPORTANT: Edit $UNRAID_PATH/.env on Unraid before first run!" -ForegroundColor Red
}

# 5. SSH Commands (Load & Restart)
Write-Host "Loading image and restarting on Unraid..." -ForegroundColor Yellow
ssh "$UNRAID_USER@$UNRAID_IP" "cd $UNRAID_PATH && docker load -i $TAR_NAME && docker compose -f docker-compose.prod.yml up -d --force-recreate app"
if ($LASTEXITCODE -ne 0) { Write-Error "Remote command failed"; exit 1 }

# 6. Cleanup local tar
Write-Host "Cleaning up..." -ForegroundColor Yellow
Remove-Item $TAR_NAME

# 7. Wait and check health
Write-Host "Waiting for app to start (60s)..." -ForegroundColor Yellow
Start-Sleep -Seconds 60
$health = ssh "$UNRAID_USER@$UNRAID_IP" "wget -qO- http://localhost:3000/api/health 2>/dev/null || echo 'unhealthy'"
Write-Host "Health check: $health" -ForegroundColor Cyan

Write-Host "Deployment Complete! Access at http://${UNRAID_IP}:3000" -ForegroundColor Green
