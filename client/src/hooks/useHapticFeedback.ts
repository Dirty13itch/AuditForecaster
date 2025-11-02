import { useEffect, useRef, useCallback } from "react";

/**
 * Haptic feedback patterns for different actions
 */
export const HAPTIC_PATTERNS = {
  // Light tap for routine button presses
  light: 10,
  
  // Medium tap for successful actions
  medium: 20,
  
  // Strong tap for critical actions
  strong: 30,
  
  // Very strong tap for irreversible actions
  veryStrong: 40,
  
  // Error pattern - three short buzzes
  error: [30, 100, 30, 100, 30],
  
  // Success pattern - short-long-short
  success: [10, 50, 10],
  
  // Warning pattern - two medium buzzes
  warning: [20, 80, 20],
  
  // Celebration pattern - rhythmic taps
  celebration: [15, 30, 15, 30, 15, 30, 15],
  
  // Selection pattern - quick double tap
  selection: [8, 25, 8],
  
  // Swipe action pattern - medium with trail
  swipe: [15, 30, 10],
} as const;

export type HapticPattern = keyof typeof HAPTIC_PATTERNS;

interface HapticFeedbackOptions {
  enabled?: boolean;
  intensity?: number; // 0.0 to 1.0, for future API support
  fallbackToAudio?: boolean; // Future: use audio click as fallback
}

interface UseHapticFeedback {
  vibrate: (pattern?: HapticPattern | number | number[]) => void;
  isSupported: boolean;
  isEnabled: boolean;
  setEnabled: (enabled: boolean) => void;
  testPattern: (pattern: HapticPattern) => void;
  cancelVibration: () => void;
}

/**
 * Hook for managing haptic feedback in the application
 * Provides consistent haptic patterns for field inspector actions
 */
export function useHapticFeedback(options: HapticFeedbackOptions = {}): UseHapticFeedback {
  const { 
    enabled: initialEnabled = true,
    intensity = 1.0,
    fallbackToAudio = false 
  } = options;
  
  // Check for Vibration API support
  const isSupported = useRef<boolean>(
    typeof window !== 'undefined' && 
    'vibrate' in navigator &&
    typeof navigator.vibrate === 'function'
  ).current;
  
  // Get saved preference from localStorage
  const getSavedPreference = useCallback(() => {
    if (typeof window === 'undefined') return initialEnabled;
    
    const saved = localStorage.getItem('hapticFeedbackEnabled');
    if (saved === null) return initialEnabled;
    return saved === 'true';
  }, [initialEnabled]);
  
  const enabledRef = useRef<boolean>(getSavedPreference());
  
  // Load preference on mount
  useEffect(() => {
    enabledRef.current = getSavedPreference();
  }, [getSavedPreference]);
  
  /**
   * Main vibration function
   */
  const vibrate = useCallback((pattern?: HapticPattern | number | number[] = 'light') => {
    // Check if vibration is supported and enabled
    if (!isSupported || !enabledRef.current) {
      // Future: Add audio fallback here if enabled
      if (fallbackToAudio) {
        // Could play a subtle click sound as fallback
        console.debug('[Haptic] Would play audio fallback');
      }
      return;
    }
    
    let vibrationPattern: number | number[];
    
    // Resolve pattern
    if (typeof pattern === 'string') {
      vibrationPattern = HAPTIC_PATTERNS[pattern];
    } else {
      vibrationPattern = pattern;
    }
    
    // Apply intensity scaling (for future API support)
    if (intensity < 1.0) {
      if (Array.isArray(vibrationPattern)) {
        // Scale vibration durations, but not pauses (odd indices)
        vibrationPattern = vibrationPattern.map((duration, index) => 
          index % 2 === 0 ? Math.floor(duration * intensity) : duration
        );
      } else {
        vibrationPattern = Math.floor(vibrationPattern * intensity);
      }
    }
    
    try {
      // Cancel any ongoing vibration first
      navigator.vibrate(0);
      
      // Execute vibration
      const success = navigator.vibrate(vibrationPattern);
      
      if (!success) {
        console.debug('[Haptic] Vibration command failed');
      }
    } catch (error) {
      console.error('[Haptic] Vibration error:', error);
    }
  }, [isSupported, intensity, fallbackToAudio]);
  
  /**
   * Cancel any ongoing vibration
   */
  const cancelVibration = useCallback(() => {
    if (!isSupported) return;
    
    try {
      navigator.vibrate(0);
    } catch (error) {
      console.error('[Haptic] Failed to cancel vibration:', error);
    }
  }, [isSupported]);
  
  /**
   * Set enabled state and persist to localStorage
   */
  const setEnabled = useCallback((enabled: boolean) => {
    enabledRef.current = enabled;
    
    if (typeof window !== 'undefined') {
      localStorage.setItem('hapticFeedbackEnabled', enabled.toString());
    }
    
    // Provide immediate feedback when enabling
    if (enabled && isSupported) {
      vibrate('light');
    }
  }, [isSupported, vibrate]);
  
  /**
   * Test a specific haptic pattern
   */
  const testPattern = useCallback((pattern: HapticPattern) => {
    // Temporarily bypass enabled check for testing
    if (!isSupported) return;
    
    const vibrationPattern = HAPTIC_PATTERNS[pattern];
    
    try {
      navigator.vibrate(0); // Cancel any ongoing
      navigator.vibrate(vibrationPattern);
    } catch (error) {
      console.error('[Haptic] Test pattern error:', error);
    }
  }, [isSupported]);
  
  // Cancel vibration on unmount
  useEffect(() => {
    return () => {
      if (isSupported) {
        navigator.vibrate(0);
      }
    };
  }, [isSupported]);
  
  return {
    vibrate,
    isSupported,
    isEnabled: enabledRef.current,
    setEnabled,
    testPattern,
    cancelVibration,
  };
}

/**
 * Utility function to create a haptic-enhanced button click handler
 */
export function withHaptic<T extends (...args: any[]) => any>(
  handler: T,
  pattern: HapticPattern | number | number[] = 'light'
): T {
  return ((...args: Parameters<T>) => {
    // Get haptic instance from global context if available
    if (typeof window !== 'undefined' && 'navigator' in window && navigator.vibrate) {
      const enabled = localStorage.getItem('hapticFeedbackEnabled') !== 'false';
      if (enabled) {
        const vibrationPattern = typeof pattern === 'string' ? HAPTIC_PATTERNS[pattern] : pattern;
        navigator.vibrate(vibrationPattern);
      }
    }
    
    return handler(...args);
  }) as T;
}

// Export a singleton instance for quick access
let globalHaptic: UseHapticFeedback | null = null;

export function getGlobalHaptic(): UseHapticFeedback | null {
  if (typeof window === 'undefined') return null;
  
  if (!globalHaptic) {
    const isSupported = 'vibrate' in navigator && typeof navigator.vibrate === 'function';
    const enabled = localStorage.getItem('hapticFeedbackEnabled') !== 'false';
    
    globalHaptic = {
      vibrate: (pattern = 'light') => {
        if (!isSupported || !enabled) return;
        
        const vibrationPattern = typeof pattern === 'string' 
          ? HAPTIC_PATTERNS[pattern] 
          : pattern;
          
        try {
          navigator.vibrate(0);
          navigator.vibrate(vibrationPattern);
        } catch (error) {
          console.error('[Haptic] Error:', error);
        }
      },
      isSupported,
      isEnabled: enabled,
      setEnabled: (newEnabled: boolean) => {
        localStorage.setItem('hapticFeedbackEnabled', newEnabled.toString());
        if (globalHaptic) {
          globalHaptic.isEnabled = newEnabled;
        }
      },
      testPattern: (pattern: HapticPattern) => {
        if (!isSupported) return;
        const vibrationPattern = HAPTIC_PATTERNS[pattern];
        navigator.vibrate(vibrationPattern);
      },
      cancelVibration: () => {
        if (isSupported) {
          navigator.vibrate(0);
        }
      }
    };
  }
  
  return globalHaptic;
}