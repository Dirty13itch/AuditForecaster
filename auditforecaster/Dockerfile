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

# Create entrypoint script
COPY --chmod=755 <<EOF /app/entrypoint.sh
#!/bin/sh
set -e

# Wait for database to be ready
echo "Waiting for database..."
MAX_RETRIES=30
RETRY_COUNT=0
until npx prisma db execute --stdin <<< "SELECT 1" 2>/dev/null || [ \$RETRY_COUNT -ge \$MAX_RETRIES ]; do
    RETRY_COUNT=\$((RETRY_COUNT + 1))
    echo "Database not ready, retry \$RETRY_COUNT/\$MAX_RETRIES..."
    sleep 2
done

if [ \$RETRY_COUNT -ge \$MAX_RETRIES ]; then
    echo "ERROR: Database connection timeout"
    exit 1
fi

# Sync database schema
echo "Syncing database schema..."
npx prisma db push --skip-generate

echo "Database ready!"

# Seed if empty (first deploy only)
ROW_COUNT=\$(npx prisma db execute --stdin <<< "SELECT COUNT(*) FROM \"User\"" 2>/dev/null | grep -o '[0-9]*' | head -1 || echo "0")
if [ "\$ROW_COUNT" = "0" ] || [ -z "\$ROW_COUNT" ]; then
    echo "Empty database detected, seeding..."
    npx prisma db seed || echo "Seed skipped (may need ts-node in production)"
fi

# Start the application
echo "Starting Field Inspect..."
exec node server.js
EOF

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Docker health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:3000/api/health || exit 1

ENTRYPOINT ["/app/entrypoint.sh"]
