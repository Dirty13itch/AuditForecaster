import { FeatureMaturity } from '@shared/featureFlags';

export type FieldType = 'text' | 'number' | 'select' | 'radio' | 'checkbox' | 'textarea' | 'date';

export type ConditionalRule = {
  fieldId: string;
  operator: 'equals' | 'notEquals' | 'contains' | 'greaterThan' | 'lessThan' | 'isTrue' | 'isFalse';
  value: string | number | boolean | null;
}

export type FormField = {
  id: string;
  label: string;
  type: FieldType;
  required: boolean;
  options?: string[];
  defaultValue?: string | number | boolean | null;
  conditions?: ConditionalRule[];
}

export type FormSection = {
  id: string;
  title: string;
  description?: string;
  fields: FormField[];
}

export type Role = 'admin' | 'inspector' | 'partner_contractor';

/**
 * User Role Type
 * 
 * Defines all valid user roles based on the roles-matrix.md documentation.
 * Used for route-level access control in navigation registry.
 * 
 * Roles:
 * - admin: System administrator with full control
 * - inspector: Field inspector conducting energy audits
 * - lead: Senior inspector with team oversight (Inspector Lead)
 * - builderviewer: Builder/contractor partner with read-only access (Partner)
 */
export type UserRole = 'admin' | 'inspector' | 'lead' | 'builderviewer';

export interface FeatureStatus {
  path: string;
  title: string;
  category: string;
  maturity: FeatureMaturity;
  goldenPathId?: string;
  allowedRoles: Role[];
  lastGPResult?: {
    status: 'pass' | 'fail' | 'pending' | 'not_run';
    timestamp?: number;
    duration?: number;
    violations?: number;
  };
  metrics?: {
    lighthouse?: { lcp?: number; cls?: number; tbt?: number; score?: number };
    axe?: { violations: number; lastRun?: number };
    coverage?: { lines?: number; branches?: number };
  };
  todos?: string[];
}
