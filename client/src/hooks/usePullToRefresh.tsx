import { useState, useEffect, useCallback, useRef } from 'react';

interface PullToRefreshOptions {
  onRefresh: () => Promise<void>;
  threshold?: number;
  disabled?: boolean;
}

interface PullToRefreshState {
  isRefreshing: boolean;
  pullDistance: number;
  isPulling: boolean;
  canRefresh: boolean;
}

/**
 * Custom hook for implementing pull-to-refresh functionality
 */
export function usePullToRefresh({
  onRefresh,
  threshold = 80,
  disabled = false,
}: PullToRefreshOptions): PullToRefreshState {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const [isPulling, setIsPulling] = useState(false);
  const startY = useRef<number | null>(null);
  const currentY = useRef<number | null>(null);

  const canRefresh = pullDistance > threshold && !isRefreshing;

  const handleTouchStart = useCallback((e: TouchEvent) => {
    if (disabled || isRefreshing) return;
    
    const touch = e.touches[0];
    startY.current = touch.clientY;
    
    // Only enable pull-to-refresh if we're at the top of the page
    if (window.scrollY === 0) {
      setIsPulling(true);
    }
  }, [disabled, isRefreshing]);

  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (!isPulling || disabled || isRefreshing || startY.current === null) return;

    const touch = e.touches[0];
    currentY.current = touch.clientY;
    
    const distance = currentY.current - startY.current;
    
    if (distance > 0) {
      // Prevent default scrolling when pulling down
      e.preventDefault();
      
      // Apply resistance factor to make pulling feel more natural
      const resistance = Math.min(distance / 2, threshold * 2);
      setPullDistance(resistance);
    }
  }, [isPulling, disabled, isRefreshing, threshold]);

  const handleTouchEnd = useCallback(async () => {
    if (!isPulling || disabled || isRefreshing) return;

    setIsPulling(false);
    
    if (canRefresh) {
      setIsRefreshing(true);
      
      try {
        await onRefresh();
      } catch (error) {
        console.error('Pull to refresh failed:', error);
      } finally {
        setIsRefreshing(false);
      }
    }
    
    // Reset pull distance
    setPullDistance(0);
    startY.current = null;
    currentY.current = null;
  }, [isPulling, disabled, isRefreshing, canRefresh, onRefresh]);

  useEffect(() => {
    if (disabled) return;

    // Add touch event listeners
    document.addEventListener('touchstart', handleTouchStart, { passive: false });
    document.addEventListener('touchmove', handleTouchMove, { passive: false });
    document.addEventListener('touchend', handleTouchEnd);

    return () => {
      document.removeEventListener('touchstart', handleTouchStart);
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleTouchEnd);
    };
  }, [handleTouchStart, handleTouchMove, handleTouchEnd, disabled]);

  return {
    isRefreshing,
    pullDistance,
    isPulling,
    canRefresh,
  };
}