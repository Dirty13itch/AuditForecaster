/**
 * Analytics event tracking helpers for E2E tests
 * Captures and validates analytics events and audit logs
 */

import { Page } from '@playwright/test';

export interface AnalyticsEvent {
  category: string;
  action: string;
  label?: string;
  value?: number;
  timestamp: number;
}

export interface AuditLogEntry {
  action: string;
  entityType: string;
  entityId?: string;
  userId?: string;
  timestamp: number;
  metadata?: Record<string, any>;
}

/**
 * Set up analytics event tracking on a page
 * Intercepts analytics calls and stores them for validation
 */
export async function setupAnalyticsTracking(page: Page): Promise<void> {
  // Inject analytics capture script
  await page.addInitScript(() => {
    // Store original analytics functions
    const originalAnalytics = (window as any).analytics || {};
    const capturedEvents: any[] = [];
    const capturedAuditLogs: any[] = [];
    
    // Override analytics.track
    (window as any).analytics = {
      ...originalAnalytics,
      track: (event: string, properties?: any) => {
        const analyticsEvent = {
          category: 'user_action',
          action: event,
          label: properties?.label,
          value: properties?.value,
          timestamp: Date.now(),
          properties
        };
        capturedEvents.push(analyticsEvent);
        console.log('[Analytics] Event tracked:', analyticsEvent);
        
        // Call original if it exists
        if (originalAnalytics.track) {
          originalAnalytics.track(event, properties);
        }
      },
      page: (name: string, properties?: any) => {
        const pageEvent = {
          category: 'page_view',
          action: name,
          timestamp: Date.now(),
          properties
        };
        capturedEvents.push(pageEvent);
        console.log('[Analytics] Page viewed:', pageEvent);
        
        if (originalAnalytics.page) {
          originalAnalytics.page(name, properties);
        }
      },
      identify: (userId: string, traits?: any) => {
        const identifyEvent = {
          category: 'identify',
          action: userId,
          timestamp: Date.now(),
          traits
        };
        capturedEvents.push(identifyEvent);
        console.log('[Analytics] User identified:', identifyEvent);
        
        if (originalAnalytics.identify) {
          originalAnalytics.identify(userId, traits);
        }
      }
    };
    
    // Store captured events on window for retrieval
    (window as any).__capturedAnalytics = capturedEvents;
    (window as any).__capturedAuditLogs = capturedAuditLogs;
    
    // Intercept console.log for audit log entries
    const originalConsoleLog = console.log;
    console.log = (...args: any[]) => {
      // Check if this is an audit log entry
      const message = args[0];
      if (typeof message === 'string' && message.includes('[Audit]')) {
        try {
          // Parse audit log format
          const auditData = args[1];
          if (auditData) {
            capturedAuditLogs.push({
              ...auditData,
              timestamp: Date.now()
            });
          }
        } catch (e) {
          // Not an audit log, ignore
        }
      }
      
      // Call original console.log
      originalConsoleLog.apply(console, args);
    };
    
    // Also intercept fetch/XHR for audit API calls
    const originalFetch = window.fetch;
    window.fetch = async (url: string | Request, init?: RequestInit) => {
      const response = await originalFetch(url, init);
      
      // Check if this is an audit log API call
      if (typeof url === 'string' && url.includes('/api/audit-logs')) {
        try {
          const clonedResponse = response.clone();
          const data = await clonedResponse.json();
          if (data) {
            capturedAuditLogs.push({
              ...data,
              timestamp: Date.now()
            });
            console.log('[Audit] API log captured:', data);
          }
        } catch (e) {
          // Not valid JSON, ignore
        }
      }
      
      return response;
    };
  });
}

/**
 * Get captured analytics events from the page
 */
export async function getCapturedAnalytics(page: Page): Promise<AnalyticsEvent[]> {
  return await page.evaluate(() => {
    return (window as any).__capturedAnalytics || [];
  });
}

/**
 * Get captured audit logs from the page
 */
export async function getCapturedAuditLogs(page: Page): Promise<AuditLogEntry[]> {
  return await page.evaluate(() => {
    return (window as any).__capturedAuditLogs || [];
  });
}

/**
 * Assert that specific analytics events were fired
 */
export async function assertAnalyticsEvent(
  page: Page, 
  eventAction: string,
  eventCategory?: string
): Promise<boolean> {
  const events = await getCapturedAnalytics(page);
  
  const found = events.find(e => 
    e.action === eventAction && 
    (!eventCategory || e.category === eventCategory)
  );
  
  if (found) {
    console.log(`  ✅ Analytics event found: ${eventAction}`);
    return true;
  } else {
    console.log(`  ❌ Analytics event NOT found: ${eventAction}`);
    console.log(`     Available events: ${events.map(e => e.action).join(', ')}`);
    return false;
  }
}

/**
 * Assert that specific audit log was created
 */
export async function assertAuditLog(
  page: Page,
  action: string,
  entityType: string
): Promise<boolean> {
  const logs = await getCapturedAuditLogs(page);
  
  const found = logs.find(l => 
    l.action === action && 
    l.entityType === entityType
  );
  
  if (found) {
    console.log(`  ✅ Audit log found: ${action} on ${entityType}`);
    return true;
  } else {
    console.log(`  ❌ Audit log NOT found: ${action} on ${entityType}`);
    console.log(`     Available logs: ${logs.map(l => `${l.action}:${l.entityType}`).join(', ')}`);
    return false;
  }
}

/**
 * Clear captured analytics and audit logs
 */
export async function clearCapturedData(page: Page): Promise<void> {
  await page.evaluate(() => {
    (window as any).__capturedAnalytics = [];
    (window as any).__capturedAuditLogs = [];
  });
}

/**
 * Wait for specific analytics event
 */
export async function waitForAnalyticsEvent(
  page: Page,
  eventAction: string,
  timeout: number = 5000
): Promise<AnalyticsEvent | null> {
  const startTime = Date.now();
  
  while (Date.now() - startTime < timeout) {
    const events = await getCapturedAnalytics(page);
    const found = events.find(e => e.action === eventAction);
    
    if (found) {
      return found;
    }
    
    await page.waitForTimeout(100);
  }
  
  return null;
}

/**
 * Format analytics events for reporting
 */
export function formatAnalyticsEvents(events: AnalyticsEvent[]): string {
  const lines: string[] = [];
  
  lines.push('### Analytics Events Captured');
  lines.push('');
  
  if (events.length === 0) {
    lines.push('No analytics events captured');
  } else {
    events.forEach((event, index) => {
      lines.push(`${index + 1}. **${event.action}** (${event.category})`);
      if (event.label) lines.push(`   Label: ${event.label}`);
      if (event.value) lines.push(`   Value: ${event.value}`);
    });
  }
  
  return lines.join('\n');
}

/**
 * Format audit logs for reporting
 */
export function formatAuditLogs(logs: AuditLogEntry[]): string {
  const lines: string[] = [];
  
  lines.push('### Audit Logs Captured');
  lines.push('');
  
  if (logs.length === 0) {
    lines.push('No audit logs captured');
  } else {
    logs.forEach((log, index) => {
      lines.push(`${index + 1}. **${log.action}** on ${log.entityType}`);
      if (log.entityId) lines.push(`   Entity ID: ${log.entityId}`);
      if (log.userId) lines.push(`   User ID: ${log.userId}`);
      if (log.metadata) lines.push(`   Metadata: ${JSON.stringify(log.metadata)}`);
    });
  }
  
  return lines.join('\n');
}