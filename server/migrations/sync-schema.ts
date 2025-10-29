/**
 * Non-Interactive Schema Sync Script
 * 
 * Adds missing columns to synchronize database with Drizzle schema.
 * Safe to run multiple times (uses IF NOT EXISTS).
 * 
 * Run with: tsx server/migrations/sync-schema.ts
 * 
 * Created: Oct 29, 2025
 * Reason: Resolve schema drift without interactive prompts
 */

import { db } from '../db';
import { sql } from 'drizzle-orm';

async function syncSchema() {
  console.log('🔄 Starting non-interactive schema sync...\n');

  try {
    // Add missing columns to unmatched_calendar_events
    console.log('📋 Adding missing columns to unmatched_calendar_events...');
    await db.execute(sql`
      ALTER TABLE unmatched_calendar_events 
        ADD COLUMN IF NOT EXISTS suggested_inspector_id varchar REFERENCES users(id) ON DELETE SET NULL,
        ADD COLUMN IF NOT EXISTS suggested_builder_id varchar REFERENCES builders(id) ON DELETE SET NULL,
        ADD COLUMN IF NOT EXISTS suggested_inspection_type text,
        ADD COLUMN IF NOT EXISTS parsed_address text,
        ADD COLUMN IF NOT EXISTS urgency_level text DEFAULT 'medium'
    `);
    console.log('✅ unmatched_calendar_events columns added\n');

    // Add missing columns to duct_leakage_tests
    console.log('📋 Adding missing columns to duct_leakage_tests...');
    await db.execute(sql`
      ALTER TABLE duct_leakage_tests
        ADD COLUMN IF NOT EXISTS system_type text
    `);
    console.log('✅ duct_leakage_tests columns added\n');

    console.log('✅ Schema sync complete!\n');
    console.log('Run tests to verify: npm test');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Schema sync failed:', error);
    process.exit(1);
  }
}

syncSchema();
