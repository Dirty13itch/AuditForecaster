FROM node:22-alpine AS base

# Install dependencies only when needed
FROM base AS deps
RUN apk add --no-cache libc6-compat openssl
WORKDIR /app

# Copy package files AND prisma schema (needed for postinstall prisma generate)
COPY package*.json ./
COPY prisma ./prisma

# Install dependencies (ignore postinstall script, we'll run prisma generate in builder stage)
RUN npm ci --ignore-scripts

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

# Install Puppeteer dependencies and OpenSSL for Prisma
RUN apk add --no-cache \
      chromium \
      nss \
      freetype \
      harfbuzz \
      ca-certificates \
      ttf-freefont \
      openssl

# Tell Puppeteer to use installed Chromium
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy necessary files
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

# Copy Prisma for runtime usage and migrations
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/prisma ./node_modules/prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma
COPY --from=builder /app/prisma ./prisma

# Ensure uploads directory exists and is writable
RUN mkdir -p public/uploads/photos && chown -R nextjs:nodejs public/uploads

# Create entrypoint script for migrations
COPY --chmod=755 <<EOF /app/entrypoint.sh
#!/bin/sh
set -e

# Wait for database to be ready (with timeout)
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

# Run database migrations
echo "Running database migrations..."
npx prisma migrate deploy

echo "Migrations complete!"

# Start the application
echo "Starting application..."
exec node server.js
EOF

USER nextjs

EXPOSE 3000

ENV PORT 3000
ENV HOSTNAME "0.0.0.0"

# Docker health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:3000/api/health || exit 1

# Use entrypoint to run migrations before starting
ENTRYPOINT ["/app/entrypoint.sh"]
