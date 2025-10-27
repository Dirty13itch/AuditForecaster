import type { InsertAuditLog } from '@shared/schema';
import type { Request } from 'express';
import { serverLogger } from './logger';
import type { IStorage } from './storage';

interface AuditLogData {
  userId: string;
  action: string;
  resourceType: string;
  resourceId?: string;
  changes?: any;
  metadata?: any;
}

interface UserPrivacyPreferences {
  auditLogging: boolean;
  detailedLogging: boolean;
  sensitiveActions: boolean;
  ipTracking: boolean;
  performanceTracking: boolean;
}

interface AuditConfig {
  requireConsent: boolean;
  defaultOptIn: boolean;
  anonymizeAfterDays?: number;
  sensitiveActions: string[];
  exemptActions: string[]; // Actions that must always be logged for legal/security
}

// Default configuration
const DEFAULT_AUDIT_CONFIG: AuditConfig = {
  requireConsent: true,
  defaultOptIn: false,
  anonymizeAfterDays: 365,
  sensitiveActions: [
    'password_change',
    'email_change',
    'profile_update',
    'payment_info_update',
    'permission_change',
    'data_export',
    'data_delete'
  ],
  exemptActions: [
    'login',
    'logout',
    'failed_login',
    'unauthorized_access',
    'security_alert',
    'terms_acceptance',
    'consent_update'
  ]
};

// Cache for user preferences to avoid frequent DB lookups
const preferencesCache = new Map<string, { preferences: UserPrivacyPreferences; timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// Get user privacy preferences with caching
async function getUserPrivacyPreferences(
  userId: string,
  storage: IStorage
): Promise<UserPrivacyPreferences> {
  // Check cache first
  const cached = preferencesCache.get(userId);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.preferences;
  }

  try {
    // Try to get preferences from storage
    // Note: You may need to add a getUserPrivacyPreferences method to IStorage
    const user = await storage.getUserById(userId);
    
    // Extract privacy preferences from user metadata or use defaults
    const preferences: UserPrivacyPreferences = {
      auditLogging: user?.metadata?.privacyPreferences?.auditLogging ?? DEFAULT_AUDIT_CONFIG.defaultOptIn,
      detailedLogging: user?.metadata?.privacyPreferences?.detailedLogging ?? false,
      sensitiveActions: user?.metadata?.privacyPreferences?.sensitiveActions ?? DEFAULT_AUDIT_CONFIG.defaultOptIn,
      ipTracking: user?.metadata?.privacyPreferences?.ipTracking ?? false,
      performanceTracking: user?.metadata?.privacyPreferences?.performanceTracking ?? false
    };

    // Update cache
    preferencesCache.set(userId, {
      preferences,
      timestamp: Date.now()
    });

    return preferences;
  } catch (error) {
    serverLogger.error('Failed to get user privacy preferences', { error, userId });
    
    // Return most restrictive settings on error
    return {
      auditLogging: false,
      detailedLogging: false,
      sensitiveActions: false,
      ipTracking: false,
      performanceTracking: false
    };
  }
}

// Check if action should be logged based on consent
function shouldLogAction(
  action: string,
  preferences: UserPrivacyPreferences,
  config: AuditConfig = DEFAULT_AUDIT_CONFIG
): { shouldLog: boolean; level: 'full' | 'minimal' | 'anonymized' } {
  // Always log exempt actions (security/legal requirements)
  if (config.exemptActions.includes(action)) {
    return { shouldLog: true, level: 'full' };
  }

  // If consent is not required, log everything
  if (!config.requireConsent) {
    return { shouldLog: true, level: 'full' };
  }

  // Check if user has opted out completely
  if (!preferences.auditLogging) {
    return { shouldLog: false, level: 'minimal' };
  }

  // Check sensitive actions
  if (config.sensitiveActions.includes(action)) {
    if (!preferences.sensitiveActions) {
      return { shouldLog: false, level: 'minimal' };
    }
    return { 
      shouldLog: true, 
      level: preferences.detailedLogging ? 'full' : 'anonymized' 
    };
  }

  // Default behavior for non-sensitive actions
  return { 
    shouldLog: true, 
    level: preferences.detailedLogging ? 'full' : 'minimal' 
  };
}

// Anonymize sensitive data based on logging level
function anonymizeData(
  data: any,
  level: 'full' | 'minimal' | 'anonymized'
): any {
  if (level === 'full') {
    return data;
  }

  if (level === 'anonymized') {
    // Remove or hash sensitive fields
    const anonymized = { ...data };
    
    // List of fields to anonymize
    const sensitiveFields = [
      'email',
      'phone',
      'address',
      'ssn',
      'creditCard',
      'bankAccount',
      'ipAddress',
      'location',
      'deviceId'
    ];

    for (const field of sensitiveFields) {
      if (anonymized[field]) {
        // Simple masking - in production, use proper hashing
        anonymized[field] = '***REDACTED***';
      }
    }

    return anonymized;
  }

  // Minimal logging - only keep essential fields
  const minimal: any = {};
  const allowedFields = ['action', 'resourceType', 'resourceId', 'timestamp'];
  
  for (const field of allowedFields) {
    if (data[field] !== undefined) {
      minimal[field] = data[field];
    }
  }

  return minimal;
}

// Clear preferences cache for a user (call after preference update)
export function clearUserPreferencesCache(userId: string): void {
  preferencesCache.delete(userId);
}

// Clear entire preferences cache
export function clearAllPreferencesCache(): void {
  preferencesCache.clear();
}

// Updated createAuditLog function with consent checking
export async function createAuditLog(
  req: Request,
  data: AuditLogData,
  storage: IStorage,
  config: AuditConfig = DEFAULT_AUDIT_CONFIG
) {
  try {
    // Get user privacy preferences
    const preferences = await getUserPrivacyPreferences(data.userId, storage);

    // Check if we should log this action
    const { shouldLog, level } = shouldLogAction(data.action, preferences, config);

    if (!shouldLog) {
      serverLogger.debug('Audit log skipped due to user privacy preferences', {
        userId: data.userId,
        action: data.action
      });
      return;
    }

    // Prepare IP address based on preferences
    const ipAddress = preferences.ipTracking 
      ? (req.ip || req.socket.remoteAddress || 'unknown')
      : 'opted-out';

    // Prepare user agent
    const userAgent = level === 'full' 
      ? (req.get('user-agent') || 'unknown')
      : 'redacted';

    // Anonymize changes data based on level
    const changes = data.changes ? anonymizeData(data.changes, level) : null;
    const metadata = data.metadata ? anonymizeData(data.metadata, level) : null;

    // Create the audit log
    await storage.createAuditLog({
      userId: data.userId,
      action: data.action,
      resourceType: data.resourceType,
      resourceId: data.resourceId,
      changesJson: changes,
      ipAddress,
      userAgent,
      metadata: {
        ...metadata,
        privacyLevel: level,
        consentGiven: true,
        timestamp: new Date().toISOString()
      },
    });

    serverLogger.info('Audit log created with privacy compliance', {
      action: data.action,
      resourceType: data.resourceType,
      userId: data.userId,
      privacyLevel: level
    });
  } catch (error) {
    serverLogger.error('Failed to create audit log', { error, data });
  }
}

// Export function to update user privacy preferences
export async function updateUserPrivacyPreferences(
  userId: string,
  preferences: Partial<UserPrivacyPreferences>,
  storage: IStorage
): Promise<void> {
  try {
    // Update preferences in storage
    const user = await storage.getUserById(userId);
    if (user) {
      const updatedMetadata = {
        ...user.metadata,
        privacyPreferences: {
          ...(user.metadata?.privacyPreferences || {}),
          ...preferences,
          lastUpdated: new Date().toISOString()
        }
      };

      // Note: You may need to add an updateUserMetadata method to IStorage
      await storage.updateUser(userId, { metadata: updatedMetadata });

      // Clear cache for this user
      clearUserPreferencesCache(userId);

      // Log the preference change (this is an exempt action)
      await createAuditLog(
        {} as Request, // Empty request for internal calls
        {
          userId,
          action: 'consent_update',
          resourceType: 'user_preferences',
          resourceId: userId,
          changes: preferences,
          metadata: { source: 'user_settings' }
        },
        storage
      );

      serverLogger.info('User privacy preferences updated', { userId });
    }
  } catch (error) {
    serverLogger.error('Failed to update user privacy preferences', { error, userId });
    throw error;
  }
}

// Export function to get audit logs with privacy filtering
export async function getAuditLogs(
  requestingUserId: string,
  filters: any,
  storage: IStorage
): Promise<any[]> {
  try {
    // Check if user has permission to view audit logs
    const user = await storage.getUserById(requestingUserId);
    
    if (!user || !['admin', 'manager'].includes(user.role)) {
      // Regular users can only see their own logs
      filters.userId = requestingUserId;
    }

    // Get logs from storage
    const logs = await storage.getAuditLogs(filters);

    // Apply privacy filtering based on viewer's role
    return logs.map(log => {
      // Admins see everything
      if (user?.role === 'admin') {
        return log;
      }

      // Others see redacted version
      return {
        ...log,
        ipAddress: log.ipAddress ? '***.***.***.' + log.ipAddress.split('.').pop() : null,
        userAgent: log.userAgent ? log.userAgent.substring(0, 20) + '...' : null,
        changesJson: log.metadata?.privacyLevel === 'full' ? log.changesJson : null
      };
    });
  } catch (error) {
    serverLogger.error('Failed to get audit logs', { error, requestingUserId });
    throw error;
  }
}

// Export configuration for testing and customization
export { DEFAULT_AUDIT_CONFIG, AuditConfig, UserPrivacyPreferences };
