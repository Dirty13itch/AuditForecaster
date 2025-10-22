import { useEffect, useRef, useState, useCallback } from 'react';
import { useNetworkStatus } from './useNetworkStatus';

export interface UseAutoSaveOptions<T> {
  data: T;
  onSave: () => Promise<void>;
  interval?: number;
  debounceDelay?: number;
  enabled?: boolean;
}

export interface UseAutoSaveReturn {
  isSaving: boolean;
  lastSaved: Date | null;
  error: Error | null;
  forceSave: (bypassEnabled?: boolean) => Promise<void>;
}

export function useAutoSave<T>({
  data,
  onSave,
  interval = 30000,
  debounceDelay = 2000,
  enabled = true,
}: UseAutoSaveOptions<T>): UseAutoSaveReturn {
  const { isOnline } = useNetworkStatus();
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [error, setError] = useState<Error | null>(null);
  
  const dataRef = useRef<T>(data);
  const lastSavedDataRef = useRef<string | null>(null);
  const debounceTimerRef = useRef<number | null>(null);
  const intervalTimerRef = useRef<number | null>(null);
  const isMountedRef = useRef(true);
  const isSavingRef = useRef(false);
  const onSaveRef = useRef(onSave);
  
  useEffect(() => {
    dataRef.current = data;
  }, [data]);
  
  useEffect(() => {
    onSaveRef.current = onSave;
  }, [onSave]);
  
  useEffect(() => {
    isSavingRef.current = isSaving;
  }, [isSaving]);
  
  // Initialize lastSavedDataRef with initial data to prevent save-on-mount
  useEffect(() => {
    lastSavedDataRef.current = JSON.stringify(data);
  }, []);
  
  const performSave = useCallback(async (bypassEnabled = false) => {
    if ((!enabled && !bypassEnabled) || isSavingRef.current) return;
    
    const dataStr = JSON.stringify(dataRef.current);
    
    if (lastSavedDataRef.current === dataStr) {
      return;
    }
    
    setIsSaving(true);
    setError(null);
    
    try {
      await onSaveRef.current();
      
      if (isMountedRef.current) {
        lastSavedDataRef.current = dataStr;
        setLastSaved(new Date());
        setIsSaving(false);
      }
    } catch (err) {
      if (isMountedRef.current) {
        setError(err as Error);
        setIsSaving(false);
      }
    }
  }, [enabled]);
  
  const forceSave = useCallback(async (bypassEnabled = false) => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }
    
    await performSave(bypassEnabled);
  }, [performSave]);
  
  useEffect(() => {
    if (!enabled) return;
    
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    
    const dataStr = JSON.stringify(dataRef.current);
    if (lastSavedDataRef.current !== dataStr) {
      debounceTimerRef.current = window.setTimeout(() => {
        performSave();
      }, debounceDelay);
    }
    
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [data, debounceDelay, enabled, performSave]);
  
  useEffect(() => {
    if (!enabled) return;
    
    intervalTimerRef.current = window.setInterval(() => {
      performSave();
    }, interval);
    
    return () => {
      if (intervalTimerRef.current) {
        clearInterval(intervalTimerRef.current);
      }
    };
  }, [interval, enabled, performSave]);
  
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      if (intervalTimerRef.current) {
        clearInterval(intervalTimerRef.current);
      }
    };
  }, []);
  
  return {
    isSaving,
    lastSaved,
    error,
    forceSave,
  };
}
