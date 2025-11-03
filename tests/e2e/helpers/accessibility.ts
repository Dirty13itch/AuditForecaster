/**
 * Accessibility testing helpers using Axe-core
 * Provides WCAG 2.2 AA compliance checking
 */

import { Page, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

export interface AxeResults {
  violations: any[];
  passes: any[];
  incomplete: any[];
  inapplicable: any[];
}

/**
 * Run Axe accessibility scan on a page
 * @param page - Playwright page object
 * @param pageName - Name of the page for logging
 * @returns Axe scan results
 */
export async function runAxeScan(
  page: Page, 
  pageName: string
): Promise<AxeResults> {
  console.log(`\n🔍 Running Axe accessibility scan on: ${pageName}`);
  
  try {
    // Wait for page to be fully loaded
    await page.waitForLoadState('networkidle');
    
    // Run Axe scan with WCAG 2.2 AA rules
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
      .analyze();
    
    // Log summary
    console.log(`  ✅ Passes: ${results.passes.length}`);
    console.log(`  ❌ Violations: ${results.violations.length}`);
    console.log(`  ⚠️  Incomplete: ${results.incomplete.length}`);
    console.log(`  ➖ Inapplicable: ${results.inapplicable.length}`);
    
    // Log violations details if any
    if (results.violations.length > 0) {
      console.log('\n  Violations found:');
      results.violations.forEach((violation, index) => {
        console.log(`    ${index + 1}. [${violation.impact}] ${violation.id}: ${violation.description}`);
        console.log(`       Affected elements: ${violation.nodes.length}`);
        violation.nodes.forEach(node => {
          console.log(`         - ${node.target}`);
        });
      });
    }
    
    // Assert no critical or serious violations for WCAG 2.2 AA compliance
    const criticalViolations = results.violations.filter(
      v => v.impact === 'critical' || v.impact === 'serious'
    );
    
    if (criticalViolations.length > 0) {
      console.error(`\n  ❌ FAILED: ${criticalViolations.length} critical/serious violations found`);
    } else {
      console.log(`\n  ✅ PASSED: No critical/serious violations found`);
    }
    
    // Use Playwright assertion for test failure
    expect(criticalViolations.length, 
      `${pageName} has ${criticalViolations.length} critical/serious accessibility violations`
    ).toBe(0);
    
    return results;
    
  } catch (error) {
    console.error(`  ❌ Error running Axe scan: ${error}`);
    throw error;
  }
}

/**
 * Check specific WCAG criteria
 */
export async function checkWCAGCriteria(
  page: Page,
  criteria: string[]
): Promise<boolean> {
  const results = await new AxeBuilder({ page })
    .withTags(criteria)
    .analyze();
  
  return results.violations.length === 0;
}

/**
 * Get accessibility tree for debugging
 */
export async function getAccessibilityTree(page: Page): Promise<any> {
  const snapshot = await page.accessibility.snapshot();
  return snapshot;
}

/**
 * Check keyboard navigation
 */
export async function checkKeyboardNavigation(
  page: Page,
  elements: string[]
): Promise<boolean> {
  let allAccessible = true;
  
  for (const selector of elements) {
    try {
      // Tab to element
      await page.keyboard.press('Tab');
      
      // Check if element is focused
      const isFocused = await page.evaluate((sel) => {
        const element = document.querySelector(sel);
        return element === document.activeElement;
      }, selector);
      
      if (!isFocused) {
        console.log(`  ⚠️ Element not keyboard accessible: ${selector}`);
        allAccessible = false;
      }
    } catch (error) {
      console.log(`  ❌ Error checking keyboard navigation for ${selector}: ${error}`);
      allAccessible = false;
    }
  }
  
  return allAccessible;
}

/**
 * Check color contrast
 */
export async function checkColorContrast(page: Page): Promise<boolean> {
  const results = await new AxeBuilder({ page })
    .withTags(['cat.color'])
    .analyze();
  
  return results.violations.length === 0;
}

/**
 * Format Axe results for reporting
 */
export function formatAxeResults(results: AxeResults, pageName: string): string {
  const lines: string[] = [];
  
  lines.push(`### Accessibility Results: ${pageName}`);
  lines.push('');
  lines.push(`- **Passes**: ${results.passes.length}`);
  lines.push(`- **Violations**: ${results.violations.length}`);
  lines.push(`- **Incomplete**: ${results.incomplete.length}`);
  lines.push(`- **Inapplicable**: ${results.inapplicable.length}`);
  
  if (results.violations.length > 0) {
    lines.push('');
    lines.push('**Violations:**');
    results.violations.forEach(violation => {
      lines.push(`- [${violation.impact}] ${violation.id}: ${violation.description}`);
      lines.push(`  - Affected elements: ${violation.nodes.length}`);
    });
  }
  
  return lines.join('\n');
}