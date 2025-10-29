#!/usr/bin/env node
/**
 * Database seeding script
 * Usage: tsx server/seeds/index.ts [--clear]
 */

import { seedReportTemplates, clearSeedTemplates } from './reportTemplates';
import { serverLogger } from '../logger';

async function main() {
  const args = process.argv.slice(2);
  const shouldClear = args.includes('--clear');
  
  try {
    if (shouldClear) {
      serverLogger.info('[Seed] Clearing seed data...');
      await clearSeedTemplates();
      serverLogger.info('[Seed] Seed data cleared successfully');
    } else {
      serverLogger.info('[Seed] Seeding database...');
      const result = await seedReportTemplates();
      serverLogger.info(`[Seed] Database seeded successfully: ${result.created} templates created`);
    }
    
    process.exit(0);
  } catch (error) {
    serverLogger.error('[Seed] Seeding failed:', error);
    process.exit(1);
  }
}

main();
