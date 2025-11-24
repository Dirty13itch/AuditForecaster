#!/bin/bash

# Production Deployment Script
# Automates the production deployment process

set -e

echo "🚀 Starting production deployment..."

# Step 1: Pre-deployment checks
echo "📋 Running pre-deployment checks..."

# Check if on main branch
CURRENT_BRANCH=$(git branch --show-current)
if [ "$CURRENT_BRANCH" != "main" ]; then
    echo "❌ Error: Must be on main branch. Currently on: $CURRENT_BRANCH"
    exit 1
fi

# Check for uncommitted changes
if [[ -n $(git status -s) ]]; then
    echo "❌ Error: You have uncommitted changes"
    exit 1
fi

# Pull latest changes
echo "📥 Pulling latest changes..."
git pull origin main

# Step 2: Install dependencies
echo "📦 Installing dependencies..."
npm ci

# Step 3: Run tests
echo "🧪 Running tests..."
npm test

# Step 4: Run lint
echo "🔍 Running lint..."
npm run lint

# Step 5: Build application
echo "🏗️  Building application..."
npm run build

# Step 6: Run database migrations
echo "🗄️  Running database migrations..."
./scripts/migrate.sh

# Step 7: Deploy
echo "🚢 Deploying to production..."
if command -v vercel &> /dev/null; then
    vercel --prod
else
    echo "⚠️  Vercel CLI not found. Deploy manually or install with: npm i -g vercel"
    exit 1
fi

# Step 8: Post-deployment verification
echo "✅ Verifying deployment..."
sleep 10 # Wait for deployment to propagate

# Check health endpoint
HEALTH_URL="${NEXTAUTH_URL}/api/health"
HEALTH_STATUS=$(curl -s -o /dev/null -w "%{http_code}" $HEALTH_URL)

if [ "$HEALTH_STATUS" -eq 200 ]; then
    echo "✅ Health check passed!"
else
    echo "❌ Health check failed with status: $HEALTH_STATUS"
    echo "⚠️  Consider rolling back deployment"
    exit 1
fi

echo "🎉 Production deployment completed successfully!"
echo "🔗 Application URL: $NEXTAUTH_URL"
echo "📊 Monitor logs with: vercel logs"
