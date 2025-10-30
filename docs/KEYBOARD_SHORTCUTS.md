# Keyboard Shortcuts Reference

**Energy Auditing Field Application - Version 1.0**

Comprehensive keyboard shortcuts for power users to navigate and perform actions without touching the mouse.

---

## Table of Contents

1. [Overview](#overview)
2. [Global Shortcuts](#global-shortcuts)
3. [Navigation Shortcuts](#navigation-shortcuts)
4. [Action Shortcuts](#action-shortcuts)
5. [Context-Specific Shortcuts](#context-specific-shortcuts)
6. [Keyboard Shortcuts Modal](#keyboard-shortcuts-modal)
7. [Implementation Guide](#implementation-guide)

---

## Overview

Keyboard shortcuts significantly improve productivity for field inspectors who use the application frequently. Our shortcuts are inspired by industry-leading applications like Linear, GitHub, and Vercel.

### Key Principles:
- **Discoverable**: Press `?` or `Cmd/Ctrl + /` to view all shortcuts
- **Consistent**: Similar actions use similar shortcuts across contexts
- **Non-conflicting**: Won't interfere with browser or OS shortcuts
- **Accessible**: Work seamlessly with screen readers and accessibility tools
- **Context-aware**: Shortcuts adapt based on the current page

### Platform Differences:
- **Mac**: Uses `⌘` (Command) as the primary modifier
- **Windows/Linux**: Uses `Ctrl` as the primary modifier
- The application automatically detects your platform and displays the correct shortcuts

---

## Global Shortcuts

These shortcuts work anywhere in the application.

| Shortcut | Action | Description |
|----------|--------|-------------|
| `⌘/Ctrl + K` | Open command palette | Quick access to all app features (future) |
| `⌘/Ctrl + /` | Show keyboard shortcuts | Display this shortcuts reference |
| `?` | Show keyboard shortcuts | Alternative shortcut to show shortcuts |
| `⌘/Ctrl + B` | Toggle sidebar | Show/hide the navigation sidebar |
| `Esc` | Close/Cancel | Close modals, dialogs, or cancel current action |

---

## Navigation Shortcuts

Navigate between pages using sequence shortcuts. Press `g` followed by the page key.

| Shortcut | Destination | Description |
|----------|-------------|-------------|
| `g` then `h` | Dashboard | Go to home/dashboard |
| `g` then `j` | Jobs | Go to jobs list |
| `g` then `b` | Builders | Go to builders |
| `g` then `p` | Photos | Go to photos gallery |
| `g` then `s` | Schedule | Go to calendar/schedule |
| `g` then `e` | Equipment | Go to equipment management |

### How Sequence Shortcuts Work:
1. Press `g` (you have 1 second before the sequence resets)
2. Press the destination key (e.g., `j` for Jobs)
3. You'll be navigated to that page

**Example**: To go to the Photos page, press `g`, then press `p` within 1 second.

---

## Action Shortcuts

Context-aware shortcuts for common actions. The action depends on the current page.

| Shortcut | Action | Context |
|----------|--------|---------|
| `c` | Create new | Creates new item (job, photo, builder, etc.) |
| `e` | Edit selected | Edits currently selected or focused item |
| `d` | Delete selected | Deletes selected item (with confirmation) |
| `/` | Focus search | Moves focus to search input field |
| `n` | Next page | Navigate to next page in pagination |
| `p` | Previous page | Navigate to previous page in pagination |
| `⌘/Ctrl + S` | Save | Save current form or changes |

---

## Context-Specific Shortcuts

### Jobs Page

| Shortcut | Action | Description |
|----------|--------|-------------|
| `c` | New job | Open create job dialog |
| `j` or `↓` | Next job | Select next job in list |
| `k` or `↑` | Previous job | Select previous job in list |
| `Enter` | View/Edit job | Open selected job for editing |
| `/` | Search jobs | Focus the job search input |
| `n` | Next page | Go to next page of jobs |
| `p` | Previous page | Go to previous page of jobs |

### Photos Page

| Shortcut | Action | Description |
|----------|--------|-------------|
| `c` | Upload photos | Open photo upload dialog |
| `Space` | Select/Deselect | Toggle selection on focused photo |
| `Shift + Space` | Multi-select range | Select range from last selected to current |
| `a` | Select all | Select all visible photos |
| `⌘/Ctrl + A` | Select all | Standard select all |
| `Escape` | Clear selection | Deselect all photos |
| `↑ ↓ ← →` | Navigate photos | Move focus between photos |
| `Enter` | View photo | Open photo viewer |
| `/` | Search photos | Focus the photo search/filter input |
| `t` | Tag selected | Add tags to selected photos |
| `Delete` or `Backspace` | Delete selected | Delete selected photos (with confirmation) |

### Builders Page

| Shortcut | Action | Description |
|----------|--------|-------------|
| `c` | New builder | Open create builder dialog |
| `/` | Search builders | Focus the builder search input |
| `j` or `↓` | Next builder | Select next builder in list |
| `k` or `↑` | Previous builder | Select previous builder in list |
| `Enter` | View builder | Open builder detail view |

### Job Detail/Inspection Page

| Shortcut | Action | Description |
|----------|--------|-------------|
| `t` | Add test | Add new test (blower door, duct, etc.) |
| `p` | Add photo | Capture or upload photo |
| `i` | Edit job info | Edit job details |
| `s` | Change status | Open status change dialog |
| `n` | Add note | Add inspector note |

### Schedule/Calendar Page

| Shortcut | Action | Description |
|----------|--------|-------------|
| `c` | Create event | Create new calendar event |
| `t` | Go to today | Jump to today's date |
| `←` | Previous | Go to previous week/month |
| `→` | Next | Go to next week/month |

### Equipment Page

| Shortcut | Action | Description |
|----------|--------|-------------|
| `c` | Check out | Check out equipment |
| `/` | Search equipment | Focus equipment search |
| `k` or `↑` | Previous item | Select previous equipment |
| `j` or `↓` | Next item | Select next equipment |

---

## Keyboard Shortcuts Modal

Press `?` or `⌘/Ctrl + /` to open the keyboard shortcuts modal.

### Features:
- **Categorized shortcuts**: Organized by Global, Navigation, Actions, and Context
- **Search**: Filter shortcuts by name or key
- **Visual keyboard keys**: See exactly which keys to press
- **Context-aware**: Shows shortcuts relevant to current page

### Using the Modal:
1. Open with `?` or `⌘/Ctrl + /`
2. Search shortcuts by typing in the search box
3. Click category tabs to filter by type
4. Press `Esc` to close

---

## Implementation Guide

### For Developers:

#### Using Keyboard Shortcuts in Your Component

```tsx
import { useKeyboardShortcuts, type ShortcutConfig } from "@/hooks/useKeyboardShortcuts";
import { useState } from "react";

export function MyPage() {
  const [selectedItem, setSelectedItem] = useState(null);
  
  // Define shortcuts for this page
  const shortcuts: ShortcutConfig[] = [
    {
      id: 'create-item',
      description: 'Create new item',
      category: 'actions',
      key: 'c',
      handler: () => handleCreate()
    },
    {
      id: 'delete-item',
      description: 'Delete selected item',
      category: 'actions',
      key: 'd',
      handler: () => handleDelete(),
      enabled: !!selectedItem // Only enabled when item is selected
    },
    {
      id: 'save',
      description: 'Save changes',
      category: 'actions',
      key: 's',
      modifiers: { meta: true },
      handler: () => handleSave(),
      preventDefault: true // Prevent browser save dialog
    }
  ];
  
  // Activate shortcuts
  useKeyboardShortcuts(shortcuts);
  
  return <div>...</div>;
}
```

#### Using Global Shortcuts

```tsx
import { useGlobalShortcuts } from "@/hooks/useKeyboardShortcuts";
import { useLocation } from "wouter";

export function App() {
  const [, navigate] = useLocation();
  const [showShortcuts, setShowShortcuts] = useState(false);
  
  useGlobalShortcuts({
    onShowShortcuts: () => setShowShortcuts(true),
    onGoHome: () => navigate('/'),
    onGoJobs: () => navigate('/jobs'),
    onGoPhotos: () => navigate('/photos'),
    // ... other handlers
  });
  
  return (
    <>
      {/* App content */}
      <KeyboardShortcutsModal
        isOpen={showShortcuts}
        onClose={() => setShowShortcuts(false)}
        shortcuts={allShortcuts}
      />
    </>
  );
}
```

#### Conditional Shortcuts

```tsx
import { useConditionalShortcuts } from "@/hooks/useKeyboardShortcuts";

export function PhotoGallery() {
  const [selectionMode, setSelectionMode] = useState(false);
  
  const selectionShortcuts: ShortcutConfig[] = [
    {
      id: 'select-all',
      description: 'Select all photos',
      category: 'actions',
      key: 'a',
      modifiers: { meta: true },
      handler: () => selectAll()
    }
  ];
  
  // Only active when in selection mode
  useConditionalShortcuts(selectionShortcuts, selectionMode);
}
```

### Best Practices:

1. **Don't trigger in input fields**: The hook automatically ignores shortcuts when user is typing
2. **Provide visual feedback**: Show loading state or confirmation when shortcut is triggered
3. **Document new shortcuts**: Add to the modal and this documentation
4. **Test for conflicts**: Ensure your shortcuts don't conflict with browser/OS shortcuts
5. **Make them discoverable**: Add hints in the UI (e.g., "Press 'c' to create")

---

## Accessibility

All keyboard shortcuts are fully accessible:

- **Screen reader compatible**: Shortcuts don't interfere with screen reader navigation
- **Focus management**: Shortcuts respect focus states and tab order
- **Input detection**: Automatically disabled when typing in text fields
- **Visual indicators**: Keyboard keys are visually represented in the shortcuts modal
- **Alternative methods**: All actions have mouse/touch alternatives

---

## FAQ

**Q: Can I customize keyboard shortcuts?**
A: Not currently. Shortcuts are standardized for consistency across all users. Custom shortcuts may be added in a future release.

**Q: What if a shortcut conflicts with my browser?**
A: We've carefully chosen shortcuts that don't conflict with common browser shortcuts. If you encounter a conflict, please report it.

**Q: Do shortcuts work on mobile devices?**
A: Most shortcuts are designed for desktop use. Mobile users should use touch interactions. Bluetooth keyboards on tablets will work with shortcuts.

**Q: How do I remember all these shortcuts?**
A: Start with the most common ones (navigation, create, search). Press `?` anytime to view all shortcuts. You'll naturally memorize the ones you use frequently.

**Q: Can I see shortcuts in the UI?**
A: Some buttons show keyboard hints on hover (e.g., "Save (⌘S)"). We're working on making more shortcuts visible in the UI.

---

## Changelog

### Version 1.0 (Current)
- ✅ Global shortcuts implemented
- ✅ Navigation shortcuts (g + key)
- ✅ Action shortcuts (create, edit, delete)
- ✅ Context-specific shortcuts for Jobs, Photos, Builders
- ✅ Keyboard shortcuts modal
- ✅ Search and filter shortcuts
- ✅ Platform-specific key display (Mac vs Windows)

### Planned (Version 1.1)
- 🔮 Command palette (Cmd+K)
- 🔮 Custom shortcut configuration
- 🔮 Shortcut hints in UI tooltips
- 🔮 More context-specific shortcuts
- 🔮 Vim-style navigation mode (optional)

---

## Support

If you encounter issues with keyboard shortcuts:
1. Check that you're not in an input field when pressing the shortcut
2. Press `?` to verify the shortcut exists and is enabled
3. Check for browser extension conflicts
4. Report bugs to the development team

**Happy navigating! ⌨️**
