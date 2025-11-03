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
 * Imported from schema - represents valid user roles from the database.
 * Source of truth: shared/schema.ts users.role enum
 * 
 * Roles:
 * - admin: System administrator with full control
 * - inspector: Field inspector conducting energy audits
 * - partner_contractor: Builder/contractor partner with limited access
 */
export type { User, UserRole } from './schema';

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
