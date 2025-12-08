# AuditForecaster Deployment Guide

Complete guide to deploy AuditForecaster on Unraid or any Docker-compatible server.

## What's Included

The production stack includes:
- **Application**: Next.js app with automatic migrations
- **PostgreSQL**: Database with daily automated backups
- **Redis**: Queue processing and caching
- **Nginx Proxy Manager**: SSL/HTTPS with Let's Encrypt
- **Uptime Kuma**: Health monitoring and alerts
- **Watchtower**: Automatic container updates

## Quick Start (5 Minutes)

### 1. SSH into your Unraid server

```bash
ssh root@YOUR_UNRAID_IP
```

### 2. Create project directory

```bash
mkdir -p /mnt/user/appdata/auditforecaster
cd /mnt/user/appdata/auditforecaster
```

### 3. Download configuration files

```bash
# Download docker-compose and env template
curl -O https://raw.githubusercontent.com/Dirty13itch/AuditForecaster/main/auditforecaster/docker-compose.prod.yml
curl -O https://raw.githubusercontent.com/Dirty13itch/AuditForecaster/main/auditforecaster/.env.example
curl -O https://raw.githubusercontent.com/Dirty13itch/AuditForecaster/main/auditforecaster/scripts/setup-unraid.sh
```

### 4. Run setup script

```bash
chmod +x setup-unraid.sh
./setup-unraid.sh
```

The script will:
- Create all necessary directories
- Generate secure passwords and secrets
- Pull Docker images
- Start all services

### 5. Configure your domain

1. Open Nginx Proxy Manager: `http://YOUR_IP:81`
2. Login with: `admin@example.com` / `changeme`
3. Change the default password
4. Add a Proxy Host:
   - Domain: `audit.ulrichenergyauditing.com`
   - Forward to: `app:3000`
   - Enable SSL with Let's Encrypt

---

## Manual Setup

If you prefer manual setup or the script doesn't work:

### Step 1: Create directories

```bash
mkdir -p /mnt/user/appdata/auditforecaster/{postgres,redis,uploads,backups,nginx/data,nginx/letsencrypt,uptime-kuma}
```

### Step 2: Create .env file

```bash
cp .env.example .env
nano .env  # Edit with your values
```

**Required values:**
```bash
# Generate these with: openssl rand -base64 32
POSTGRES_PASSWORD=your_secure_password
NEXTAUTH_SECRET=your_32_char_secret
NEXTAUTH_URL=https://audit.ulrichenergyauditing.com
```

### Step 3: Start services

```bash
docker compose -f docker-compose.prod.yml up -d
```

---

## Environment Variables Reference

### Required

| Variable | Description | Example |
|----------|-------------|---------|
| `POSTGRES_PASSWORD` | Database password | `openssl rand -base64 24` |
| `NEXTAUTH_URL` | Public URL of app | `https://audit.ulrichenergyauditing.com` |
| `NEXTAUTH_SECRET` | Auth encryption key | `openssl rand -base64 32` |

### Email (Recommended)

| Variable | Description | Example |
|----------|-------------|---------|
| `RESEND_API_KEY` | Resend.com API key | `re_xxxxx` |
| `EMAIL_FROM` | From address | `"Ulrich Energy <noreply@ulrichenergyauditing.com>"` |
| `ADMIN_NOTIFICATION_EMAIL` | Admin notifications | `shaun.ulrich@ulrichenergyauditing.com` |

### Google Integration

| Variable | Description | How to Get |
|----------|-------------|------------|
| `GOOGLE_CLIENT_ID` | OAuth client ID | [Google Cloud Console](https://console.cloud.google.com) |
| `GOOGLE_CLIENT_SECRET` | OAuth client secret | Same as above |

Project owner: `shaun.ulrich@ulrichenergyauditing.com`

### Monitoring

| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_SENTRY_DSN` | Sentry error tracking DSN |

### Webhooks

| Variable | Description |
|----------|-------------|
| `SUPPLYPRO_WEBHOOK_SECRET` | SupplyPro signature verification |
| `GOOGLE_CALENDAR_WEBHOOK_TOKEN` | Calendar push notifications |

---

## Access Points

After deployment, access these URLs (replace with your server IP):

| Service | URL | Purpose |
|---------|-----|---------|
| **App** | http://IP:3000 | Main application |
| **Nginx Admin** | http://IP:81 | SSL/proxy configuration |
| **Uptime Kuma** | http://IP:3001 | Monitoring dashboard |

---

## Setting Up SSL (HTTPS)

1. **Open Nginx Proxy Manager**: http://YOUR_IP:81

2. **Login**: `admin@example.com` / `changeme`

3. **Add Proxy Host**:
   - Domain Names: `audit.ulrichenergyauditing.com`
   - Scheme: `http`
   - Forward Hostname/IP: `app`
   - Forward Port: `3000`
   - Enable: "Block Common Exploits"

4. **SSL Tab**:
   - Request new SSL Certificate
   - Enable "Force SSL"
   - Enable "HTTP/2 Support"
   - Agree to Let's Encrypt terms

5. **Update .env**:
   ```bash
   NEXTAUTH_URL=https://audit.ulrichenergyauditing.com
   ```

6. **Restart app**:
   ```bash
   docker compose -f docker-compose.prod.yml restart app
   ```

---

## Setting Up Monitoring

1. **Open Uptime Kuma**: http://YOUR_IP:3001

2. **Create account** on first visit

3. **Add monitors**:
   - **App Health**: `http://app:3000/api/health` (HTTP)
   - **Database**: `postgres:5432` (TCP)
   - **Redis**: `redis:6379` (TCP)

4. **Set up notifications** (optional):
   - Email, Slack, Discord, etc.

---

## Database Management

### View Backups
```bash
ls -la /mnt/user/appdata/auditforecaster/backups/
```

### Manual Backup
```bash
docker exec auditforecaster-db pg_dump -U auditforecaster auditforecaster > backup-$(date +%Y%m%d).sql
```

### Restore from Backup
```bash
# Stop the app first
docker compose -f docker-compose.prod.yml stop app

# Restore
cat backup.sql | docker exec -i auditforecaster-db psql -U auditforecaster auditforecaster

# Start the app
docker compose -f docker-compose.prod.yml start app
```

### Run Migrations Manually
```bash
docker exec auditforecaster-app npx prisma migrate deploy
```

---

## Updating

### Automatic Updates (via Watchtower)
Updates happen automatically every 24 hours for the app container.

### Manual Update
```bash
cd /mnt/user/appdata/auditforecaster
docker compose -f docker-compose.prod.yml pull
docker compose -f docker-compose.prod.yml up -d
```

---

## Troubleshooting

### View Logs
```bash
# All services
docker compose -f docker-compose.prod.yml logs -f

# Specific service
docker compose -f docker-compose.prod.yml logs -f app
```

### Check Health
```bash
curl http://localhost:3000/api/health
```

### Restart Services
```bash
# Restart everything
docker compose -f docker-compose.prod.yml restart

# Restart just the app
docker compose -f docker-compose.prod.yml restart app
```

### Database Connection Issues
```bash
# Check if database is running
docker exec auditforecaster-db pg_isready -U auditforecaster

# Check database logs
docker logs auditforecaster-db
```

### Container Not Starting
```bash
# Check container status
docker compose -f docker-compose.prod.yml ps

# Check why it failed
docker logs auditforecaster-app
```

---

## Security Checklist

- [ ] Changed Nginx Proxy Manager default password
- [ ] Set strong POSTGRES_PASSWORD
- [ ] Set strong NEXTAUTH_SECRET (32+ chars)
- [ ] SSL/HTTPS enabled via Nginx Proxy Manager
- [ ] Firewall configured (only 80, 443 exposed)
- [ ] ENABLE_E2E_AUTH_BYPASS is NOT set
- [ ] Regular backups verified working

---

## Architecture Overview

```
                    ┌─────────────────────────────────────────┐
                    │            Unraid Server                 │
                    │                                          │
   Internet ───────►│  ┌─────────────────────────────────┐   │
                    │  │    Nginx Proxy Manager          │   │
                    │  │    (SSL/HTTPS - Port 80/443)    │   │
                    │  └─────────────┬───────────────────┘   │
                    │                │                        │
                    │                ▼                        │
                    │  ┌─────────────────────────────────┐   │
                    │  │    AuditForecaster App          │   │
                    │  │    (Next.js - Port 3000)        │   │
                    │  └─────────┬───────────┬───────────┘   │
                    │            │           │                │
                    │            ▼           ▼                │
                    │  ┌─────────────┐ ┌─────────────┐       │
                    │  │  PostgreSQL │ │    Redis    │       │
                    │  │  (Database) │ │   (Cache)   │       │
                    │  └──────┬──────┘ └─────────────┘       │
                    │         │                               │
                    │         ▼                               │
                    │  ┌─────────────┐                       │
                    │  │   Backup    │                       │
                    │  │  (Daily)    │                       │
                    │  └─────────────┘                       │
                    │                                          │
                    │  ┌─────────────┐ ┌─────────────┐       │
                    │  │Uptime Kuma │ │ Watchtower  │       │
                    │  │(Monitoring) │ │ (Updates)   │       │
                    │  └─────────────┘ └─────────────┘       │
                    └─────────────────────────────────────────┘
```

---

## Support

- **Issues**: https://github.com/Dirty13itch/AuditForecaster/issues
- **Email**: shaun.ulrich@ulrichenergyauditing.com
