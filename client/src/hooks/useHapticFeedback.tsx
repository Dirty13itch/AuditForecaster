import { useCallback } from 'react';

type HapticPattern = 'light' | 'medium' | 'heavy' | 'success' | 'warning' | 'error' | 'selection';

interface HapticFeedback {
  vibrate: (pattern?: HapticPattern) => void;
  canVibrate: boolean;
}

/**
 * Custom hook for providing haptic feedback on mobile devices
 */
export function useHapticFeedback(): HapticFeedback {
  const canVibrate = typeof navigator !== 'undefined' && 'vibrate' in navigator;

  const vibrate = useCallback((pattern: HapticPattern = 'light') => {
    if (!canVibrate || !navigator.vibrate) return;

    // Map patterns to vibration durations (in milliseconds)
    const patterns: Record<HapticPattern, number | number[]> = {
      light: 10,
      medium: 20,
      heavy: 30,
      success: [10, 50, 10],
      warning: [20, 40, 20],
      error: [30, 30, 30],
      selection: 15,
    };

    try {
      navigator.vibrate(patterns[pattern]);
    } catch (error) {
      console.warn('Haptic feedback failed:', error);
    }
  }, [canVibrate]);

  return {
    vibrate,
    canVibrate,
  };
}