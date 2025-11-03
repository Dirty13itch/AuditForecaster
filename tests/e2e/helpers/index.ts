/**
 * Central export for all E2E test helpers
 */

// Authentication helpers
export { login, logout, getCurrentUser, TEST_USERS } from './auth';

// Accessibility testing helpers
export { 
  runAxeScan, 
  checkWCAGCriteria, 
  getAccessibilityTree, 
  checkKeyboardNavigation, 
  checkColorContrast,
  formatAxeResults,
  type AxeResults 
} from './accessibility';

// Performance testing helpers
export { 
  runLighthouseCheck, 
  measurePerformance, 
  formatLighthouseResults,
  PERFORMANCE_THRESHOLDS,
  type LighthouseResult 
} from './performance';

// Analytics tracking helpers
export { 
  setupAnalyticsTracking,
  getCapturedAnalytics,
  getCapturedAuditLogs,
  assertAnalyticsEvent,
  assertAuditLog,
  clearCapturedData,
  waitForAnalyticsEvent,
  formatAnalyticsEvents,
  formatAuditLogs,
  type AnalyticsEvent,
  type AuditLogEntry
} from './analytics';

// Test reporter helpers
export {
  updateGoldenPathReport,
  createTestResult,
  type TestResult
} from './reporter';

// Common test utilities
export const BASE_URL = process.env.BASE_URL || 'http://localhost:5000';