/**
 * Test results reporter for Golden Path tests
 * Appends test execution results to golden-path-report.md
 */

import { writeFileSync, readFileSync, existsSync } from 'fs';
import { join } from 'path';

export interface TestResult {
  testId: string;
  testName: string;
  status: 'passed' | 'failed' | 'skipped';
  duration: number;
  timestamp: string;
  functional: {
    passed: number;
    failed: number;
    total: number;
    details?: string[];
  };
  accessibility: {
    violations: number;
    passes: number;
    score?: number;
    details?: string[];
  };
  performance: {
    score: number;
    lcp?: number;
    cls?: number;
    tbt?: number;
    passed: boolean;
    details?: string[];
  };
  analyticsEvents?: string[];
  auditLogs?: string[];
  errors?: string[];
  notes?: string[];
}

/**
 * Update the golden path report with test results
 */
export function updateGoldenPathReport(result: TestResult): void {
  const reportPath = join(process.cwd(), 'docs', 'product', 'golden-path-report.md');
  
  // Read existing report
  let reportContent = '';
  if (existsSync(reportPath)) {
    reportContent = readFileSync(reportPath, 'utf-8');
  } else {
    console.warn('Golden Path report not found, creating new one');
    reportContent = generateReportTemplate();
  }
  
  // Find the section for this test
  const testSection = `## ${result.testId}:`;
  const sectionIndex = reportContent.indexOf(testSection);
  
  if (sectionIndex === -1) {
    console.error(`Test section not found: ${result.testId}`);
    // Append as new section
    reportContent += generateTestSection(result);
  } else {
    // Update existing section
    reportContent = updateTestSection(reportContent, sectionIndex, result);
  }
  
  // Write updated report
  writeFileSync(reportPath, reportContent, 'utf-8');
  console.log(`✅ Golden Path report updated for ${result.testId}`);
}

/**
 * Update a specific test section in the report
 */
function updateTestSection(content: string, sectionIndex: number, result: TestResult): string {
  // Find the next section or end of file
  const nextSectionIndex = content.indexOf('\n## ', sectionIndex + 1);
  const endIndex = nextSectionIndex !== -1 ? nextSectionIndex : content.length;
  
  // Extract section content
  const sectionContent = content.substring(sectionIndex, endIndex);
  
  // Find and update the "Latest Execution" subsection
  const latestExecPattern = /#### Latest Execution[\s\S]*?(?=###|##|$)/;
  const updatedLatestExec = generateLatestExecutionSection(result);
  
  let updatedSection: string;
  if (latestExecPattern.test(sectionContent)) {
    // Replace existing Latest Execution section
    updatedSection = sectionContent.replace(latestExecPattern, updatedLatestExec);
  } else {
    // Find where to insert (after Results heading)
    const resultsIndex = sectionContent.indexOf('### Results');
    if (resultsIndex !== -1) {
      const insertIndex = sectionContent.indexOf('\n', resultsIndex) + 1;
      updatedSection = 
        sectionContent.substring(0, insertIndex) +
        '\n' + updatedLatestExec +
        sectionContent.substring(insertIndex);
    } else {
      // Append to end of section
      updatedSection = sectionContent + '\n' + updatedLatestExec;
    }
  }
  
  // Update status in header
  const statusPattern = /\*\*Status\*\*: .*/;
  const newStatus = result.status === 'passed' ? '🟢 Passed' : result.status === 'failed' ? '🔴 Failed' : '🟡 Skipped';
  updatedSection = updatedSection.replace(statusPattern, `**Status**: ${newStatus}`);
  
  // Update last executed date
  const lastExecPattern = /\*\*Last Executed\*\*: .*/;
  updatedSection = updatedSection.replace(lastExecPattern, `**Last Executed**: ${result.timestamp}`);
  
  // Update duration
  const durationPattern = /\*\*Duration\*\*: .*/;
  const duration = `${(result.duration / 1000).toFixed(2)}s`;
  updatedSection = updatedSection.replace(durationPattern, `**Duration**: ${duration}`);
  
  // Replace section in content
  return content.substring(0, sectionIndex) + updatedSection + content.substring(endIndex);
}

/**
 * Generate Latest Execution section
 */
function generateLatestExecutionSection(result: TestResult): string {
  const lines: string[] = [];
  
  lines.push('#### Latest Execution');
  lines.push(`**Date**: ${result.timestamp}`);
  lines.push(`**Result**: ${result.status === 'passed' ? '✅ PASSED' : result.status === 'failed' ? '❌ FAILED' : '⚪ SKIPPED'}`);
  lines.push(`**Duration**: ${(result.duration / 1000).toFixed(2)}s`);
  lines.push('');
  
  // Functional results
  lines.push('**Functional**:');
  lines.push(`- Passed: ${result.functional.passed}/${result.functional.total}`);
  lines.push(`- Failed: ${result.functional.failed}/${result.functional.total}`);
  if (result.functional.details && result.functional.details.length > 0) {
    lines.push('- Details:');
    result.functional.details.forEach(detail => {
      lines.push(`  - ${detail}`);
    });
  }
  lines.push('');
  
  // Accessibility results
  lines.push('**Accessibility**:');
  lines.push(`- Violations: ${result.accessibility.violations}`);
  lines.push(`- Passes: ${result.accessibility.passes}`);
  if (result.accessibility.score !== undefined) {
    lines.push(`- Score: ${result.accessibility.score}/100`);
  }
  if (result.accessibility.details && result.accessibility.details.length > 0) {
    lines.push('- Issues:');
    result.accessibility.details.forEach(detail => {
      lines.push(`  - ${detail}`);
    });
  }
  lines.push('');
  
  // Performance results
  lines.push('**Performance**:');
  lines.push(`- Score: ${result.performance.score}/100 ${result.performance.passed ? '✅' : '❌'}`);
  if (result.performance.lcp !== undefined) {
    lines.push(`- LCP: ${(result.performance.lcp / 1000).toFixed(2)}s ${result.performance.lcp < 2500 ? '✅' : '❌'}`);
  }
  if (result.performance.cls !== undefined) {
    lines.push(`- CLS: ${result.performance.cls.toFixed(3)} ${result.performance.cls < 0.1 ? '✅' : '❌'}`);
  }
  if (result.performance.tbt !== undefined) {
    lines.push(`- TBT: ${result.performance.tbt}ms ${result.performance.tbt < 200 ? '✅' : '❌'}`);
  }
  if (result.performance.details && result.performance.details.length > 0) {
    result.performance.details.forEach(detail => {
      lines.push(`- ${detail}`);
    });
  }
  lines.push('');
  
  // Analytics events
  if (result.analyticsEvents && result.analyticsEvents.length > 0) {
    lines.push('**Analytics Events Captured**:');
    result.analyticsEvents.forEach((event, i) => {
      lines.push(`${i + 1}. ${event}`);
    });
    lines.push('');
  }
  
  // Audit logs
  if (result.auditLogs && result.auditLogs.length > 0) {
    lines.push('**Audit Logs Created**:');
    result.auditLogs.forEach((log, i) => {
      lines.push(`${i + 1}. ${log}`);
    });
    lines.push('');
  }
  
  // Errors
  if (result.errors && result.errors.length > 0) {
    lines.push('**Errors**:');
    result.errors.forEach(error => {
      lines.push(`- ${error}`);
    });
    lines.push('');
  }
  
  // Notes
  if (result.notes && result.notes.length > 0) {
    lines.push('**Notes**:');
    result.notes.forEach(note => {
      lines.push(`- ${note}`);
    });
    lines.push('');
  }
  
  return lines.join('\n') + '\n';
}

/**
 * Generate test section for new test
 */
function generateTestSection(result: TestResult): string {
  const lines: string[] = [];
  
  lines.push('');
  lines.push('---');
  lines.push('');
  lines.push(`## ${result.testId}: ${result.testName}`);
  lines.push('');
  lines.push(`**Test File**: \`tests/e2e/golden-path/${result.testId.toLowerCase()}.spec.ts\``);
  lines.push(`**Last Executed**: ${result.timestamp}`);
  lines.push(`**Status**: ${result.status === 'passed' ? '🟢 Passed' : result.status === 'failed' ? '🔴 Failed' : '🟡 Skipped'}`);
  lines.push(`**Duration**: ${(result.duration / 1000).toFixed(2)}s`);
  lines.push('');
  lines.push('### Results');
  lines.push('');
  lines.push(generateLatestExecutionSection(result));
  
  return lines.join('\n');
}

/**
 * Generate report template
 */
function generateReportTemplate(): string {
  return `# Golden Path Test Execution Report

**Last Updated**: ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}  
**Test Framework**: Playwright E2E + Axe Accessibility + Lighthouse Performance  
**Status**: Tests Configured and Running

---

## Overview

This document tracks the execution results of all Golden Path (GP) scenarios that validate the core user journeys of the Energy Auditing Field Application.

**Quality Gates**:
- ✅ **Functional**: All workflow steps complete successfully
- ✅ **Accessible**: Axe accessibility checks pass (WCAG 2.2 AA)
- ✅ **Performant**: Lighthouse performance score ≥ 90
- ✅ **Reliable**: Tests pass consistently (flake rate < 5%)

---
`;
}

/**
 * Create a test result object from test execution
 */
export function createTestResult(
  testId: string,
  testName: string,
  startTime: number
): TestResult {
  return {
    testId,
    testName,
    status: 'skipped',
    duration: Date.now() - startTime,
    timestamp: new Date().toLocaleString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }),
    functional: {
      passed: 0,
      failed: 0,
      total: 0,
      details: []
    },
    accessibility: {
      violations: 0,
      passes: 0,
      details: []
    },
    performance: {
      score: 0,
      passed: false,
      details: []
    },
    analyticsEvents: [],
    auditLogs: [],
    errors: [],
    notes: []
  };
}