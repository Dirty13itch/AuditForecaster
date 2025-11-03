#!/bin/bash
# M/I Homes Twin Cities AAA Blueprint Seed Script Runner
# This script runs the comprehensive M/I Homes seed data

echo "🏗️ Starting M/I Homes Twin Cities AAA Blueprint Seed..."
echo "=================================================="
echo "This will create:"
echo "✓ 2 Builders (M/I Homes + Ulrich Energy Auditing)"
echo "✓ 5 Communities across Twin Cities"
echo "✓ 50 Jobs with realistic scheduling"
echo "✓ 15 Visits with checklist items"
echo "✓ Photos with EXIF metadata"
echo "✓ QA items with data anomalies"
echo "✓ 45L Tax Credit projects"
echo "=================================================="

# Run the seed script through the main seeder with --mi-homes flag
tsx server/seeds/index.ts --mi-homes

echo "✅ Seed complete! Check the logs above for details."