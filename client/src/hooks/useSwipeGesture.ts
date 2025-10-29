import { useState, useRef, useCallback, useEffect } from 'react';

export interface SwipeGestureOptions {
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  threshold?: number;
}

export interface SwipeGestureResult {
  handlers: {
    onTouchStart: (e: React.TouchEvent) => void;
    onTouchMove: (e: React.TouchEvent) => void;
    onTouchEnd: (e: React.TouchEvent) => void;
    onMouseDown: (e: React.MouseEvent) => void;
    onMouseMove: (e: React.MouseEvent) => void;
    onMouseUp: (e: React.MouseEvent) => void;
  };
  dragOffset: number;
  isDragging: boolean;
  swipeDirection: 'left' | 'right' | null;
}

export function useSwipeGesture(options: SwipeGestureOptions): SwipeGestureResult {
  const { onSwipeLeft, onSwipeRight, threshold = 40 } = options;
  
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState(0);
  const [swipeDirection, setSwipeDirection] = useState<'left' | 'right' | null>(null);
  
  const startXRef = useRef<number>(0);
  const currentXRef = useRef<number>(0);
  const thresholdPxRef = useRef<number>(0);

  useEffect(() => {
    thresholdPxRef.current = (window.innerWidth * threshold) / 100;
  }, [threshold]);

  const handleStart = useCallback((clientX: number) => {
    setIsDragging(true);
    startXRef.current = clientX;
    currentXRef.current = clientX;
    setDragOffset(0);
    setSwipeDirection(null);
  }, []);

  const handleMove = useCallback((clientX: number) => {
    if (!isDragging) return;

    currentXRef.current = clientX;
    const offset = clientX - startXRef.current;
    setDragOffset(offset);
    setSwipeDirection(offset > 0 ? 'right' : 'left');
  }, [isDragging]);

  const handleEnd = useCallback(() => {
    if (!isDragging) return;

    const offset = currentXRef.current - startXRef.current;
    const absOffset = Math.abs(offset);

    if (absOffset >= thresholdPxRef.current) {
      if (offset > 0 && onSwipeRight) {
        onSwipeRight();
      } else if (offset < 0 && onSwipeLeft) {
        onSwipeLeft();
      }
    }

    setIsDragging(false);
    setDragOffset(0);
    setSwipeDirection(null);
  }, [isDragging, onSwipeLeft, onSwipeRight]);

  const handlers = {
    onTouchStart: (e: React.TouchEvent) => {
      handleStart(e.touches[0].clientX);
    },
    onTouchMove: (e: React.TouchEvent) => {
      handleMove(e.touches[0].clientX);
    },
    onTouchEnd: () => {
      handleEnd();
    },
    onMouseDown: (e: React.MouseEvent) => {
      handleStart(e.clientX);
    },
    onMouseMove: (e: React.MouseEvent) => {
      if (isDragging) {
        handleMove(e.clientX);
      }
    },
    onMouseUp: () => {
      handleEnd();
    },
  };

  return {
    handlers,
    dragOffset,
    isDragging,
    swipeDirection,
  };
}
