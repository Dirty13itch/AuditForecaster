#!/bin/bash

# Database Migration Script
# This script safely applies database migrations to production

set -e # Exit on error

echo "🔄 Starting database migration process..."

# Load environment variables
if [ -f .env.production ]; then
    export $(cat .env.production | grep -v '^#' | xargs)
fi

# Backup database before migration
echo "📦 Creating database backup..."
BACKUP_FILE="backup_$(date +%Y%m%d_%H%M%S).sql"
pg_dump $DATABASE_URL > "./backups/$BACKUP_FILE"
echo "✅ Backup created: $BACKUP_FILE"

# Show pending migrations
echo "📋 Checking for pending migrations..."
npx prisma migrate status

# Confirm migration
read -p "Do you want to proceed with migration? (yes/no): " confirm

if [ "$confirm" != "yes" ]; then
    echo "❌ Migration cancelled"
    exit 1
fi

# Apply migrations
echo "🚀 Applying migrations..."
npx prisma migrate deploy

# Verify migration
echo "✅ Verifying database state..."
npx prisma migrate status

echo "🎉 Migration completed successfully!"
echo "📦 Backup location: ./backups/$BACKUP_FILE"
