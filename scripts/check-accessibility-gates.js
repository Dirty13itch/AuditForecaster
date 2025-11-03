#!/usr/bin/env node

/**
 * Accessibility Quality Gates Checker
 * 
 * Parses accessibility audit JSON results and enforces quality gates.
 * Fails the build if violations with severity >= moderate are found.
 * 
 * Exit codes:
 * - 0: All gates passed
 * - 1: Gates failed (violations found)
 * - 2: Error reading audit results
 */

import { readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const AUDIT_RESULTS_PATH = join(__dirname, '../docs/audit-results/accessibility-audit.json');

const SEVERITY_PRIORITY = {
  critical: 4,
  serious: 3,
  moderate: 2,
  minor: 1,
};

const QUALITY_GATES = {
  critical: 0,
  serious: 0,
  moderate: 0,
  minor: 10,
};

function checkAccessibilityGates() {
  console.log('🔍 Checking Accessibility Quality Gates...\n');

  if (!existsSync(AUDIT_RESULTS_PATH)) {
    console.error('❌ Error: Accessibility audit results not found at:', AUDIT_RESULTS_PATH);
    console.error('   Please run accessibility tests first: npm run test:accessibility');
    process.exit(2);
  }

  let auditData;
  try {
    const fileContent = readFileSync(AUDIT_RESULTS_PATH, 'utf-8');
    auditData = JSON.parse(fileContent);
  } catch (error) {
    console.error('❌ Error parsing accessibility audit results:', error.message);
    process.exit(2);
  }

  const { summary, violationsBySeverity } = auditData;

  console.log('📊 Audit Summary:');
  console.log(`   Total Routes: ${summary.totalRoutes}`);
  console.log(`   Scanned: ${summary.routesScanned}`);
  console.log(`   Passed: ${summary.routesPassed}`);
  console.log(`   Failed: ${summary.routesFailed}`);
  console.log(`   Skipped: ${summary.routesSkipped}`);
  console.log(`   Errored: ${summary.routesErrored}\n`);

  console.log('🎯 Violations by Severity:');
  console.log(`   Critical: ${violationsBySeverity.critical} (max allowed: ${QUALITY_GATES.critical})`);
  console.log(`   Serious: ${violationsBySeverity.serious} (max allowed: ${QUALITY_GATES.serious})`);
  console.log(`   Moderate: ${violationsBySeverity.moderate} (max allowed: ${QUALITY_GATES.moderate})`);
  console.log(`   Minor: ${violationsBySeverity.minor} (max allowed: ${QUALITY_GATES.minor})\n`);

  const failures = [];

  if (violationsBySeverity.critical > QUALITY_GATES.critical) {
    failures.push(`Critical violations: ${violationsBySeverity.critical} (exceeds limit of ${QUALITY_GATES.critical})`);
  }
  if (violationsBySeverity.serious > QUALITY_GATES.serious) {
    failures.push(`Serious violations: ${violationsBySeverity.serious} (exceeds limit of ${QUALITY_GATES.serious})`);
  }
  if (violationsBySeverity.moderate > QUALITY_GATES.moderate) {
    failures.push(`Moderate violations: ${violationsBySeverity.moderate} (exceeds limit of ${QUALITY_GATES.moderate})`);
  }
  if (violationsBySeverity.minor > QUALITY_GATES.minor) {
    failures.push(`Minor violations: ${violationsBySeverity.minor} (exceeds limit of ${QUALITY_GATES.minor})`);
  }

  if (failures.length > 0) {
    console.log('❌ Quality Gates FAILED:\n');
    failures.forEach(failure => console.log(`   • ${failure}`));
    console.log('\n📋 Review the accessibility audit report for details:');
    console.log('   docs/ACCESSIBILITY_AUDIT_REPORT.md\n');
    process.exit(1);
  }

  console.log('✅ All Accessibility Quality Gates PASSED!\n');
  process.exit(0);
}

checkAccessibilityGates();
