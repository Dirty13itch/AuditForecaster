import { useReducedMotion } from "framer-motion";
import { useCallback, useRef, useEffect, useState } from "react";

// Hook for intersection observer animations
export function useInViewAnimation(threshold = 0.1, rootMargin = "0px") {
  const [isInView, setIsInView] = useState(false);
  const ref = useRef<HTMLElement>(null);
  const hasAnimated = useRef(false);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !hasAnimated.current) {
          setIsInView(true);
          hasAnimated.current = true;
        }
      },
      { threshold, rootMargin }
    );

    observer.observe(element);

    return () => observer.disconnect();
  }, [threshold, rootMargin]);

  return { ref, isInView };
}

// Hook for debounced values
export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => clearTimeout(handler);
  }, [value, delay]);

  return debouncedValue;
}

// Hook for throttled callback
export function useThrottle(callback: (...args: any[]) => void, delay: number) {
  const lastRun = useRef(Date.now());

  return useCallback((...args: any[]) => {
    if (Date.now() - lastRun.current >= delay) {
      callback(...args);
      lastRun.current = Date.now();
    }
  }, [callback, delay]);
}

// Hook for smooth scroll
export function useSmoothScroll() {
  const shouldReduceMotion = useReducedMotion();

  const scrollToElement = useCallback((elementId: string) => {
    const element = document.getElementById(elementId);
    if (!element) return;

    element.scrollIntoView({
      behavior: shouldReduceMotion ? "auto" : "smooth",
      block: "start",
      inline: "nearest"
    });
  }, [shouldReduceMotion]);

  const scrollToTop = useCallback(() => {
    window.scrollTo({
      top: 0,
      behavior: shouldReduceMotion ? "auto" : "smooth"
    });
  }, [shouldReduceMotion]);

  return { scrollToElement, scrollToTop };
}

// Hook for lazy loading
export function useLazyLoad() {
  const [hasLoaded, setHasLoaded] = useState(false);
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const element = ref.current;
    if (!element || hasLoaded) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setHasLoaded(true);
          observer.disconnect();
        }
      },
      { threshold: 0.01, rootMargin: "100px" }
    );

    observer.observe(element);

    return () => observer.disconnect();
  }, [hasLoaded]);

  return { ref, hasLoaded };
}

// Hook for animated counter
export function useAnimatedCounter(
  end: number,
  duration: number = 1000,
  start: number = 0
) {
  const [count, setCount] = useState(start);
  const shouldReduceMotion = useReducedMotion();

  useEffect(() => {
    if (shouldReduceMotion) {
      setCount(end);
      return;
    }

    let startTimestamp: number | null = null;
    const step = (timestamp: number) => {
      if (!startTimestamp) startTimestamp = timestamp;
      const progress = Math.min((timestamp - startTimestamp) / duration, 1);
      
      setCount(Math.floor(progress * (end - start) + start));
      
      if (progress < 1) {
        window.requestAnimationFrame(step);
      }
    };
    
    window.requestAnimationFrame(step);
  }, [end, duration, start, shouldReduceMotion]);

  return count;
}

// Hook for optimistic updates
export function useOptimisticUpdate<T>(
  initialValue: T,
  updateFn: (newValue: T) => Promise<T>
) {
  const [value, setValue] = useState(initialValue);
  const [isUpdating, setIsUpdating] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const update = useCallback(async (newValue: T) => {
    setIsUpdating(true);
    setError(null);
    
    // Optimistically update the UI
    setValue(newValue);

    try {
      const result = await updateFn(newValue);
      setValue(result); // Update with server response
      return result;
    } catch (err) {
      // Revert on error
      setValue(value);
      setError(err as Error);
      throw err;
    } finally {
      setIsUpdating(false);
    }
  }, [value, updateFn]);

  return { value, update, isUpdating, error };
}

// Hook for focus management with animations
export function useFocusAnimation() {
  const [isFocused, setIsFocused] = useState(false);
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const handleFocus = () => setIsFocused(true);
    const handleBlur = () => setIsFocused(false);

    element.addEventListener("focus", handleFocus);
    element.addEventListener("blur", handleBlur);

    return () => {
      element.removeEventListener("focus", handleFocus);
      element.removeEventListener("blur", handleBlur);
    };
  }, []);

  return { ref, isFocused };
}

// Hook for keyboard navigation
export function useKeyboardNavigation(
  items: any[],
  onSelect: (item: any, index: number) => void
) {
  const [selectedIndex, setSelectedIndex] = useState(-1);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case "ArrowUp":
          e.preventDefault();
          setSelectedIndex(prev => 
            prev <= 0 ? items.length - 1 : prev - 1
          );
          break;
        case "ArrowDown":
          e.preventDefault();
          setSelectedIndex(prev => 
            prev >= items.length - 1 ? 0 : prev + 1
          );
          break;
        case "Enter":
          if (selectedIndex >= 0 && selectedIndex < items.length) {
            onSelect(items[selectedIndex], selectedIndex);
          }
          break;
        case "Escape":
          setSelectedIndex(-1);
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [items, selectedIndex, onSelect]);

  return { selectedIndex, setSelectedIndex };
}