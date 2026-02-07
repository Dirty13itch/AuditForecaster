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

# 3. Ensure remote directories exist (required for bind-mount volumes)
Write-Host "Preparing Unraid directories..." -ForegroundColor Yellow
ssh "$UNRAID_USER@$UNRAID_IP" "mkdir -p $UNRAID_PATH/postgres $UNRAID_PATH/uploads $UNRAID_PATH/backups"
if ($LASTEXITCODE -ne 0) { Write-Error "Directory creation failed"; exit 1 }

# 4. Transfer Files (Image + Compose)
Write-Host "Uploading files to Unraid ($UNRAID_IP)..." -ForegroundColor Yellow
scp $TAR_NAME docker-compose.prod.yml "$UNRAID_USER@$UNRAID_IP`:$UNRAID_PATH/"
if ($LASTEXITCODE -ne 0) { Write-Error "Transfer failed"; exit 1 }

# 5. Handle .env file
$envExists = ssh "$UNRAID_USER@$UNRAID_IP" "test -f $UNRAID_PATH/.env && echo yes || echo no"
if ($envExists.Trim() -eq "no") {
    Write-Host "No .env found on Unraid - creating from template..." -ForegroundColor Yellow
    scp .env.example "$UNRAID_USER@$UNRAID_IP`:$UNRAID_PATH/.env"

    # Generate secrets automatically
    Write-Host "Generating secrets..." -ForegroundColor Yellow
    $pgPass = ssh "$UNRAID_USER@$UNRAID_IP" "openssl rand -base64 24"
    $authSecret = ssh "$UNRAID_USER@$UNRAID_IP" "openssl rand -base64 32"
    ssh "$UNRAID_USER@$UNRAID_IP" @"
cd $UNRAID_PATH
sed -i 's|POSTGRES_PASSWORD=CHANGE_ME_GENERATE_STRONG_PASSWORD|POSTGRES_PASSWORD=$pgPass|' .env
sed -i 's|NEXTAUTH_SECRET=CHANGE_ME_GENERATE_32_CHAR_SECRET|NEXTAUTH_SECRET=$authSecret|' .env
sed -i 's|NEXTAUTH_URL=https://app.fieldinspect.com|NEXTAUTH_URL=http://${UNRAID_IP}:3000|' .env
"@
    Write-Host "Secrets generated and .env configured for LAN access" -ForegroundColor Green
}

# 6. Load image and start ALL services
Write-Host "Loading image and starting services on Unraid..." -ForegroundColor Yellow
ssh "$UNRAID_USER@$UNRAID_IP" "cd $UNRAID_PATH && docker load -i $TAR_NAME && docker compose -f docker-compose.prod.yml up -d"
if ($LASTEXITCODE -ne 0) { Write-Error "Remote command failed"; exit 1 }

# 7. Cleanup local tar
Write-Host "Cleaning up..." -ForegroundColor Yellow
Remove-Item $TAR_NAME

# 8. Wait and check health
Write-Host "Waiting for app to start (45s)..." -ForegroundColor Yellow
Start-Sleep -Seconds 45

$maxRetries = 4
for ($i = 1; $i -le $maxRetries; $i++) {
    $health = ssh "$UNRAID_USER@$UNRAID_IP" "wget -qO- http://localhost:3000/api/health 2>/dev/null"
    if ($health -match "healthy") {
        Write-Host "Health check passed: $health" -ForegroundColor Green
        break
    }
    if ($i -lt $maxRetries) {
        Write-Host "Not ready yet, retrying in 15s... ($i/$maxRetries)" -ForegroundColor Yellow
        Start-Sleep -Seconds 15
    } else {
        Write-Host "WARNING: Health check not passing yet. Check logs with:" -ForegroundColor Red
        Write-Host "  ssh $UNRAID_USER@$UNRAID_IP 'cd $UNRAID_PATH && docker compose -f docker-compose.prod.yml logs app'" -ForegroundColor Yellow
    }
}

Write-Host ""
Write-Host "Deployment Complete!" -ForegroundColor Green
Write-Host "Access at: http://${UNRAID_IP}:3000" -ForegroundColor Cyan
Write-Host "Login: shaun@fieldinspect.com / password123" -ForegroundColor Cyan
Write-Host ""
Write-Host "Useful commands:" -ForegroundColor Gray
Write-Host "  Logs:    ssh $UNRAID_USER@$UNRAID_IP 'cd $UNRAID_PATH && docker compose -f docker-compose.prod.yml logs -f app'" -ForegroundColor Gray
Write-Host "  Stop:    ssh $UNRAID_USER@$UNRAID_IP 'cd $UNRAID_PATH && docker compose -f docker-compose.prod.yml down'" -ForegroundColor Gray
Write-Host "  Restart: ssh $UNRAID_USER@$UNRAID_IP 'cd $UNRAID_PATH && docker compose -f docker-compose.prod.yml restart app'" -ForegroundColor Gray
