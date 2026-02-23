# 🐳 Unraid Deployment Guide

**Target**: Self-hosted on Unraid server  
**Method**: Docker container

---

## Prerequisites

On your Unraid server, you need:
- ✅ Docker installed (standard on Unraid)
- ✅ PostgreSQL database (existing `auditforecaster-db` container)
- ✅ Network bridge configured (`auditforecaster-network` recommended)

---

## Step 1: Prepare Dockerfile (On Windows)

Ensure your `Dockerfile` in the project root is optimized for production:

```dockerfile
FROM node:18-alpine AS base

# Install dependencies only when needed
FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

COPY package*.json ./
RUN npm ci

# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Generate Prisma Client
RUN npx prisma generate

# Build Next.js app
ENV NEXT_TELEMETRY_DISABLED 1
RUN npm run build

# Production image
FROM base AS runner
WORKDIR /app

ENV NODE_ENV production
ENV NEXT_TELEMETRY_DISABLED 1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy necessary files
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma

# Create uploads directory
RUN mkdir -p ./public/uploads && chown nextjs:nodejs ./public/uploads

USER nextjs

EXPOSE 3000

ENV PORT 3000
ENV HOSTNAME "0.0.0.0"

CMD ["node", "server.js"]
```

---

## Step 2: Build & Transfer Image

Run these commands in PowerShell from your project root:

```powershell
# 1. Build the image
docker build -t auditforecaster:latest .

# 2. Save image to a tar file
docker save -o auditforecaster.tar auditforecaster:latest

# 3. Transfer to Unraid (replace IP)
scp auditforecaster.tar root@192.168.1.244:/mnt/user/appdata/auditforecaster/
```

---

## Step 3: Deploy on Unraid

SSH into your Unraid server (`ssh root@192.168.1.244`) and run:

### 1. Load the Image
```bash
docker load -i /mnt/user/appdata/auditforecaster/auditforecaster.tar
```

### 2. Create Environment File
```bash
cat > /mnt/user/appdata/auditforecaster/.env.production << 'EOF'
DATABASE_URL=postgresql://auditforecaster:dev_password_change_in_production@192.168.1.244:5432/auditforecaster
NEXTAUTH_URL=http://192.168.1.244:3000
NEXTAUTH_SECRET=$(openssl rand -base64 32)
AUTH_TRUST_HOST=true
NODE_ENV=production
EOF
```

### 3. Run with Docker Compose (Recommended)

Create `docker-compose.yml` in `/mnt/user/appdata/auditforecaster/`:

```yaml
version: '3.8'

services:
  app:
    image: auditforecaster:latest
    container_name: auditforecaster-ui
    ports:
      - "3000:3000"
    env_file:
      - .env.production
    volumes:
      - /mnt/user/appdata/auditforecaster/uploads:/app/public/uploads
    depends_on:
      - db
    restart: unless-stopped
    networks:
      - default

  db:
    image: postgres:14-alpine
    container_name: auditforecaster-db
    environment:
      POSTGRES_USER: auditforecaster
      POSTGRES_PASSWORD: dev_password_change_in_production
      POSTGRES_DB: auditforecaster
    volumes:
      - /mnt/user/appdata/auditforecaster/database:/var/lib/postgresql/data
    restart: unless-stopped
    networks:
      - default

networks:
  default:
    driver: bridge
```

### 4. Start the Stack
```bash
cd /mnt/user/appdata/auditforecaster/
docker-compose up -d
```

---

## Step 4: Run Database Migrations

**Crucial Step**: The database needs to be synced with your schema.

```bash
docker exec -it auditforecaster-ui npx prisma migrate deploy
```

---

## Step 5: Verification

1. **Check Logs**: `docker logs -f auditforecaster-ui`
2. **Health Check**: `curl http://192.168.1.244:3000/api/health`
3. **Browser**: Open `http://192.168.1.244:3000`

---

## Troubleshooting

- **Permission Denied on Uploads**:
  If file uploads fail, fix permissions on the host folder:
  ```bash
  chown -R 1001:1001 /mnt/user/appdata/auditforecaster/uploads
  ```

- **Database Connection Error**:
  Ensure `DATABASE_URL` uses the correct IP or container name (`auditforecaster-db`) if on the same Docker network.
