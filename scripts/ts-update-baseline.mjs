#!/usr/bin/env node
/**
 * Update TypeScript Error Baseline
 * 
 * Run this script after cleaning up TypeScript errors to update the baseline.
 * Requires manual review and approval.
 */

import { execSync } from 'child_process';
import { writeFileSync } from 'fs';
import readline from 'readline';

const BASELINE_FILE = '.ts-error-baseline.json';

function runTypeScriptCheck() {
  try {
    execSync('npx tsc --noEmit', { stdio: 'pipe' });
    return 0;
  } catch (error) {
    const output = error.stdout?.toString() || error.stderr?.toString() || '';
    const errorMatches = output.match(/\berror TS\d+:/g) || [];
    return errorMatches.length;
  }
}

async function confirm(question) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
  
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes');
    });
  });
}

async function main() {
  console.log('🔄 Update TypeScript Baseline');
  console.log('==============================\n');
  
  console.log('🔧 Running TypeScript check...');
  const errorCount = runTypeScriptCheck();
  
  console.log(`\n📊 Current error count: ${errorCount}\n`);
  
  if (errorCount === 0) {
    console.log('🎉 No TypeScript errors! No baseline needed.');
    console.log('   Consider removing the baseline mechanism.\n');
    return;
  }
  
  const confirmed = await confirm(`⚠️  Update baseline to ${errorCount} errors? (y/n): `);
  
  if (!confirmed) {
    console.log('\n❌ Baseline update cancelled.\n');
    return;
  }
  
  const baseline = {
    errorCount,
    updatedAt: new Date().toISOString(),
    updatedBy: process.env.USER || 'unknown',
    note: 'Baseline should trend down over time. Update only after verified cleanup.'
  };
  
  writeFileSync(BASELINE_FILE, JSON.stringify(baseline, null, 2));
  
  console.log('\n✅ Baseline updated successfully!');
  console.log(`   File: ${BASELINE_FILE}`);
  console.log(`   Errors: ${errorCount}\n`);
  console.log('📝 Remember to:');
  console.log('   1. Commit the updated baseline file');
  console.log('   2. Update replit.md tech debt documentation');
  console.log('   3. Document the cleanup work in git commit message\n');
}

main().catch(console.error);
