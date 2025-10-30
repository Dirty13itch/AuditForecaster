/**
 * Calendar Visual Design System
 * Inspector-first color coding + job type patterns for rich visual hierarchy
 */

/**
 * Inspector color palette - Primary visual dimension
 */
export const INSPECTOR_COLORS = {
  shaun: {
    background: '#3b82f6', // Royal Blue
    hover: '#2563eb',
    text: '#ffffff',
    border: '#1d4ed8',
    name: 'Shaun',
  },
  erik: {
    background: '#10b981', // Emerald Green
    hover: '#059669',
    text: '#ffffff',
    border: '#047857',
    name: 'Erik',
  },
  pat: {
    background: '#c93132', // Building Knowledge Red
    hover: '#b02829',
    text: '#ffffff',
    border: '#991b1b',
    name: 'Pat',
  },
  unassigned: {
    background: '#6b7280', // Neutral Gray
    hover: '#4b5563',
    text: '#ffffff',
    border: '#374151',
    name: 'Unassigned',
  },
} as const;

/**
 * Get inspector color by user ID or name
 */
export function getInspectorColor(userIdOrName: string | null | undefined): typeof INSPECTOR_COLORS[keyof typeof INSPECTOR_COLORS] {
  if (!userIdOrName) {
    return INSPECTOR_COLORS.unassigned;
  }

  const normalized = userIdOrName.toLowerCase();
  
  if (normalized.includes('shaun')) {
    return INSPECTOR_COLORS.shaun;
  }
  if (normalized.includes('erik')) {
    return INSPECTOR_COLORS.erik;
  }
  if (normalized.includes('pat') || normalized.includes('building knowledge')) {
    return INSPECTOR_COLORS.pat;
  }

  // Default to unassigned if no match
  return INSPECTOR_COLORS.unassigned;
}

/**
 * Get inspector color by assigned user object
 */
export function getInspectorColorByUser(user: { firstName?: string; lastName?: string; email?: string } | null): typeof INSPECTOR_COLORS[keyof typeof INSPECTOR_COLORS] {
  if (!user) {
    return INSPECTOR_COLORS.unassigned;
  }

  const name = `${user.firstName || ''} ${user.lastName || ''}`.trim().toLowerCase();
  const email = (user.email || '').toLowerCase();

  if (name.includes('shaun') || email.includes('shaun')) {
    return INSPECTOR_COLORS.shaun;
  }
  if (name.includes('erik') || email.includes('erik')) {
    return INSPECTOR_COLORS.erik;
  }
  if (name.includes('pat') || email.includes('pat')) {
    return INSPECTOR_COLORS.pat;
  }

  return INSPECTOR_COLORS.unassigned;
}

/**
 * Job type visual configuration - Secondary visual dimension
 */
export const JOB_TYPE_VISUALS = {
  sv2: {
    label: 'SV2',
    fullName: 'Pre-Drywall Site Visit',
    icon: '🔍',
    pattern: 'diagonal-stripes',
    borderStyle: 'dashed',
    borderWidth: '2px',
  },
  full_test: {
    label: 'Test',
    fullName: 'Full Test (Final)',
    icon: '📊',
    pattern: 'solid',
    borderStyle: 'solid',
    borderWidth: '4px',
  },
  code_bdoor: {
    label: 'Code BDoor',
    fullName: 'Code Blower Door',
    icon: '🌪️',
    pattern: 'dots',
    borderStyle: 'dotted',
    borderWidth: '3px',
  },
  rough_duct: {
    label: 'Rough Duct',
    fullName: 'Rough-in Duct Leakage',
    icon: '🔧',
    pattern: 'double-lines',
    borderStyle: 'double',
    borderWidth: '3px',
  },
  rehab: {
    label: 'Rehab',
    fullName: 'Rehabilitation Project',
    icon: '🔄',
    pattern: 'wave',
    borderStyle: 'solid',
    borderWidth: '2px',
  },
  bdoor_retest: {
    label: 'Retest',
    fullName: 'Blower Door Retest',
    icon: '⚠️',
    pattern: 'diagonal-warning',
    borderStyle: 'solid',
    borderWidth: '3px',
  },
  multifamily: {
    label: 'Multi-Family',
    fullName: 'Multi-Family Project',
    icon: '🏢',
    pattern: 'grid',
    borderStyle: 'solid',
    borderWidth: '2px',
  },
  energy_star: {
    label: 'Energy Star',
    fullName: 'Energy Star Certification',
    icon: '⭐',
    pattern: 'gradient',
    borderStyle: 'solid',
    borderWidth: '2px',
  },
  other: {
    label: 'Other',
    fullName: 'Other Inspection',
    icon: '📋',
    pattern: 'solid',
    borderStyle: 'solid',
    borderWidth: '2px',
  },
} as const;

/**
 * Get job type visual configuration
 */
export function getJobTypeVisuals(jobType: string | null | undefined): typeof JOB_TYPE_VISUALS[keyof typeof JOB_TYPE_VISUALS] {
  if (!jobType) {
    return JOB_TYPE_VISUALS.other;
  }

  const normalized = jobType.toLowerCase().replace(/[_-]/g, '').trim();
  
  // Map various job type variations to visual configs
  if (normalized.includes('sv2') || normalized.includes('predry')) {
    return JOB_TYPE_VISUALS.sv2;
  }
  if (normalized.includes('test') && !normalized.includes('retest')) {
    return JOB_TYPE_VISUALS.full_test;
  }
  if (normalized.includes('codebdoor') || normalized.includes('codeblower')) {
    return JOB_TYPE_VISUALS.code_bdoor;
  }
  if (normalized.includes('roughduct') || normalized.includes('ductroughin')) {
    return JOB_TYPE_VISUALS.rough_duct;
  }
  if (normalized.includes('rehab')) {
    return JOB_TYPE_VISUALS.rehab;
  }
  if (normalized.includes('retest')) {
    return JOB_TYPE_VISUALS.bdoor_retest;
  }
  if (normalized.includes('multifamily') || normalized === 'mf') {
    return JOB_TYPE_VISUALS.multifamily;
  }
  if (normalized.includes('energystar') || normalized.includes('estar')) {
    return JOB_TYPE_VISUALS.energy_star;
  }

  return JOB_TYPE_VISUALS.other;
}

/**
 * SVG pattern definitions for background overlays
 */
export const SVG_PATTERNS = {
  'diagonal-stripes': `
    <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <pattern id="diagonal-stripes" patternUnits="userSpaceOnUse" width="10" height="10" patternTransform="rotate(45)">
          <line x1="0" y1="0" x2="0" y2="10" stroke="rgba(255,255,255,0.15)" stroke-width="2"/>
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#diagonal-stripes)" />
    </svg>
  `,
  'dots': `
    <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <pattern id="dots" patternUnits="userSpaceOnUse" width="12" height="12">
          <circle cx="6" cy="6" r="2" fill="rgba(255,255,255,0.2)"/>
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#dots)" />
    </svg>
  `,
  'double-lines': `
    <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <pattern id="double-lines" patternUnits="userSpaceOnUse" width="8" height="8">
          <line x1="0" y1="2" x2="8" y2="2" stroke="rgba(255,255,255,0.15)" stroke-width="1"/>
          <line x1="0" y1="6" x2="8" y2="6" stroke="rgba(255,255,255,0.15)" stroke-width="1"/>
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#double-lines)" />
    </svg>
  `,
  'wave': `
    <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <pattern id="wave" patternUnits="userSpaceOnUse" width="20" height="12">
          <path d="M0,6 Q5,2 10,6 T20,6" fill="none" stroke="rgba(255,255,255,0.2)" stroke-width="2"/>
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#wave)" />
    </svg>
  `,
  'diagonal-warning': `
    <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <pattern id="diagonal-warning" patternUnits="userSpaceOnUse" width="12" height="12" patternTransform="rotate(45)">
          <line x1="0" y1="0" x2="0" y2="12" stroke="rgba(255,255,255,0.25)" stroke-width="3"/>
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#diagonal-warning)" />
    </svg>
  `,
  'grid': `
    <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <pattern id="grid" patternUnits="userSpaceOnUse" width="10" height="10">
          <path d="M10,0 L0,0 L0,10" fill="none" stroke="rgba(255,255,255,0.15)" stroke-width="1"/>
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#grid)" />
    </svg>
  `,
  'gradient': `
    <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="star-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:rgba(255,255,255,0.1);stop-opacity:1" />
          <stop offset="100%" style="stop-color:rgba(255,255,255,0);stop-opacity:1" />
        </linearGradient>
      </defs>
      <rect width="100%" height="100%" fill="url(#star-gradient)" />
    </svg>
  `,
  'solid': '',
} as const;

/**
 * Get background pattern CSS for a job type
 */
export function getBackgroundPattern(jobType: string | null | undefined): string {
  const visuals = getJobTypeVisuals(jobType);
  const patternSVG = SVG_PATTERNS[visuals.pattern as keyof typeof SVG_PATTERNS];
  
  if (!patternSVG || visuals.pattern === 'solid') {
    return '';
  }

  // Convert SVG to data URI for CSS background-image
  const encoded = encodeURIComponent(patternSVG.trim());
  return `data:image/svg+xml,${encoded}`;
}

/**
 * Completion status visual indicators
 */
export const COMPLETION_STATUS = {
  scheduled: {
    label: 'Scheduled',
    icon: '📅',
    opacity: '100',
  },
  in_progress: {
    label: 'In Progress',
    icon: '🔄',
    opacity: '100',
    pulse: true,
  },
  field_complete: {
    label: 'Field Work Done',
    icon: '✓',
    opacity: '90',
    checkmark: 'single',
  },
  fully_complete: {
    label: 'Fully Complete',
    icon: '✓✓',
    opacity: '60',
    checkmark: 'double',
    tint: 'rgba(34, 197, 94, 0.2)', // Green tint
  },
  cancelled: {
    label: 'Cancelled',
    icon: '✕',
    opacity: '40',
    strikethrough: true,
  },
} as const;

/**
 * Get completion status visual config
 */
export function getCompletionStatus(
  fieldWorkComplete: boolean,
  photoUploadComplete: boolean,
  isCancelled: boolean
): typeof COMPLETION_STATUS[keyof typeof COMPLETION_STATUS] {
  if (isCancelled) {
    return COMPLETION_STATUS.cancelled;
  }
  if (photoUploadComplete) {
    return COMPLETION_STATUS.fully_complete;
  }
  if (fieldWorkComplete) {
    return COMPLETION_STATUS.field_complete;
  }
  
  return COMPLETION_STATUS.scheduled;
}

/**
 * Generate complete calendar event styling
 */
export interface CalendarEventStyle {
  backgroundColor: string;
  borderColor: string;
  borderStyle: string;
  borderWidth: string;
  color: string;
  opacity: string;
  backgroundPattern?: string;
  icon: string;
  statusIcon?: string;
  checkmark?: 'single' | 'double';
  pulse?: boolean;
  strikethrough?: boolean;
  tint?: string;
}

export function getCalendarEventStyle(
  assignedUserId: string | null,
  jobType: string | null,
  fieldWorkComplete: boolean,
  photoUploadComplete: boolean,
  isCancelled: boolean
): CalendarEventStyle {
  const inspectorColor = getInspectorColor(assignedUserId);
  const jobTypeVisuals = getJobTypeVisuals(jobType);
  const completionStatus = getCompletionStatus(fieldWorkComplete, photoUploadComplete, isCancelled);

  return {
    backgroundColor: inspectorColor.background,
    borderColor: inspectorColor.border,
    borderStyle: jobTypeVisuals.borderStyle,
    borderWidth: jobTypeVisuals.borderWidth,
    color: inspectorColor.text,
    opacity: completionStatus.opacity,
    backgroundPattern: getBackgroundPattern(jobType),
    icon: jobTypeVisuals.icon,
    statusIcon: completionStatus.icon,
    checkmark: completionStatus.checkmark,
    pulse: completionStatus.pulse,
    strikethrough: completionStatus.strikethrough,
    tint: completionStatus.tint,
  };
}
