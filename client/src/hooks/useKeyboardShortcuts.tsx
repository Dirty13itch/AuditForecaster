import { useEffect, useCallback, useRef } from 'react';

type KeyboardShortcut = {
  key: string;
  ctrl?: boolean;
  alt?: boolean;
  shift?: boolean;
  meta?: boolean;
  handler: (event: KeyboardEvent) => void;
  description?: string;
  enabled?: boolean;
};

interface UseKeyboardShortcutsOptions {
  shortcuts: KeyboardShortcut[];
  enabled?: boolean;
  preventDefault?: boolean;
}

/**
 * Custom hook for managing keyboard shortcuts
 */
export function useKeyboardShortcuts({
  shortcuts,
  enabled = true,
  preventDefault = true,
}: UseKeyboardShortcutsOptions): void {
  const shortcutsRef = useRef(shortcuts);
  
  // Update shortcuts ref when they change
  useEffect(() => {
    shortcutsRef.current = shortcuts;
  }, [shortcuts]);

  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (!enabled) return;

    // Check if we're in an input field (unless explicitly allowed)
    const target = event.target as HTMLElement;
    const isInput = target.tagName === 'INPUT' || 
                   target.tagName === 'TEXTAREA' || 
                   target.isContentEditable;

    for (const shortcut of shortcutsRef.current) {
      // Skip disabled shortcuts
      if (shortcut.enabled === false) continue;

      // Check if the key matches
      const keyMatches = event.key.toLowerCase() === shortcut.key.toLowerCase() ||
                        event.code.toLowerCase() === shortcut.key.toLowerCase();

      if (!keyMatches) continue;

      // Check modifier keys
      const ctrlMatches = (shortcut.ctrl === undefined || shortcut.ctrl === event.ctrlKey);
      const altMatches = (shortcut.alt === undefined || shortcut.alt === event.altKey);
      const shiftMatches = (shortcut.shift === undefined || shortcut.shift === event.shiftKey);
      const metaMatches = (shortcut.meta === undefined || shortcut.meta === event.metaKey);

      if (ctrlMatches && altMatches && shiftMatches && metaMatches) {
        // Don't trigger if in input field (unless it's a global shortcut with meta/ctrl)
        if (isInput && !shortcut.ctrl && !shortcut.meta) continue;

        if (preventDefault) {
          event.preventDefault();
          event.stopPropagation();
        }

        shortcut.handler(event);
        break;
      }
    }
  }, [enabled, preventDefault]);

  useEffect(() => {
    if (!enabled) return;

    // Add event listener
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleKeyDown, enabled]);
}

// Export common shortcut patterns
export const commonShortcuts = {
  save: { key: 's', ctrl: true, meta: true },
  new: { key: 'n', ctrl: true, meta: true },
  search: { key: 'k', ctrl: true, meta: true },
  help: { key: '?', shift: true },
  escape: { key: 'Escape' },
  enter: { key: 'Enter' },
  delete: { key: 'Delete' },
  undo: { key: 'z', ctrl: true, meta: true },
  redo: { key: 'y', ctrl: true, meta: true },
  selectAll: { key: 'a', ctrl: true, meta: true },
};