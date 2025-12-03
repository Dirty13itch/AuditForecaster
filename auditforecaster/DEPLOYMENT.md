# Deployment Guide

This guide explains how to deploy AuditForecaster to a production environment (Unraid, VPS, or any Docker-compatible server).

## Prerequisites
- A server with Docker and Docker Compose installed.
- Access to the GitHub repository.
- A GitHub Personal Access Token (PAT) with `read:packages` scope (if the repo is private).

## 1. Automated Build (CI/CD)
Every time you push to the `main` branch, GitHub Actions will automatically:
1.  Run tests.
2.  Build a Docker image.
3.  Push the image to GitHub Container Registry (GHCR).

Image URL: `ghcr.io/dirty13itch/auditforecaster:latest`

## 2. Server Setup (Unraid / Docker)

### Step 1: Create Project Directory
On your server, create a folder for the project:
```bash
mkdir -p /mnt/user/appdata/auditforecaster
cd /mnt/user/appdata/auditforecaster
```

### Step 2: Download Configuration
Copy the `docker-compose.prod.yml` file to this directory and rename it to `docker-compose.yml`.

### Step 3: Configure Environment (.env)
Create a `.env` file in the same directory with your production secrets:

```bash
# Database Password
POSTGRES_PASSWORD=secure_random_password_here

# App URL (Your domain or IP)
NEXTAUTH_URL=https://audit.yourdomain.com

# Auth Secret (Generate with: openssl rand -base64 32)
NEXTAUTH_SECRET=generate_a_long_secret_string

# Email (Optional)
RESEND_API_KEY=re_123...
EMAIL_FROM=noreply@yourdomain.com
```

### Step 4: Login to Registry (If Private)
If your repository is private, you need to authenticate Docker to pull the image:
```bash
echo "YOUR_GITHUB_PAT" | docker login ghcr.io -u YOUR_GITHUB_USERNAME --password-stdin
```

### Step 5: Start the Application
Run the following command to start the app and database:
```bash
docker compose up -d
```

The application will be available at `http://<server-ip>:3000`.

## 3. Database Management

### Backups
To backup the database:
```bash
docker compose exec db pg_dump -U postgres auditforecaster > backup.sql
```

### Restoring
To restore a backup:
```bash
cat backup.sql | docker compose exec -T db psql -U postgres auditforecaster
```

### Migrations
The application attempts to apply migrations on startup. If you need to run them manually:
```bash
docker compose exec app npx prisma migrate deploy
```

## 4. Updates
To update to the latest version after pushing to GitHub:

```bash
# Pull the latest image
docker compose pull

# Restart containers
docker compose up -d
```
