#!/usr/bin/env node
/**
 * TypeScript Baseline Quality Gate
 * 
 * Enforces that TypeScript errors do not increase beyond the documented baseline.
 * This allows systematic cleanup while preventing new regressions.
 */

import { execSync } from 'child_process';
import { readFileSync, writeFileSync, existsSync } from 'fs';

const BASELINE_FILE = '.ts-error-baseline.json';
const REPORT_FILE = 'ts-error-report.json';

// Current documented baseline (as of Nov 3, 2025)
const DOCUMENTED_BASELINE = 2290;

function runTypeScriptCheck() {
  try {
    execSync('npx tsc --noEmit', { stdio: 'pipe' });
    return { errorCount: 0, output: 'No TypeScript errors found!' };
  } catch (error) {
    const output = error.stdout?.toString() || error.stderr?.toString() || '';
    
    // Count errors by looking for " error TS" pattern
    const errorMatches = output.match(/\berror TS\d+:/g) || [];
    const errorCount = errorMatches.length;
    
    return { errorCount, output };
  }
}

function loadBaseline() {
  if (existsSync(BASELINE_FILE)) {
    try {
      const data = JSON.parse(readFileSync(BASELINE_FILE, 'utf-8'));
      // Use nullish coalescing to preserve intentional 0 baseline (cleanup complete)
      return data.errorCount ?? DOCUMENTED_BASELINE;
    } catch (err) {
      console.warn('⚠️  Failed to load baseline, using documented baseline');
      return DOCUMENTED_BASELINE;
    }
  }
  return DOCUMENTED_BASELINE;
}

function saveReport(errorCount, output, baseline) {
  const report = {
    timestamp: new Date().toISOString(),
    errorCount,
    baseline,
    delta: errorCount - baseline,
    status: errorCount <= baseline ? 'PASS' : 'FAIL',
    truncatedOutput: output.split('\n').slice(0, 100).join('\n') // First 100 lines
  };
  
  writeFileSync(REPORT_FILE, JSON.stringify(report, null, 2));
  return report;
}

function main() {
  console.log('🔍 TypeScript Baseline Quality Gate');
  console.log('====================================\n');
  
  // Load baseline
  const baseline = loadBaseline();
  console.log(`📊 Current baseline: ${baseline} errors`);
  
  // Run TypeScript check
  console.log('🔧 Running TypeScript check...\n');
  const { errorCount, output } = runTypeScriptCheck();
  
  // Save report
  const report = saveReport(errorCount, output, baseline);
  
  // Print results
  console.log('\n📈 Results:');
  console.log(`   Errors found: ${errorCount}`);
  console.log(`   Baseline:     ${baseline}`);
  console.log(`   Delta:        ${report.delta >= 0 ? '+' : ''}${report.delta}`);
  console.log(`   Status:       ${report.status}\n`);
  
  if (errorCount === 0) {
    console.log('🎉 SUCCESS: No TypeScript errors! Tech debt eliminated!');
    process.exit(0);
  } else if (errorCount <= baseline) {
    console.log('✅ PASS: Error count within baseline');
    if (errorCount < baseline) {
      console.log(`\n💡 TIP: You reduced errors by ${baseline - errorCount}!`);
      console.log(`   Consider updating baseline by running:`);
      console.log(`   node scripts/ts-update-baseline.mjs\n`);
    }
    process.exit(0);
  } else {
    console.log('❌ FAIL: TypeScript errors increased!');
    console.log(`\n   New errors introduced: ${report.delta}`);
    console.log('   Please fix new TypeScript errors before merging.\n');
    process.exit(1);
  }
}

main();
