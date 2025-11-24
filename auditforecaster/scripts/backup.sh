#!/bin/bash

# Automated Database Backup Script
# Run this daily via cron: 0 2 * * * /path/to/backup.sh

set -e

echo "📦 Starting database backup..."

# Configuration
BACKUP_DIR="./backups"
RETENTION_DAYS=30
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/auditforecaster_$DATE.sql"

# Create backup directory if it doesn't exist
mkdir -p $BACKUP_DIR

# Load environment variables
if [ -f .env.production ]; then
    export $(cat .env.production | grep -v '^#' | xargs)
fi

# Create backup
echo "📥 Creating backup: $BACKUP_FILE"
pg_dump $DATABASE_URL > $BACKUP_FILE

# Compress backup
echo "🗜️  Compressing backup..."
gzip $BACKUP_FILE

# Delete old backups
echo "🗑️  Removing backups older than $RETENTION_DAYS days..."
find $BACKUP_DIR -name "*.sql.gz" -mtime +$RETENTION_DAYS -delete

# Get backup size
BACKUP_SIZE=$(du -h "$BACKUP_FILE.gz" | cut -f1)

echo "✅ Backup completed successfully!"
echo "📊 Backup size: $BACKUP_SIZE"
echo "📁 Location: $BACKUP_FILE.gz"

# Optional: Upload to cloud storage (uncomment and configure)
# aws s3 cp "$BACKUP_FILE.gz" s3://your-bucket/backups/
# echo "☁️  Backup uploaded to S3"
