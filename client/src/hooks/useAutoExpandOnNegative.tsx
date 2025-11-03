import { useState, useEffect, useCallback } from 'react';

/**
 * Hook for auto-expanding notes and photo capture fields on negative responses
 * Following iAuditor UX pattern - negative responses require documentation
 */
interface UseAutoExpandConfig {
  /** Current response value (e.g., "Yes", "No", "Pass", "Fail", "NA") */
  responseValue?: string | null;
  /** Values that trigger auto-expand */
  negativeValues?: string[];
  /** Callback when notes should be expanded */
  onNotesExpand?: () => void;
  /** Callback when photo capture should be expanded */
  onPhotoExpand?: () => void;
}

const DEFAULT_NEGATIVE_VALUES = [
  'no', 
  'fail', 
  'failed',
  'deficient',
  'unsatisfactory',
  'incomplete',
  'non-compliant',
  'not_compliant'
];

export function useAutoExpandOnNegative({
  responseValue,
  negativeValues = DEFAULT_NEGATIVE_VALUES,
  onNotesExpand,
  onPhotoExpand
}: UseAutoExpandConfig) {
  const [notesExpanded, setNotesExpanded] = useState(false);
  const [photoExpanded, setPhotoExpanded] = useState(false);
  const [hasAutoExpanded, setHasAutoExpanded] = useState(false);

  // Check if current value is negative
  const isNegativeResponse = useCallback((value?: string | null) => {
    if (!value) return false;
    const normalizedValue = value.toLowerCase().replace(/[_-]/g, '');
    return negativeValues.some(neg => 
      normalizedValue.includes(neg.toLowerCase().replace(/[_-]/g, ''))
    );
  }, [negativeValues]);

  // Auto-expand on negative response
  useEffect(() => {
    const isNegative = isNegativeResponse(responseValue);
    
    if (isNegative && !hasAutoExpanded) {
      // Expand notes field
      if (!notesExpanded) {
        setNotesExpanded(true);
        onNotesExpand?.();
      }
      
      // Expand photo capture
      if (!photoExpanded) {
        setPhotoExpanded(true);
        onPhotoExpand?.();
      }
      
      setHasAutoExpanded(true);
    } else if (!isNegative) {
      // Reset auto-expand flag when switching to positive
      setHasAutoExpanded(false);
    }
  }, [responseValue, isNegativeResponse, notesExpanded, photoExpanded, hasAutoExpanded, onNotesExpand, onPhotoExpand]);

  return {
    notesExpanded,
    photoExpanded,
    isNegativeResponse: isNegativeResponse(responseValue),
    setNotesExpanded,
    setPhotoExpanded,
    // Force expand both sections
    expandDocumentation: () => {
      setNotesExpanded(true);
      setPhotoExpanded(true);
      onNotesExpand?.();
      onPhotoExpand?.();
    },
    // Force collapse both sections
    collapseDocumentation: () => {
      setNotesExpanded(false);
      setPhotoExpanded(false);
    }
  };
}

/**
 * Component wrapper for auto-expanding form sections
 */
interface AutoExpandSectionProps {
  /** Whether this section should be expanded */
  expanded: boolean;
  /** Section title */
  title: string;
  /** Whether this section is required when expanded */
  required?: boolean;
  /** Child content to show when expanded */
  children: React.ReactNode;
  /** Additional CSS classes */
  className?: string;
}

export function AutoExpandSection({
  expanded,
  title,
  required = false,
  children,
  className = ''
}: AutoExpandSectionProps) {
  if (!expanded) return null;

  return (
    <div 
      className={`space-y-2 animate-in fade-in slide-in-from-top-2 duration-300 ${className}`}
      data-testid={`section-auto-expand-${title.toLowerCase().replace(/\s+/g, '-')}`}
    >
      <div className="flex items-center gap-2">
        <h4 className="text-sm font-medium text-muted-foreground">
          {title}
        </h4>
        {required && (
          <span className="text-xs text-destructive">Required for negative response</span>
        )}
      </div>
      {children}
    </div>
  );
}

/**
 * Visual indicator showing that documentation is required
 */
interface NegativeResponseIndicatorProps {
  show: boolean;
  message?: string;
}

export function NegativeResponseIndicator({
  show,
  message = "Please document the issue with notes and photos"
}: NegativeResponseIndicatorProps) {
  if (!show) return null;

  return (
    <div 
      className="flex items-center gap-2 p-3 bg-warning/10 border border-warning/20 rounded-md animate-in fade-in duration-300"
      data-testid="indicator-negative-response"
    >
      <svg
        className="h-5 w-5 text-warning shrink-0"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
        />
      </svg>
      <p className="text-sm text-warning-foreground">
        {message}
      </p>
    </div>
  );
}