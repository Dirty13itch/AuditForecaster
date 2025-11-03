#!/usr/bin/env node

/**
 * Lighthouse Performance Quality Gates Checker
 * 
 * Parses Lighthouse CI results and enforces quality gates.
 * Fails the build if any score falls below the defined thresholds.
 * 
 * Quality Thresholds:
 * - Performance: >= 90
 * - Accessibility: >= 95
 * - Best Practices: >= 90
 * - SEO: >= 90
 * 
 * Exit codes:
 * - 0: All gates passed
 * - 1: Gates failed (scores below threshold)
 * - 2: Error reading Lighthouse results
 */

import { readFileSync, existsSync, readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const LIGHTHOUSE_RESULTS_DIR = join(__dirname, '../.lighthouseci');

const QUALITY_GATES = {
  performance: 90,
  accessibility: 95,
  'best-practices': 90,
  seo: 90,
};

function findLighthouseResults() {
  if (!existsSync(LIGHTHOUSE_RESULTS_DIR)) {
    console.error('❌ Error: Lighthouse results directory not found at:', LIGHTHOUSE_RESULTS_DIR);
    return [];
  }

  const files = readdirSync(LIGHTHOUSE_RESULTS_DIR);
  const manifestFiles = files.filter(f => f.startsWith('manifest') && f.endsWith('.json'));
  
  if (manifestFiles.length === 0) {
    console.error('❌ Error: No Lighthouse manifest files found');
    return [];
  }

  const manifestPath = join(LIGHTHOUSE_RESULTS_DIR, manifestFiles[0]);
  const manifest = JSON.parse(readFileSync(manifestPath, 'utf-8'));
  
  return manifest.map(entry => {
    const resultPath = join(LIGHTHOUSE_RESULTS_DIR, entry.jsonPath);
    return JSON.parse(readFileSync(resultPath, 'utf-8'));
  });
}

function checkLighthouseGates() {
  console.log('🔍 Checking Lighthouse Performance Quality Gates...\n');

  const results = findLighthouseResults();

  if (results.length === 0) {
    console.error('❌ Error: No Lighthouse results found');
    console.error('   Please run Lighthouse CI first');
    process.exit(2);
  }

  console.log(`📊 Analyzing ${results.length} Lighthouse audits...\n`);

  let allPassed = true;
  const failuresByUrl = new Map();

  for (const result of results) {
    const url = result.finalUrl || result.requestedUrl;
    const scores = {};
    
    for (const [category, data] of Object.entries(result.categories)) {
      scores[category] = Math.round(data.score * 100);
    }

    console.log(`🌐 URL: ${url}`);
    console.log(`   Performance: ${scores.performance}/100 ${scores.performance >= QUALITY_GATES.performance ? '✅' : '❌'}`);
    console.log(`   Accessibility: ${scores.accessibility}/100 ${scores.accessibility >= QUALITY_GATES.accessibility ? '✅' : '❌'}`);
    console.log(`   Best Practices: ${scores['best-practices']}/100 ${scores['best-practices'] >= QUALITY_GATES['best-practices'] ? '✅' : '❌'}`);
    console.log(`   SEO: ${scores.seo}/100 ${scores.seo >= QUALITY_GATES.seo ? '✅' : '❌'}\n`);

    const failures = [];

    if (scores.performance < QUALITY_GATES.performance) {
      failures.push(`Performance: ${scores.performance} (minimum: ${QUALITY_GATES.performance})`);
    }
    if (scores.accessibility < QUALITY_GATES.accessibility) {
      failures.push(`Accessibility: ${scores.accessibility} (minimum: ${QUALITY_GATES.accessibility})`);
    }
    if (scores['best-practices'] < QUALITY_GATES['best-practices']) {
      failures.push(`Best Practices: ${scores['best-practices']} (minimum: ${QUALITY_GATES['best-practices']})`);
    }
    if (scores.seo < QUALITY_GATES.seo) {
      failures.push(`SEO: ${scores.seo} (minimum: ${QUALITY_GATES.seo})`);
    }

    if (failures.length > 0) {
      allPassed = false;
      failuresByUrl.set(url, failures);
    }
  }

  if (!allPassed) {
    console.log('❌ Quality Gates FAILED:\n');
    
    for (const [url, failures] of failuresByUrl.entries()) {
      console.log(`   ${url}:`);
      failures.forEach(failure => console.log(`      • ${failure}`));
      console.log('');
    }
    
    console.log('📋 Review the Lighthouse reports for detailed recommendations\n');
    process.exit(1);
  }

  console.log('✅ All Lighthouse Quality Gates PASSED!\n');
  process.exit(0);
}

checkLighthouseGates();
