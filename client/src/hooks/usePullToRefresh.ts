import { useState, useEffect, useRef, useCallback } from 'react';

interface PullToRefreshOptions {
  onRefresh: () => Promise<void>;
  threshold?: number;
  maxPullDistance?: number;
  resistance?: number;
  disabled?: boolean;
}

interface PullToRefreshState {
  isPulling: boolean;
  isRefreshing: boolean;
  pullDistance: number;
  pullProgress: number;
  shouldRefresh: boolean;
}

export function usePullToRefresh({
  onRefresh,
  threshold = 80,
  maxPullDistance = 120,
  resistance = 2.5,
  disabled = false,
}: PullToRefreshOptions): PullToRefreshState {
  const [state, setState] = useState<PullToRefreshState>({
    isPulling: false,
    isRefreshing: false,
    pullDistance: 0,
    pullProgress: 0,
    shouldRefresh: false,
  });

  const startY = useRef<number>(0);
  const currentY = useRef<number>(0);
  const scrollTopRef = useRef<number>(0);

  // Check if we can pull to refresh (at top of page)
  const canPullToRefresh = useCallback(() => {
    return window.scrollY === 0 && !disabled && !state.isRefreshing;
  }, [disabled, state.isRefreshing]);

  // Handle touch start
  const handleTouchStart = useCallback((e: TouchEvent) => {
    if (!canPullToRefresh()) return;

    const touch = e.touches[0];
    startY.current = touch.clientY;
    currentY.current = touch.clientY;
    scrollTopRef.current = window.scrollY;
  }, [canPullToRefresh]);

  // Handle touch move
  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (!canPullToRefresh() || scrollTopRef.current > 0) return;

    const touch = e.touches[0];
    currentY.current = touch.clientY;
    const deltaY = currentY.current - startY.current;

    // Only track pulling down
    if (deltaY > 0) {
      // Apply resistance factor
      const pullDistance = Math.min(deltaY / resistance, maxPullDistance);
      const pullProgress = Math.min((pullDistance / threshold) * 100, 100);
      const shouldRefresh = pullDistance >= threshold;

      setState(prev => ({
        ...prev,
        isPulling: true,
        pullDistance,
        pullProgress,
        shouldRefresh,
      }));

      // Prevent default scroll behavior when pulling
      if (pullDistance > 5) {
        e.preventDefault();
      }
    }
  }, [canPullToRefresh, resistance, maxPullDistance, threshold]);

  // Handle touch end
  const handleTouchEnd = useCallback(async () => {
    if (!state.isPulling) return;

    if (state.shouldRefresh && !state.isRefreshing) {
      // Trigger haptic feedback
      if ('vibrate' in navigator) {
        navigator.vibrate(10);
      }

      setState(prev => ({
        ...prev,
        isRefreshing: true,
        pullDistance: 60, // Keep indicator visible at reduced height
      }));

      try {
        await onRefresh();
      } catch (error) {
        console.error('Refresh failed:', error);
      } finally {
        setState({
          isPulling: false,
          isRefreshing: false,
          pullDistance: 0,
          pullProgress: 0,
          shouldRefresh: false,
        });
      }
    } else {
      // Reset if not refreshing
      setState({
        isPulling: false,
        isRefreshing: false,
        pullDistance: 0,
        pullProgress: 0,
        shouldRefresh: false,
      });
    }
  }, [state.isPulling, state.shouldRefresh, state.isRefreshing, onRefresh]);

  // Add event listeners
  useEffect(() => {
    if (disabled) return;

    document.addEventListener('touchstart', handleTouchStart, { passive: true });
    document.addEventListener('touchmove', handleTouchMove, { passive: false });
    document.addEventListener('touchend', handleTouchEnd, { passive: true });

    return () => {
      document.removeEventListener('touchstart', handleTouchStart);
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleTouchEnd);
    };
  }, [handleTouchStart, handleTouchMove, handleTouchEnd, disabled]);

  return state;
}