import { useEffect, useCallback, useRef } from "react";

/**
 * Keyboard Shortcut Configuration
 */
export interface ShortcutConfig {
  /** Unique identifier for the shortcut */
  id: string;
  
  /** Human-readable description */
  description: string;
  
  /** Category for grouping (Global, Navigation, Actions, etc.) */
  category: "global" | "navigation" | "actions" | "context";
  
  /** The key(s) to match (e.g., "k", "Enter", "ArrowUp") */
  key: string | string[];
  
  /** Modifier keys required */
  modifiers?: {
    ctrl?: boolean;
    meta?: boolean; // Cmd on Mac, Win on Windows
    alt?: boolean;
    shift?: boolean;
  };
  
  /** Handler function to execute */
  handler: (event: KeyboardEvent) => void;
  
  /** Whether to prevent default browser behavior */
  preventDefault?: boolean;
  
  /** Whether shortcut is currently enabled */
  enabled?: boolean;
  
  /** Sequence mode: for shortcuts like "g+h" (press g, then h) */
  sequence?: boolean;
}

/**
 * Matches a keyboard event against a shortcut configuration
 */
function matchesShortcut(event: KeyboardEvent, shortcut: ShortcutConfig): boolean {
  // Check if shortcut is enabled
  if (shortcut.enabled === false) return false;
  
  // Normalize key comparison
  const eventKey = event.key.toLowerCase();
  const shortcutKeys = Array.isArray(shortcut.key) 
    ? shortcut.key.map(k => k.toLowerCase())
    : [shortcut.key.toLowerCase()];
  
  // Check key match
  if (!shortcutKeys.includes(eventKey)) return false;
  
  // Check modifiers
  const mods = shortcut.modifiers || {};
  
  // Handle meta key (Cmd on Mac, Ctrl on Windows/Linux for cross-platform)
  const needsMeta = mods.meta || mods.ctrl;
  const hasMeta = event.metaKey || event.ctrlKey;
  
  if (needsMeta && !hasMeta) return false;
  if (!needsMeta && hasMeta) return false;
  
  if (mods.alt && !event.altKey) return false;
  if (!mods.alt && event.altKey) return false;
  
  if (mods.shift && !event.shiftKey) return false;
  if (!mods.shift && event.shiftKey) return false;
  
  return true;
}

/**
 * Determines if the current target is an input element where shortcuts should be disabled
 */
function isInputElement(target: EventTarget | null): boolean {
  if (!target || !(target instanceof Element)) return false;
  
  const tagName = target.tagName.toLowerCase();
  const isContentEditable = target.getAttribute('contenteditable') === 'true';
  
  return (
    tagName === 'input' ||
    tagName === 'textarea' ||
    tagName === 'select' ||
    isContentEditable
  );
}

/**
 * Hook for managing keyboard shortcuts
 * 
 * @example
 * ```tsx
 * const shortcuts: ShortcutConfig[] = [
 *   {
 *     id: 'open-command-palette',
 *     description: 'Open command palette',
 *     category: 'global',
 *     key: 'k',
 *     modifiers: { meta: true },
 *     handler: () => setCommandPaletteOpen(true)
 *   },
 *   {
 *     id: 'save',
 *     description: 'Save current item',
 *     category: 'actions',
 *     key: 's',
 *     modifiers: { meta: true },
 *     handler: () => handleSave(),
 *     preventDefault: true
 *   }
 * ];
 * 
 * useKeyboardShortcuts(shortcuts);
 * ```
 */
export function useKeyboardShortcuts(shortcuts: ShortcutConfig[]) {
  const sequenceRef = useRef<{ key: string; timestamp: number } | null>(null);
  const sequenceTimeoutRef = useRef<NodeJS.Timeout>();
  
  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    // Don't trigger shortcuts when typing in inputs
    if (isInputElement(event.target)) return;
    
    // Check for sequence shortcuts (like "g+h")
    const now = Date.now();
    const isSequence = sequenceRef.current && (now - sequenceRef.current.timestamp < 1000);
    
    for (const shortcut of shortcuts) {
      // Handle sequence shortcuts
      if (shortcut.sequence && shortcut.key && typeof shortcut.key === 'string' && shortcut.key.includes('+')) {
        const [firstKey, secondKey] = shortcut.key.split('+').map(k => k.trim().toLowerCase());
        const eventKey = event.key.toLowerCase();
        
        if (!isSequence && eventKey === firstKey) {
          // First key in sequence pressed
          sequenceRef.current = { key: firstKey, timestamp: now };
          
          // Clear sequence after 1 second
          clearTimeout(sequenceTimeoutRef.current);
          sequenceTimeoutRef.current = setTimeout(() => {
            sequenceRef.current = null;
          }, 1000);
          
          if (shortcut.preventDefault !== false) {
            event.preventDefault();
          }
          return;
        }
        
        if (isSequence && sequenceRef.current?.key === firstKey && eventKey === secondKey) {
          // Complete sequence matched
          sequenceRef.current = null;
          clearTimeout(sequenceTimeoutRef.current);
          
          if (shortcut.preventDefault !== false) {
            event.preventDefault();
          }
          
          shortcut.handler(event);
          return;
        }
      }
      
      // Handle regular shortcuts
      if (!shortcut.sequence && matchesShortcut(event, shortcut)) {
        if (shortcut.preventDefault !== false) {
          event.preventDefault();
        }
        
        shortcut.handler(event);
        return; // Only execute first matching shortcut
      }
    }
  }, [shortcuts]);
  
  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      clearTimeout(sequenceTimeoutRef.current);
    };
  }, [handleKeyDown]);
}

/**
 * Hook for managing conditional keyboard shortcuts
 * Shortcuts are only active when condition is true
 */
export function useConditionalShortcuts(
  shortcuts: ShortcutConfig[],
  condition: boolean
) {
  const conditionalShortcuts = shortcuts.map(s => ({
    ...s,
    enabled: s.enabled !== false && condition
  }));
  
  useKeyboardShortcuts(conditionalShortcuts);
}

/**
 * Hook for global keyboard shortcuts
 * These work anywhere in the app
 */
export function useGlobalShortcuts(handlers: {
  onOpenCommandPalette?: () => void;
  onToggleSidebar?: () => void;
  onShowShortcuts?: () => void;
  onGoHome?: () => void;
  onGoJobs?: () => void;
  onGoBuilders?: () => void;
  onGoPhotos?: () => void;
  onGoSchedule?: () => void;
  onGoEquipment?: () => void;
}) {
  const shortcuts: ShortcutConfig[] = [
    // Command palette
    handlers.onOpenCommandPalette && {
      id: 'open-command-palette',
      description: 'Open command palette',
      category: 'global',
      key: 'k',
      modifiers: { meta: true },
      handler: handlers.onOpenCommandPalette,
      preventDefault: true
    },
    
    // Show shortcuts
    handlers.onShowShortcuts && {
      id: 'show-shortcuts',
      description: 'Show keyboard shortcuts',
      category: 'global',
      key: '?',
      modifiers: { shift: true },
      handler: handlers.onShowShortcuts
    },
    
    handlers.onShowShortcuts && {
      id: 'show-shortcuts-alt',
      description: 'Show keyboard shortcuts (alt)',
      category: 'global',
      key: '/',
      modifiers: { meta: true },
      handler: handlers.onShowShortcuts,
      preventDefault: true
    },
    
    // Toggle sidebar
    handlers.onToggleSidebar && {
      id: 'toggle-sidebar',
      description: 'Toggle sidebar',
      category: 'global',
      key: 'b',
      modifiers: { meta: true },
      handler: handlers.onToggleSidebar,
      preventDefault: true
    },
    
    // Navigation shortcuts (sequence: g + key)
    handlers.onGoHome && {
      id: 'go-home',
      description: 'Go to Dashboard',
      category: 'navigation',
      key: 'g+h',
      sequence: true,
      handler: handlers.onGoHome
    },
    
    handlers.onGoJobs && {
      id: 'go-jobs',
      description: 'Go to Jobs',
      category: 'navigation',
      key: 'g+j',
      sequence: true,
      handler: handlers.onGoJobs
    },
    
    handlers.onGoBuilders && {
      id: 'go-builders',
      description: 'Go to Builders',
      category: 'navigation',
      key: 'g+b',
      sequence: true,
      handler: handlers.onGoBuilders
    },
    
    handlers.onGoPhotos && {
      id: 'go-photos',
      description: 'Go to Photos',
      category: 'navigation',
      key: 'g+p',
      sequence: true,
      handler: handlers.onGoPhotos
    },
    
    handlers.onGoSchedule && {
      id: 'go-schedule',
      description: 'Go to Schedule',
      category: 'navigation',
      key: 'g+s',
      sequence: true,
      handler: handlers.onGoSchedule
    },
    
    handlers.onGoEquipment && {
      id: 'go-equipment',
      description: 'Go to Equipment',
      category: 'navigation',
      key: 'g+e',
      sequence: true,
      handler: handlers.onGoEquipment
    }
  ].filter(Boolean) as ShortcutConfig[];
  
  useKeyboardShortcuts(shortcuts);
}

/**
 * Get all active shortcuts (for display in shortcuts modal)
 */
export function useActiveShortcuts(shortcuts: ShortcutConfig[]) {
  return shortcuts.filter(s => s.enabled !== false);
}

/**
 * Format shortcut keys for display
 */
export function formatShortcut(shortcut: ShortcutConfig): string {
  const parts: string[] = [];
  const mods = shortcut.modifiers || {};
  
  // Detect OS for proper key labels
  const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
  
  if (mods.ctrl || mods.meta) {
    parts.push(isMac ? '⌘' : 'Ctrl');
  }
  
  if (mods.alt) {
    parts.push(isMac ? '⌥' : 'Alt');
  }
  
  if (mods.shift) {
    parts.push(isMac ? '⇧' : 'Shift');
  }
  
  // Handle key
  const key = Array.isArray(shortcut.key) ? shortcut.key[0] : shortcut.key;
  
  if (shortcut.sequence) {
    // Format sequence shortcuts (e.g., "g+h" -> "g then h")
    parts.push(key.replace('+', ' then '));
  } else {
    // Format key name
    const keyName = key.length === 1 
      ? key.toUpperCase() 
      : key.charAt(0).toUpperCase() + key.slice(1);
    parts.push(keyName);
  }
  
  return parts.join(isMac ? '' : '+');
}
