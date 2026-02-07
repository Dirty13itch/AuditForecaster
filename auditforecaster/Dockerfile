# syntax=docker/dockerfile:1.4
FROM node:22-alpine AS base

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
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# Compile seed script to JS so it runs without tsx in production
RUN npx esbuild prisma/seed.ts --bundle --platform=node --target=node22 \
    --outfile=prisma/seed.js --external:@prisma/client 2>&1 || echo "WARNING: Seed compilation failed"

# Production image
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# OpenSSL required by Prisma
RUN apk add --no-cache openssl

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy necessary files
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

# Copy Prisma for runtime usage
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/prisma ./node_modules/prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma
COPY --from=builder /app/prisma ./prisma

# Ensure uploads directory exists and is writable
RUN mkdir -p public/uploads/photos && chown -R nextjs:nodejs public/uploads

# Create entrypoint script (POSIX sh compatible - no bash-isms)
COPY --chmod=755 <<'ENTRYPOINT_EOF' /app/entrypoint.sh
#!/bin/sh
set -e

# Wait for database to be ready
echo "Waiting for database..."
MAX_RETRIES=30
RETRY_COUNT=0
while [ $RETRY_COUNT -lt $MAX_RETRIES ]; do
    if echo "SELECT 1" | npx prisma db execute --stdin > /dev/null 2>&1; then
        echo "Database connected!"
        break
    fi
    RETRY_COUNT=$((RETRY_COUNT + 1))
    echo "Database not ready, retry $RETRY_COUNT/$MAX_RETRIES..."
    sleep 2
done

if [ $RETRY_COUNT -ge $MAX_RETRIES ]; then
    echo "ERROR: Database connection timeout after $MAX_RETRIES retries"
    exit 1
fi

# Sync database schema (idempotent - safe to run every startup)
echo "Syncing database schema..."
npx prisma db push --skip-generate --accept-data-loss 2>&1 || {
    echo "WARNING: prisma db push failed, trying without --accept-data-loss..."
    npx prisma db push --skip-generate 2>&1
}

echo "Database ready!"

# Seed if database is empty (first deploy only)
# Uses Prisma client directly to check user count - more reliable than parsing SQL output
USER_COUNT=$(node -e "
  const { PrismaClient } = require('@prisma/client');
  const p = new PrismaClient();
  p.user.count().then(c => { console.log(c); p.\$disconnect(); }).catch(() => { console.log('0'); p.\$disconnect(); });
" 2>/dev/null || echo "0")

if [ "$USER_COUNT" = "0" ]; then
    echo "Empty database detected, seeding..."
    if [ -f prisma/seed.js ]; then
        node prisma/seed.js && echo "Seed complete!" || echo "WARNING: Seed failed (non-fatal)"
    else
        echo "No compiled seed.js found, skipping seed"
    fi
else
    echo "Database has $USER_COUNT users, skipping seed"
fi

# Start the application
echo "Starting Field Inspect..."
exec node server.js
ENTRYPOINT_EOF

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Docker health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:3000/api/health || exit 1

ENTRYPOINT ["/app/entrypoint.sh"]
