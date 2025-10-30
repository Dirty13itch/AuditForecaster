# UI/UX STANDARDS
## Beautiful, Polished Interface Standards for Energy Auditing Field Application

**Version:** 1.0.0  
**Last Updated:** October 30, 2025  
**Status:** Active  
**Owner:** Design & Engineering Team

---

## Table of Contents

1. [Design Philosophy](#1-design-philosophy)
2. [Visual Hierarchy](#2-visual-hierarchy)
3. [Color & Contrast](#3-color--contrast)
4. [Typography](#4-typography)
5. [Spacing & Layout](#5-spacing--layout)
6. [Components - Loading States](#6-components---loading-states)
7. [Components - Empty States](#7-components---empty-states)
8. [Components - Error States](#8-components---error-states)
9. [Components - Forms](#9-components---forms)
10. [Components - Tables & Lists](#10-components---tables--lists)
11. [Components - Modals & Dialogs](#11-components---modals--dialogs)
12. [Components - Navigation](#12-components---navigation)
13. [Micro-interactions](#13-micro-interactions)
14. [Animation Principles](#14-animation-principles)
15. [Accessibility Checklist](#15-accessibility-checklist)
16. [Mobile Responsiveness](#16-mobile-responsiveness)
17. [Performance & Perceived Speed](#17-performance--perceived-speed)
18. [Dark Mode Standards](#18-dark-mode-standards)
19. [Field-Specific Requirements](#19-field-specific-requirements)
20. [Code Examples & Patterns](#20-code-examples--patterns)

---

## 1. Design Philosophy

### 1.1 User-Centered Design Principles

**The user's goals are our goals.** Every design decision must answer: "How does this help a field inspector complete their job faster, more accurately, and with less frustration?"

#### Core Principles:

**1. Respect the user's time**
- Every tap should accomplish something meaningful
- No unnecessary confirmation dialogs ("Are you sure you want to save?")
- Provide smart defaults so users rarely need to configure anything
- Auto-save everything—users shouldn't worry about losing work

**2. Reduce cognitive load**
- One primary action per screen (clear "what do I do next?")
- Hide advanced features until needed (progressive disclosure)
- Use familiar patterns (don't reinvent standard interactions)
- Consistent terminology across the app ("Job" not sometimes "Project")

**3. Design for real-world conditions**
- Direct sunlight readability (high contrast mode)
- Glove-friendly touch targets (48x48px minimum)
- Offline-first (no network ≠ broken app)
- Battery-conscious (minimal animations, efficient rendering)

**4. Earn trust through reliability**
- Never lose user data (auto-save, sync queue, conflict resolution)
- Make errors recoverable (undo, rollback, retry)
- Be transparent about system state (syncing, offline, errors)
- Provide feedback for every action (button pressed, data saved)

**5. Optimize for the expert**
- Keyboard shortcuts for power users
- Bulk actions for repetitive tasks
- Templates and presets for common workflows
- Learn from user behavior (suggest frequently used options)

---

### 1.2 Field-First Mobile Experience

**Mobile is not an afterthought—it's the primary platform.** Field inspectors use this app on Samsung Galaxy S23 Ultra devices in challenging environments:

- **Outdoors in bright sunlight** → High contrast mode, readable colors
- **Wearing gloves** → 48x48px touch targets, simplified interactions
- **Spotty network** → Offline-first, sync queue, local storage
- **Time pressure** → Fast workflows, minimal taps, smart defaults
- **Dusty/wet conditions** → Simple, forgiving UI (no micro-interactions)

**Design checklist:**
- ✅ Can I use this with gloves on?
- ✅ Can I read this in direct sunlight?
- ✅ Does it work offline?
- ✅ Can I complete this task in <30 seconds?
- ✅ Will it survive a phone call interruption?

---

### 1.3 Progressive Disclosure

**Simple by default, powerful when needed.**

Don't overwhelm users with every feature at once. Reveal complexity gradually as users need it.

**Examples:**

**Bad: Everything visible at once**
```tsx
// ❌ Overwhelming form with 20 fields visible
<form>
  <Input label="Address" />
  <Input label="City" />
  <Input label="State" />
  <Input label="ZIP" />
  <Input label="Contractor Name" />
  <Input label="Contractor Phone" />
  <Input label="Contractor Email" />
  <Input label="Builder Name" />
  <Input label="Builder Contact" />
  {/* 11 more fields... */}
</form>
```

**Good: Progressive disclosure**
```tsx
// ✅ Start simple, expand as needed
<form>
  <Input label="Address" required />
  <Select label="Inspector" required />
  <DatePicker label="Scheduled Date" required />
  
  <Collapsible>
    <CollapsibleTrigger>
      <Button variant="ghost">
        Advanced Options (Optional)
      </Button>
    </CollapsibleTrigger>
    <CollapsibleContent>
      <Input label="Contractor Name" />
      <Input label="Builder Reference" />
      <Input label="Custom Notes" />
    </CollapsibleContent>
  </Collapsible>
  
  <Button type="submit">Create Job</Button>
</form>
```

**Pattern: Three-tier information hierarchy**

1. **Primary information** - Always visible (job address, status)
2. **Secondary information** - Visible on hover/expand (inspector notes, metadata)
3. **Tertiary information** - Hidden in "More Details" (audit logs, system fields)

---

### 1.4 Consistency Over Novelty

**Boring is good. Predictable is better.**

Users learn patterns. Once they know how to create a job, creating a builder should feel familiar. Don't surprise them with different interactions for similar tasks.

**Consistency checklist:**

✅ **Consistent terminology**
- Always "Job" (not sometimes "Inspection" or "Project")
- Always "Inspector" (not sometimes "Technician" or "Auditor")
- Always "Builder" (not sometimes "Contractor" or "Developer")

✅ **Consistent colors**
- Green = Success/Complete
- Yellow = Warning/Pending
- Red = Error/Failed
- Blue = Primary action

✅ **Consistent patterns**
- Create button always top-right
- Cancel button always left of primary action
- Destructive actions always require confirmation
- Forms always save on submit (no separate "Save" button)

✅ **Consistent iconography**
- Camera icon = Photo capture
- Cloud icon = Sync status
- Checkmark = Completed
- Exclamation = Warning/Error

---

### 1.5 Reference Applications

We learn from the best. Here's what we emulate:

#### **Linear: Speed & Keyboard-First Design**

**What they do well:**
- Instant feedback (no spinners, everything feels local-first)
- Keyboard shortcuts everywhere (Cmd+K command palette)
- Smart search (fuzzy matching, recent items prioritized)
- Clean, minimal UI (no clutter, plenty of whitespace)

**What we adopt:**
- Optimistic updates (assume success, rollback on error)
- Command palette for quick navigation (Cmd+K)
- Minimal loading states (skeleton loaders, not spinners)
- Fast animations (150-200ms, not 500ms+)

**Example: Optimistic job status update**
```tsx
// Linear-inspired optimistic update
const updateJobStatus = useMutation({
  mutationFn: (data) => apiRequest('/api/jobs/:id', { method: 'PATCH', data }),
  onMutate: async (newStatus) => {
    // Cancel outgoing refetches
    await queryClient.cancelQueries({ queryKey: ['/api/jobs', jobId] });
    
    // Snapshot previous value
    const previousJob = queryClient.getQueryData(['/api/jobs', jobId]);
    
    // Optimistically update UI
    queryClient.setQueryData(['/api/jobs', jobId], (old) => ({
      ...old,
      status: newStatus
    }));
    
    return { previousJob };
  },
  onError: (err, newStatus, context) => {
    // Rollback on error
    queryClient.setQueryData(['/api/jobs', jobId], context.previousJob);
    toast.error('Failed to update status. Please try again.');
  },
  onSuccess: () => {
    toast.success('Status updated successfully');
  }
});
```

---

#### **Figma: Intuitiveness & Real-Time Collaboration**

**What they do well:**
- Multiplayer cursors (see what teammates are doing)
- Conflict-free editing (operational transformation)
- Undo/redo that works (complex state management)
- Contextual toolbars (tools appear when needed)

**What we adopt:**
- Real-time sync indicators (show who's editing)
- Conflict resolution UI (when two users edit same field)
- Contextual actions (bulk operations toolbar when selecting)
- Undo/redo for complex operations (photo annotation)

**Example: Conflict resolution dialog**
```tsx
// Figma-inspired conflict resolution
function ConflictResolutionDialog({ localVersion, serverVersion, onResolve }) {
  return (
    <Dialog>
      <DialogHeader>
        <DialogTitle>Conflict Detected</DialogTitle>
        <DialogDescription>
          This job was modified by {serverVersion.modifiedBy} while you were editing.
          Choose which version to keep:
        </DialogDescription>
      </DialogHeader>
      
      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Your Changes</CardTitle>
          </CardHeader>
          <CardContent>
            <DiffView old={serverVersion} new={localVersion} />
          </CardContent>
          <CardFooter>
            <Button onClick={() => onResolve('local')}>
              Keep My Changes
            </Button>
          </CardFooter>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Server Changes ({serverVersion.modifiedBy})</CardTitle>
          </CardHeader>
          <CardContent>
            <DiffView old={localVersion} new={serverVersion} />
          </CardContent>
          <CardFooter>
            <Button variant="outline" onClick={() => onResolve('server')}>
              Keep Server Changes
            </Button>
          </CardFooter>
        </Card>
      </div>
    </Dialog>
  );
}
```

---

#### **Stripe: Clarity & Developer Experience**

**What they do well:**
- Error messages that teach (explain what went wrong AND how to fix it)
- Comprehensive documentation (examples for every use case)
- Consistent API design (predictable patterns)
- Testing in production (test mode, sample data)

**What we adopt:**
- Helpful error messages (no "Error 500", explain what happened)
- Contextual help (tooltips, inline docs)
- Dev mode indicators (clear when using test data)
- API-like consistency (forms behave like API calls)

**Example: Stripe-quality error messages**
```tsx
// ❌ Bad error message
"Validation failed"

// ✅ Good error message (Stripe-inspired)
function ValidationError({ field, error }) {
  const errorMessages = {
    'address_required': {
      title: 'Address is required',
      description: 'Every job must have a physical address for the inspector to visit.',
      action: 'Enter the property address in the format: 123 Main St, City, ST 12345'
    },
    'inspector_unavailable': {
      title: 'Inspector not available',
      description: 'The selected inspector is already scheduled for another job at this time.',
      action: 'Choose a different time slot or assign a different inspector'
    }
  };
  
  const msg = errorMessages[error.code] || {
    title: 'Invalid input',
    description: error.message,
    action: 'Please check your input and try again'
  };
  
  return (
    <Alert variant="destructive">
      <AlertCircle className="h-4 w-4" />
      <AlertTitle>{msg.title}</AlertTitle>
      <AlertDescription>
        {msg.description}
        <div className="mt-2 text-sm font-medium">
          How to fix: {msg.action}
        </div>
      </AlertDescription>
    </Alert>
  );
}
```

---

#### **Apple: Polish & Attention to Detail**

**What they do well:**
- Haptic feedback (tactile confirmation of actions)
- Smooth animations (spring physics, natural motion)
- Dark mode done right (not just inverted colors)
- Accessibility built-in (VoiceOver, Dynamic Type)

**What we adopt:**
- Micro-animations (button press, checkbox toggle)
- Dark mode with intentional color palette
- Accessibility-first (keyboard nav, screen readers)
- Attention to detail (consistent spacing, aligned elements)

**Example: Apple-quality button press animation**
```tsx
// Apple-inspired button with haptic-like feedback
function AnimatedButton({ children, onClick, ...props }) {
  const [isPressed, setIsPressed] = useState(false);
  
  return (
    <Button
      {...props}
      className="transition-transform active:scale-95"
      onPointerDown={() => setIsPressed(true)}
      onPointerUp={() => setIsPressed(false)}
      onClick={onClick}
    >
      {children}
    </Button>
  );
}
```

---

## 2. Visual Hierarchy

### 2.1 Typography Scale

**Use 6-8 levels to create clear information hierarchy.**

Our typography scale is optimized for outdoor readability with a 16px base size (never smaller for body text).

| Level | Size | Weight | Usage | Example |
|-------|------|--------|-------|---------|
| **Hero** | 48px (3rem) | Bold (700) | Dashboard titles, marketing | "Welcome back, Alex" |
| **H1** | 32px (2rem) | Bold (700) | Page titles | "Jobs" |
| **H2** | 24px (1.5rem) | Semi-bold (600) | Section headers | "Pending Inspections" |
| **H3** | 20px (1.25rem) | Semi-bold (600) | Card titles | "123 Main Street" |
| **Body** | 16px (1rem) | Regular (400) | Body text, descriptions | "Scheduled for Nov 1, 2025" |
| **Label** | 14px (0.875rem) | Medium (500) | Form labels, metadata | "Inspector" |
| **Caption** | 12px (0.75rem) | Regular (400) | Timestamps, footnotes | "Last updated 2 hours ago" |

**Code example:**
```tsx
// Typography system with semantic components
export function Typography({ variant, children, className, ...props }) {
  const variants = {
    hero: "text-5xl font-bold tracking-tight",
    h1: "text-3xl font-bold",
    h2: "text-2xl font-semibold",
    h3: "text-xl font-semibold",
    body: "text-base font-normal",
    label: "text-sm font-medium",
    caption: "text-xs font-normal text-muted-foreground"
  };
  
  const Tag = {
    hero: 'h1',
    h1: 'h1',
    h2: 'h2',
    h3: 'h3',
    body: 'p',
    label: 'span',
    caption: 'span'
  }[variant] || 'p';
  
  return (
    <Tag className={cn(variants[variant], className)} {...props}>
      {children}
    </Tag>
  );
}

// Usage
<Typography variant="h1">Jobs</Typography>
<Typography variant="body">123 Main Street, Springfield</Typography>
<Typography variant="caption">Updated 5 minutes ago</Typography>
```

---

### 2.2 Color System

**Our color system uses semantic naming for clarity and consistency.**

#### **Primary Colors**
- **Primary** (`--primary`): #2E5BBA (Professional Blue) - Main actions, active states
- **Success** (`--success`): #28A745 (Success Green) - Completed, passed
- **Warning** (`--warning`): #FFC107 (Attention Yellow) - Pending, caution
- **Destructive** (`--destructive`): #DC3545 (Alert Red) - Errors, delete actions
- **Info** (`--info`): #17A2B8 (Info Blue) - Informational messages

#### **Surface Hierarchy**
- **Background** (`--background`): Lightest surface (page canvas)
- **Card** (`--card`): Elevated surface (cards, panels)
- **Popover** (`--popover`): Floating surface (dropdowns, tooltips)
- **Sidebar** (`--sidebar`): Navigation surface

#### **Semantic Usage**

```tsx
// Status badge colors
function getStatusColor(status: string) {
  return {
    'completed': 'success',      // Green
    'in_progress': 'info',        // Blue
    'pending': 'warning',         // Yellow
    'failed': 'destructive',      // Red
    'cancelled': 'secondary'      // Gray
  }[status] || 'secondary';
}

// Usage in component
<Badge variant={getStatusColor(job.status)}>
  {job.status}
</Badge>
```

---

### 2.3 Spacing System

**Use multiples of 4px for consistent rhythm.**

Our spacing scale ensures visual harmony and predictable layouts:

| Token | Size | Usage |
|-------|------|-------|
| `space-1` | 4px | Tight spacing (icon padding) |
| `space-2` | 8px | Small spacing (inline elements) |
| `space-3` | 12px | Compact spacing (button padding) |
| `space-4` | 16px | Medium spacing (card content) |
| `space-6` | 24px | Large spacing (section gaps) |
| `space-8` | 32px | XL spacing (page sections) |
| `space-12` | 48px | XXL spacing (major sections) |

**Tailwind mapping:**
```tsx
// ✅ Good: Using spacing scale
<Card className="p-6">          {/* 24px padding */}
  <CardHeader className="pb-4">  {/* 16px bottom padding */}
    <CardTitle>Job Details</CardTitle>
  </CardHeader>
  <CardContent className="space-y-4">  {/* 16px vertical gaps */}
    <div>Address: 123 Main St</div>
    <div>Inspector: Alex Johnson</div>
  </CardContent>
</Card>

// ❌ Bad: Arbitrary values
<Card className="p-[17px]">    {/* Not in spacing scale */}
  <CardHeader className="pb-[13px]">
    <CardTitle>Job Details</CardTitle>
  </CardHeader>
</Card>
```

---

### 2.4 Elevation Levels

**Use elevation to show hierarchy and interactivity.**

| Level | Usage | Shadow | Example |
|-------|-------|--------|---------|
| **Flat** | Default surface | None | Page background |
| **Raised** | Cards, panels | Subtle (2px) | Job card |
| **Floating** | Modals, dropdowns | Medium (8px) | Dialog, popover |
| **Elevated** | Active/hover state | Increased | Card hover |

**Implementation:**
```tsx
// Elevation via hover-elevate utility
<Card className="hover-elevate">  {/* Subtle elevation on hover */}
  <CardContent>
    Job details here
  </CardContent>
</Card>

// Floating elements (dialogs, popovers)
<Dialog>
  <DialogContent className="shadow-xl">  {/* High elevation */}
    Dialog content
  </DialogContent>
</Dialog>
```

---

### 2.5 Icon Usage

**Icons must be consistent in size and semantic meaning.**

#### **Size Standards**
- **Inline icons**: 16px (h-4 w-4) - Next to text
- **Button icons**: 20px (h-5 w-5) - Inside buttons
- **Large icons**: 24px (h-6 w-6) - Feature illustrations
- **Hero icons**: 48px+ (h-12 w-12+) - Empty states

#### **Semantic Consistency**
```tsx
// ✅ Consistent icon usage
const ICONS = {
  job: ClipboardList,
  inspector: User,
  photo: Camera,
  sync: Cloud,
  offline: WifiOff,
  success: CheckCircle,
  warning: AlertTriangle,
  error: XCircle,
  info: Info
};

// Usage
function JobCard({ job }) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <ICONS.job className="h-5 w-5" />
          <CardTitle>{job.address}</CardTitle>
        </div>
      </CardHeader>
    </Card>
  );
}
```

---

## 3. Color & Contrast

### 3.1 Light Mode Color Palette

Our light mode palette prioritizes outdoor readability with high contrast between text and backgrounds.

**Base Colors:**
```css
:root {
  --background: 0 0% 98%;           /* #F9F9F9 - Off-white, reduces glare */
  --foreground: 210 10% 15%;        /* #22272E - Dark gray, not pure black */
  --card: 0 0% 100%;                /* #FFFFFF - Pure white for cards */
  --card-foreground: 210 10% 15%;   /* Same as foreground */
  --border: 210 8% 88%;             /* #DCDFE3 - Subtle borders */
  
  /* Primary action color */
  --primary: 220 60% 45%;           /* #2E5BBA - Professional blue */
  --primary-foreground: 0 0% 100%;  /* #FFFFFF - White text on primary */
  
  /* Semantic colors */
  --success: 134 61% 41%;           /* #28A745 - Success green */
  --warning: 45 100% 51%;           /* #FFC107 - Warning yellow */
  --destructive: 354 70% 54%;       /* #DC3545 - Error red */
  --info: 199 89% 48%;              /* #17A2B8 - Info blue */
}
```

**Contrast validation:**
```tsx
// All text colors meet WCAG AA standards (4.5:1 minimum)
const CONTRAST_RATIOS = {
  'foreground on background': 12.8,      // ✅ Excellent
  'primary-foreground on primary': 8.2,  // ✅ Excellent
  'muted-foreground on background': 4.6, // ✅ Passes AA
  'border on background': 3.2            // ✅ Passes UI minimum (3:1)
};
```

---

### 3.2 Dark Mode Color Palette

**Dark mode is intentionally designed—not just inverted light mode.**

Key principles:
- Not pure black (reduces eye strain)
- Reduced contrast (easier on eyes in low light)
- Slightly desaturated colors (less harsh)
- Adjusted shadows (elevation via borders)

```css
.dark {
  --background: 210 4% 10%;            /* #181A1F - Dark gray, not black */
  --foreground: 0 0% 95%;              /* #F2F2F2 - Off-white */
  --card: 210 4% 12%;                  /* #1C1E24 - Slightly lighter than bg */
  --card-foreground: 0 0% 95%;         /* Same as foreground */
  --border: 210 5% 20%;                /* #2F3339 - Subtle borders */
  
  /* Primary action color (slightly brighter) */
  --primary: 220 63% 35%;              /* #1E3A8A - Darker blue */
  --primary-foreground: 0 0% 100%;     /* White text */
  
  /* Semantic colors (desaturated) */
  --success: 134 61% 35%;              /* Darker green */
  --warning: 45 100% 45%;              /* Darker yellow */
  --destructive: 354 70% 48%;          /* Darker red */
  --info: 199 89% 42%;                 /* Darker blue */
}
```

**Dark mode implementation:**
```tsx
// Automatic dark mode detection with manual override
function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(() => {
    // Check localStorage first
    const stored = localStorage.getItem('theme');
    if (stored) return stored;
    
    // Fall back to system preference
    return window.matchMedia('(prefers-color-scheme: dark)').matches 
      ? 'dark' 
      : 'light';
  });
  
  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
    localStorage.setItem('theme', theme);
  }, [theme]);
  
  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}
```

---

### 3.3 Outdoor Readability (High Contrast Mode)

**Field inspectors work in direct sunlight—we need maximum contrast.**

High contrast mode requirements:
- Pure black text on pure white backgrounds
- No subtle grays (everything is high contrast)
- Thicker borders (2px instead of 1px)
- No shadows (borders only)
- Increased font weights

```tsx
// High contrast mode toggle
function HighContrastToggle() {
  const [highContrast, setHighContrast] = useState(false);
  
  useEffect(() => {
    document.documentElement.classList.toggle('high-contrast', highContrast);
    localStorage.setItem('high-contrast', highContrast);
  }, [highContrast]);
  
  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={() => setHighContrast(!highContrast)}
      aria-label="Toggle high contrast mode"
    >
      <Sun className="h-5 w-5" />
    </Button>
  );
}

// High contrast CSS overrides
.high-contrast {
  --background: 0 0% 100%;      /* Pure white */
  --foreground: 0 0% 0%;        /* Pure black */
  --border: 0 0% 0%;            /* Black borders */
  --primary: 220 100% 30%;      /* Darker blue */
  
  /* Thicker borders */
  * {
    border-width: 2px !important;
  }
  
  /* No shadows */
  * {
    box-shadow: none !important;
  }
  
  /* Heavier font weights */
  body {
    font-weight: 500;
  }
}
```

---

### 3.4 Accessibility Compliance (WCAG 2.1 AA)

**All text must meet 4.5:1 contrast ratio. All UI elements must meet 3:1.**

**Testing checklist:**
- ✅ Body text on background: ≥4.5:1
- ✅ Labels on background: ≥4.5:1
- ✅ Button text on button background: ≥4.5:1
- ✅ Border on background: ≥3:1
- ✅ Icon on background: ≥3:1
- ✅ Focus indicators: ≥3:1

**Automated testing:**
```tsx
// Example: Contrast checker in Storybook
import { checkContrast } from '@storybook/addon-a11y';

export default {
  title: 'Components/Button',
  component: Button,
  parameters: {
    a11y: {
      config: {
        rules: [
          {
            id: 'color-contrast',
            enabled: true,
            // Enforce WCAG AA
            options: { level: 'AA' }
          }
        ]
      }
    }
  }
};
```

---

### 3.5 Semantic Color Usage

**Colors should convey meaning consistently across the app.**

| Color | Meaning | Usage | Example |
|-------|---------|-------|---------|
| **Green** | Success, completed, pass | Status badges, checkmarks | "Job completed" |
| **Yellow** | Warning, pending, attention | Pending status, alerts | "Review required" |
| **Red** | Error, failed, danger | Error messages, delete | "Validation failed" |
| **Blue** | Info, primary action | Primary buttons, links | "Create job" |
| **Gray** | Neutral, inactive | Disabled states, secondary | "Cancelled" |

**Implementation:**
```tsx
// Semantic color components
function StatusBadge({ status }: { status: JobStatus }) {
  const variants = {
    completed: 'success',
    in_progress: 'info',
    pending: 'warning',
    failed: 'destructive',
    cancelled: 'secondary'
  };
  
  const icons = {
    completed: CheckCircle,
    in_progress: Clock,
    pending: AlertTriangle,
    failed: XCircle,
    cancelled: Ban
  };
  
  const Icon = icons[status];
  
  return (
    <Badge variant={variants[status]}>
      <Icon className="h-3 w-3 mr-1" />
      {status.replace('_', ' ')}
    </Badge>
  );
}
```

---

## 4. Typography

### 4.1 Font Stack (System Fonts for Performance)

**Use system fonts for instant rendering—no web font loading.**

```css
:root {
  --font-sans: 
    /* Apple */
    -apple-system, 
    BlinkMacSystemFont,
    /* Segoe UI for Windows */
    "Segoe UI",
    /* Android */
    Roboto,
    /* Fallback */
    "Helvetica Neue",
    Arial,
    sans-serif,
    /* Emoji */
    "Apple Color Emoji",
    "Segoe UI Emoji",
    "Segoe UI Symbol";
}
```

**Why system fonts?**
- ✅ Zero network requests
- ✅ Instant rendering (no FOUT/FOIT)
- ✅ Familiar to users (matches OS)
- ✅ Optimized for each platform
- ✅ Reduces bundle size

**For branding (if needed):**
```tsx
// Only load custom fonts for marketing pages
import { Inter } from 'next/font/google';

const inter = Inter({ 
  subsets: ['latin'],
  display: 'swap',  // Show fallback immediately
  preload: true     // Preload for faster rendering
});
```

---

### 4.2 Size Scale

**Our type scale is optimized for readability on mobile devices.**

| Size | Pixels | Rem | Usage | Line Height |
|------|--------|-----|-------|-------------|
| xs | 12px | 0.75rem | Timestamps, captions | 1.4 |
| sm | 14px | 0.875rem | Labels, metadata | 1.5 |
| **base** | **16px** | **1rem** | **Body text** | **1.5** |
| lg | 18px | 1.125rem | Lead text | 1.5 |
| xl | 20px | 1.25rem | Card titles | 1.4 |
| 2xl | 24px | 1.5rem | Section headers | 1.3 |
| 3xl | 32px | 2rem | Page titles | 1.2 |
| 4xl | 48px | 3rem | Hero text | 1.1 |

**Never go below 16px for body text** (outdoor readability requirement).

```tsx
// Type scale component
function Text({ size = 'base', children, className, ...props }) {
  const sizes = {
    xs: 'text-xs',
    sm: 'text-sm',
    base: 'text-base',
    lg: 'text-lg',
    xl: 'text-xl',
    '2xl': 'text-2xl',
    '3xl': 'text-3xl',
    '4xl': 'text-4xl'
  };
  
  return (
    <span className={cn(sizes[size], className)} {...props}>
      {children}
    </span>
  );
}
```

---

### 4.3 Line Height

**Generous line height improves readability, especially on mobile.**

- **Body text (16px+)**: 1.5 (24px line height for 16px text)
- **Headings**: 1.2-1.3 (tighter for visual impact)
- **Captions/Labels**: 1.4 (still comfortable)
- **Dense tables**: 1.3 (compact but readable)

```css
/* Global line heights */
body {
  line-height: 1.5;
}

h1, h2, h3, h4, h5, h6 {
  line-height: 1.2;
}

.text-xs, .text-sm {
  line-height: 1.4;
}
```

---

### 4.4 Font Weights

**Use semantic weights—not arbitrary values.**

| Weight | Value | Usage |
|--------|-------|-------|
| Regular | 400 | Body text, descriptions |
| Medium | 500 | Labels, metadata |
| Semibold | 600 | Card titles, section headers |
| Bold | 700 | Page titles, emphasis |

**Don't use:**
- ❌ 300 (Light) - Too thin for outdoor readability
- ❌ 800/900 (Extra Bold) - Too heavy, reduces readability

```tsx
// Semantic weight components
<p className="font-normal">Regular body text</p>
<span className="font-medium">Field label</span>
<h3 className="font-semibold">Card title</h3>
<h1 className="font-bold">Page title</h1>
```

---

### 4.5 Letter Spacing

**Tighter spacing for headings, normal for body.**

```css
/* Tight spacing for large headings (improves visual impact) */
.text-3xl, .text-4xl {
  letter-spacing: -0.02em;  /* -2% */
}

/* Normal spacing for body text */
.text-base {
  letter-spacing: 0em;
}

/* Slightly looser for all-caps labels */
.uppercase {
  letter-spacing: 0.05em;  /* +5% */
}
```

**Example:**
```tsx
<h1 className="text-4xl font-bold tracking-tight">
  Welcome Back
</h1>

<Badge className="uppercase tracking-wider">
  Pending
</Badge>
```

---

## 5. Spacing & Layout

### 5.1 Responsive Breakpoints

**Mobile-first approach with three breakpoints.**

```tsx
// Tailwind breakpoints
const BREAKPOINTS = {
  mobile: '0px',      // Default (no prefix)
  tablet: '640px',    // sm:
  desktop: '1024px'   // lg:
};

// Usage
<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
  {/* 1 column mobile, 2 tablet, 3 desktop */}
</div>
```

**Design priorities:**
1. **Mobile (<640px)**: Primary design target (field inspectors)
2. **Tablet (640-1024px)**: Landscape inspection mode
3. **Desktop (>1024px)**: Office review/reporting

---

### 5.2 Grid System

**12-column grid with consistent gutters.**

```tsx
// Standard grid layout
<div className="grid grid-cols-12 gap-6">
  {/* Sidebar: 3 columns */}
  <aside className="col-span-12 lg:col-span-3">
    <Sidebar />
  </aside>
  
  {/* Main content: 9 columns */}
  <main className="col-span-12 lg:col-span-9">
    <Content />
  </main>
</div>

// Dashboard grid (auto-fit)
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
  <MetricCard />
  <MetricCard />
  <MetricCard />
</div>
```

**Gutter sizes:**
- Mobile: 16px (gap-4)
- Tablet/Desktop: 24px (gap-6)

---

### 5.3 Container Max-Widths

**Prevent content from becoming too wide on large screens.**

```tsx
// Centered container with max-width
<div className="container mx-auto px-4 max-w-7xl">
  <Content />
</div>

// Reading width for long-form content
<article className="max-w-2xl mx-auto">
  <p>Long-form text is easier to read at 65-75 characters per line.</p>
</article>
```

**Max-width guidelines:**
- **Full app container**: 1280px (max-w-7xl)
- **Reading content**: 672px (max-w-2xl)
- **Forms**: 576px (max-w-lg)
- **Modals**: 512px (max-w-md)

---

### 5.4 Touch Targets (Minimum 48x48px)

**CRITICAL: All interactive elements must be at least 48x48px.**

This is non-negotiable for field usability with gloves.

```tsx
// ✅ Good: Meets 48px minimum
<Button size="default">        {/* min-h-12 = 48px */}
  Create Job
</Button>

<Checkbox />                   {/* 24px visual + 24px padding = 48px */}

<Button size="icon">           {/* 48x48px square */}
  <Camera className="h-5 w-5" />
</Button>

// ❌ Bad: Too small
<button className="h-8 w-8">  {/* Only 32px! */}
  <X className="h-4 w-4" />
</button>
```

**Testing:**
```tsx
// Visual indicator for touch target size (dev mode)
function TouchTargetDebugger() {
  if (process.env.NODE_ENV !== 'development') return null;
  
  return (
    <style>{`
      button, a, input, [role="button"] {
        outline: 2px dashed orange !important;
        outline-offset: 2px !important;
      }
      
      button:not([min-height~="3rem"]), 
      a:not([min-height~="3rem"]) {
        outline-color: red !important;
      }
    `}</style>
  );
}
```

---

### 5.5 Whitespace Usage

**Whitespace creates visual hierarchy and improves scannability.**

**Principles:**
1. **More space around important elements** (draws attention)
2. **Less space between related items** (shows grouping)
3. **Consistent spacing within components** (predictable)

```tsx
// ✅ Good: Generous whitespace
<Card className="p-6">
  <CardHeader className="pb-4">
    <CardTitle>Job Details</CardTitle>
  </CardHeader>
  
  <CardContent className="space-y-4">
    <div className="space-y-2">
      <Label>Address</Label>
      <p>123 Main Street</p>
    </div>
    
    <div className="space-y-2">
      <Label>Inspector</Label>
      <p>Alex Johnson</p>
    </div>
  </CardContent>
</Card>

// ❌ Bad: Cramped
<Card className="p-2">
  <CardHeader className="pb-1">
    <CardTitle>Job Details</CardTitle>
  </CardHeader>
  <CardContent className="space-y-1">
    {/* Everything too tight */}
  </CardContent>
</Card>
```

---

## 6. Components - Loading States

### 6.1 Skeleton Loaders (Matching Content Structure)

**Show the shape of content while it loads—reduces perceived latency.**

```tsx
// Skeleton loader for job card
function JobCardSkeleton() {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <Skeleton className="h-6 w-48" />  {/* Title */}
          <Skeleton className="h-6 w-20" />  {/* Badge */}
        </div>
      </CardHeader>
      
      <CardContent className="space-y-3">
        <div className="flex items-center gap-2">
          <Skeleton className="h-4 w-4" />   {/* Icon */}
          <Skeleton className="h-4 w-32" />  {/* Address */}
        </div>
        
        <div className="flex items-center gap-2">
          <Skeleton className="h-4 w-4" />   {/* Icon */}
          <Skeleton className="h-4 w-24" />  {/* Date */}
        </div>
      </CardContent>
      
      <CardFooter className="gap-2">
        <Skeleton className="h-12 w-full" /> {/* Button */}
      </CardFooter>
    </Card>
  );
}

// Usage in list
function JobsList() {
  const { data: jobs, isLoading } = useQuery({ queryKey: ['/api/jobs'] });
  
  if (isLoading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <JobCardSkeleton key={i} />
        ))}
      </div>
    );
  }
  
  return (
    <div className="space-y-4">
      {jobs.map(job => <JobCard key={job.id} job={job} />)}
    </div>
  );
}
```

---

### 6.2 Spinner Usage (Small Operations)

**Use spinners sparingly—only for actions that take <3 seconds.**

```tsx
// Button with loading spinner
function LoadingButton({ isLoading, children, ...props }) {
  return (
    <Button disabled={isLoading} {...props}>
      {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
      {children}
    </Button>
  );
}

// Usage
function CreateJobButton() {
  const { mutate, isPending } = useMutation({
    mutationFn: createJob
  });
  
  return (
    <LoadingButton
      isLoading={isPending}
      onClick={() => mutate(jobData)}
    >
      {isPending ? 'Creating...' : 'Create Job'}
    </LoadingButton>
  );
}
```

---

### 6.3 Progress Bars (Large Operations)

**For long operations (>3 seconds), show progress.**

```tsx
// Progress bar for photo upload
function PhotoUploadProgress({ file, progress, onCancel }) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center gap-4">
          <Image className="h-12 w-12 object-cover rounded" />
          
          <div className="flex-1 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">{file.name}</span>
              <span className="text-sm text-muted-foreground">
                {progress}%
              </span>
            </div>
            
            <Progress value={progress} className="h-2" />
          </div>
          
          <Button
            variant="ghost"
            size="icon"
            onClick={onCancel}
            aria-label="Cancel upload"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
```

---

### 6.4 Optimistic Updates

**Assume success, update UI immediately, rollback on error.**

```tsx
// Optimistic toggle for job completion
function CompleteJobButton({ job }) {
  const queryClient = useQueryClient();
  
  const { mutate } = useMutation({
    mutationFn: (jobId) => 
      apiRequest(`/api/jobs/${jobId}`, {
        method: 'PATCH',
        data: { status: 'completed' }
      }),
    
    // Optimistically update UI
    onMutate: async (jobId) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['/api/jobs', jobId] });
      
      // Snapshot previous value
      const previous = queryClient.getQueryData(['/api/jobs', jobId]);
      
      // Optimistically update
      queryClient.setQueryData(['/api/jobs', jobId], (old) => ({
        ...old,
        status: 'completed',
        completedAt: new Date().toISOString()
      }));
      
      // Return snapshot for rollback
      return { previous, jobId };
    },
    
    // Rollback on error
    onError: (err, variables, context) => {
      queryClient.setQueryData(
        ['/api/jobs', context.jobId], 
        context.previous
      );
      toast.error('Failed to complete job. Please try again.');
    },
    
    // Success toast
    onSuccess: () => {
      toast.success('Job marked as completed');
    }
  });
  
  return (
    <Button onClick={() => mutate(job.id)} variant="success">
      <CheckCircle className="mr-2 h-4 w-4" />
      Complete Job
    </Button>
  );
}
```

---

### 6.5 Infinite Scroll Indicators

**Show loading state at bottom of list during pagination.**

```tsx
// Infinite scroll with loading indicator
function InfiniteJobsList() {
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage
  } = useInfiniteQuery({
    queryKey: ['/api/jobs'],
    queryFn: ({ pageParam = 0 }) => 
      fetch(`/api/jobs?offset=${pageParam}&limit=20`).then(r => r.json()),
    getNextPageParam: (lastPage, pages) => 
      lastPage.hasMore ? pages.length * 20 : undefined
  });
  
  const loadMoreRef = useRef(null);
  
  // Intersection observer for auto-load
  useEffect(() => {
    const observer = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage) {
        fetchNextPage();
      }
    });
    
    if (loadMoreRef.current) {
      observer.observe(loadMoreRef.current);
    }
    
    return () => observer.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);
  
  return (
    <div className="space-y-4">
      {data?.pages.map((page, i) => (
        <Fragment key={i}>
          {page.jobs.map(job => <JobCard key={job.id} job={job} />)}
        </Fragment>
      ))}
      
      {/* Loading indicator */}
      <div ref={loadMoreRef} className="py-4">
        {isFetchingNextPage && (
          <div className="flex justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        )}
        
        {!hasNextPage && data && (
          <p className="text-center text-sm text-muted-foreground">
            No more jobs to load
          </p>
        )}
      </div>
    </div>
  );
}
```

---

## 7. Components - Empty States

### 7.1 Helpful Illustrations (Not Just "No Data")

**Empty states are an opportunity to guide users, not just inform them.**

```tsx
// Empty state for jobs list
function EmptyJobsState({ onCreateJob }) {
  return (
    <Card className="text-center p-12">
      <div className="mx-auto w-24 h-24 rounded-full bg-muted flex items-center justify-center mb-6">
        <ClipboardList className="h-12 w-12 text-muted-foreground" />
      </div>
      
      <Typography variant="h2" className="mb-2">
        No jobs yet
      </Typography>
      
      <Typography variant="body" className="text-muted-foreground mb-6">
        Get started by creating your first inspection job.
        You can assign it to an inspector and schedule a date.
      </Typography>
      
      <Button size="lg" onClick={onCreateJob}>
        <Plus className="mr-2 h-5 w-5" />
        Create Your First Job
      </Button>
      
      {/* Quick tips */}
      <div className="mt-8 text-left max-w-md mx-auto">
        <Typography variant="label" className="block mb-2">
          Quick tips:
        </Typography>
        <ul className="space-y-2 text-sm text-muted-foreground">
          <li>• Jobs can be created manually or imported from calendar</li>
          <li>• Assign inspectors based on location and availability</li>
          <li>• Set reminders to notify inspectors before appointments</li>
        </ul>
      </div>
    </Card>
  );
}
```

---

### 7.2 Context-Aware Messaging

**Different empty states for different contexts.**

```tsx
// Context-aware empty states
function EmptyState({ context, onAction }) {
  const states = {
    'no-jobs': {
      icon: ClipboardList,
      title: 'No jobs yet',
      description: 'Create your first inspection job to get started.',
      action: 'Create Job',
      tips: [
        'Jobs can be created manually or imported from calendar',
        'Assign inspectors based on location and availability'
      ]
    },
    
    'no-results': {
      icon: Search,
      title: 'No results found',
      description: 'Try adjusting your search or filters.',
      action: 'Clear Filters',
      tips: [
        'Check your spelling',
        'Try broader search terms',
        'Remove some filters'
      ]
    },
    
    'no-photos': {
      icon: Camera,
      title: 'No photos yet',
      description: 'Capture photos during your inspection to document findings.',
      action: 'Take Photo',
      tips: [
        'Photos are automatically tagged with location and timestamp',
        'You can annotate photos with drawings and notes',
        'Photos sync automatically when online'
      ]
    },
    
    'offline': {
      icon: WifiOff,
      title: 'You\'re offline',
      description: 'Your changes are being saved locally and will sync when you reconnect.',
      action: null,
      tips: [
        'You can continue working offline',
        'Changes will sync automatically when online',
        'Queued changes: 3 pending'
      ]
    }
  };
  
  const state = states[context];
  const Icon = state.icon;
  
  return (
    <Card className="text-center p-12">
      <div className="mx-auto w-24 h-24 rounded-full bg-muted flex items-center justify-center mb-6">
        <Icon className="h-12 w-12 text-muted-foreground" />
      </div>
      
      <Typography variant="h2" className="mb-2">
        {state.title}
      </Typography>
      
      <Typography variant="body" className="text-muted-foreground mb-6">
        {state.description}
      </Typography>
      
      {state.action && (
        <Button size="lg" onClick={onAction}>
          {state.action}
        </Button>
      )}
      
      {state.tips && (
        <div className="mt-8 text-left max-w-md mx-auto">
          <ul className="space-y-2 text-sm text-muted-foreground">
            {state.tips.map((tip, i) => (
              <li key={i}>• {tip}</li>
            ))}
          </ul>
        </div>
      )}
    </Card>
  );
}
```

---

## 8. Components - Error States

### 8.1 User-Friendly Error Messages

**No stack traces. Explain what happened and how to fix it.**

```tsx
// Error alert component
function ErrorAlert({ error, onRetry, onDismiss }) {
  // Map error codes to user-friendly messages
  const getErrorMessage = (error) => {
    const messages = {
      'NETWORK_ERROR': {
        title: 'Connection problem',
        description: 'Unable to reach the server. Please check your internet connection.',
        action: 'Try Again',
        icon: WifiOff
      },
      'VALIDATION_ERROR': {
        title: 'Invalid input',
        description: error.message || 'Please check your input and try again.',
        action: 'Fix Input',
        icon: AlertCircle
      },
      'UNAUTHORIZED': {
        title: 'Session expired',
        description: 'Your session has expired. Please log in again.',
        action: 'Log In',
        icon: Lock
      },
      'NOT_FOUND': {
        title: 'Not found',
        description: 'The requested item could not be found. It may have been deleted.',
        action: 'Go Back',
        icon: Search
      },
      'SERVER_ERROR': {
        title: 'Something went wrong',
        description: 'An unexpected error occurred. Our team has been notified.',
        action: 'Try Again',
        icon: AlertTriangle
      }
    };
    
    return messages[error.code] || messages['SERVER_ERROR'];
  };
  
  const msg = getErrorMessage(error);
  const Icon = msg.icon;
  
  return (
    <Alert variant="destructive">
      <Icon className="h-4 w-4" />
      <AlertTitle>{msg.title}</AlertTitle>
      <AlertDescription>
        {msg.description}
        
        <div className="mt-4 flex gap-2">
          {onRetry && (
            <Button
              variant="outline"
              size="sm"
              onClick={onRetry}
            >
              {msg.action}
            </Button>
          )}
          
          {onDismiss && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onDismiss}
            >
              Dismiss
            </Button>
          )}
        </div>
      </AlertDescription>
    </Alert>
  );
}
```

---

### 8.2 Inline Validation (Field-Level Feedback)

**Validate on blur, not on keystroke (less annoying).**

```tsx
// Form with inline validation
function JobForm() {
  const form = useForm({
    resolver: zodResolver(insertJobSchema),
    defaultValues: {
      address: '',
      inspectorId: '',
      scheduledDate: ''
    }
  });
  
  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="address"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Address</FormLabel>
              <FormControl>
                <Input
                  {...field}
                  placeholder="123 Main St, City, ST 12345"
                  data-testid="input-address"
                  // Validate on blur, not on change
                  onBlur={() => form.trigger('address')}
                />
              </FormControl>
              <FormMessage />  {/* Shows error inline */}
            </FormItem>
          )}
        />
        
        <FormField
          control={form.control}
          name="inspectorId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Inspector</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select inspector" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="inspector-1">Alex Johnson</SelectItem>
                  <SelectItem value="inspector-2">Jamie Smith</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <Button type="submit" className="w-full">
          Create Job
        </Button>
      </form>
    </Form>
  );
}
```

---

### 8.3 Toast Notifications (Auto-Dismiss)

**Show success/error toasts that auto-dismiss after 5 seconds.**

```tsx
// Toast notification system
function useNotifications() {
  const { toast } = useToast();
  
  return {
    success: (message: string) => {
      toast({
        title: 'Success',
        description: message,
        variant: 'default',
        duration: 5000  // Auto-dismiss after 5s
      });
    },
    
    error: (message: string, action?: { label: string; onClick: () => void }) => {
      toast({
        title: 'Error',
        description: message,
        variant: 'destructive',
        duration: 7000,  // Longer for errors
        action: action && (
          <ToastAction altText={action.label} onClick={action.onClick}>
            {action.label}
          </ToastAction>
        )
      });
    },
    
    info: (message: string) => {
      toast({
        title: 'Info',
        description: message,
        variant: 'default',
        duration: 5000
      });
    },
    
    // Persistent toast (doesn't auto-dismiss)
    persistent: (message: string, action: { label: string; onClick: () => void }) => {
      toast({
        title: 'Action Required',
        description: message,
        variant: 'default',
        duration: Infinity,  // Never auto-dismiss
        action: (
          <ToastAction altText={action.label} onClick={action.onClick}>
            {action.label}
          </ToastAction>
        )
      });
    }
  };
}

// Usage
function CreateJobButton() {
  const notify = useNotifications();
  const { mutate } = useMutation({
    mutationFn: createJob,
    onSuccess: () => {
      notify.success('Job created successfully');
    },
    onError: (error) => {
      notify.error('Failed to create job', {
        label: 'Try Again',
        onClick: () => mutate()
      });
    }
  });
  
  return <Button onClick={() => mutate()}>Create Job</Button>;
}
```

---

## 9. Components - Forms

### 9.1 Form Best Practices

**Well-designed forms reduce errors and improve completion rates.**

**Principles:**
1. **Labels above inputs** (easier to scan)
2. **Required fields marked** (asterisk or "Required" badge)
3. **Placeholder text for examples** (not labels)
4. **Validate on blur** (not on keystroke)
5. **Clear error messages** (what's wrong + how to fix)
6. **Success feedback** (checkmark, toast)
7. **Auto-save when possible** (reduce anxiety)

---

### 9.2 Form Example with Best Practices

```tsx
// Complete form example with all best practices
function JobCreateForm({ onSuccess }) {
  const form = useForm({
    resolver: zodResolver(insertJobSchema),
    defaultValues: {
      address: '',
      inspectorId: '',
      scheduledDate: '',
      notes: ''
    }
  });
  
  const { mutate, isPending } = useMutation({
    mutationFn: (data) => apiRequest('/api/jobs', { method: 'POST', data }),
    onSuccess: (job) => {
      toast.success('Job created successfully');
      onSuccess(job);
    },
    onError: (error) => {
      toast.error(error.message);
    }
  });
  
  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit((data) => mutate(data))} className="space-y-6">
        {/* Address field (required) */}
        <FormField
          control={form.control}
          name="address"
          render={({ field }) => (
            <FormItem>
              <FormLabel>
                Address
                <Badge variant="destructive" className="ml-2">Required</Badge>
              </FormLabel>
              <FormControl>
                <Input
                  {...field}
                  placeholder="123 Main St, City, ST 12345"
                  onBlur={() => form.trigger('address')}
                  data-testid="input-address"
                />
              </FormControl>
              <FormDescription>
                Enter the complete property address for the inspection
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        
        {/* Inspector field (required) */}
        <FormField
          control={form.control}
          name="inspectorId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>
                Inspector
                <Badge variant="destructive" className="ml-2">Required</Badge>
              </FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger data-testid="select-inspector">
                    <SelectValue placeholder="Select an inspector" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="inspector-1">Alex Johnson</SelectItem>
                  <SelectItem value="inspector-2">Jamie Smith</SelectItem>
                  <SelectItem value="inspector-3">Morgan Davis</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
        
        {/* Date field (required) */}
        <FormField
          control={form.control}
          name="scheduledDate"
          render={({ field }) => (
            <FormItem>
              <FormLabel>
                Scheduled Date
                <Badge variant="destructive" className="ml-2">Required</Badge>
              </FormLabel>
              <FormControl>
                <Input
                  {...field}
                  type="date"
                  min={new Date().toISOString().split('T')[0]}
                  data-testid="input-date"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        {/* Notes field (optional) */}
        <FormField
          control={form.control}
          name="notes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Notes (Optional)</FormLabel>
              <FormControl>
                <Textarea
                  {...field}
                  placeholder="Any special instructions or notes for the inspector..."
                  rows={4}
                  data-testid="input-notes"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        {/* Form actions */}
        <div className="flex gap-2 justify-end">
          <Button
            type="button"
            variant="outline"
            onClick={() => form.reset()}
            disabled={isPending}
          >
            Reset
          </Button>
          
          <Button type="submit" disabled={isPending}>
            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isPending ? 'Creating...' : 'Create Job'}
          </Button>
        </div>
      </form>
    </Form>
  );
}
```

---

### 9.3 Auto-Save Indicators

**Show when forms are auto-saving (reduces anxiety).**

```tsx
// Auto-save form field
function AutoSaveField({ name, label, defaultValue }) {
  const [value, setValue] = useState(defaultValue);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  
  // Debounced save
  const debouncedSave = useMemo(
    () =>
      debounce(async (newValue) => {
        setSaveStatus('saving');
        try {
          await apiRequest('/api/jobs/:id', {
            method: 'PATCH',
            data: { [name]: newValue }
          });
          setSaveStatus('saved');
          
          // Reset to idle after 2s
          setTimeout(() => setSaveStatus('idle'), 2000);
        } catch (error) {
          setSaveStatus('idle');
          toast.error('Failed to save changes');
        }
      }, 1000),
    [name]
  );
  
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setValue(newValue);
    debouncedSave(newValue);
  };
  
  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <Label>{label}</Label>
        
        {/* Save status indicator */}
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          {saveStatus === 'saving' && (
            <>
              <Loader2 className="h-3 w-3 animate-spin" />
              <span>Saving...</span>
            </>
          )}
          {saveStatus === 'saved' && (
            <>
              <Check className="h-3 w-3 text-success" />
              <span className="text-success">Saved</span>
            </>
          )}
        </div>
      </div>
      
      <Input value={value} onChange={handleChange} />
    </div>
  );
}
```

---

## 10. Components - Tables & Lists

### 10.1 Responsive Tables (Desktop vs Mobile)

**Tables become cards on mobile for better readability.**

```tsx
// Responsive table/card view
function JobsTable({ jobs }) {
  const isMobile = useMediaQuery('(max-width: 768px)');
  
  if (isMobile) {
    // Card view on mobile
    return (
      <div className="space-y-4">
        {jobs.map(job => (
          <Card key={job.id} className="hover-elevate">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">{job.address}</CardTitle>
                <Badge variant={getStatusVariant(job.status)}>
                  {job.status}
                </Badge>
              </div>
            </CardHeader>
            
            <CardContent className="space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <User className="h-4 w-4 text-muted-foreground" />
                <span>{job.inspectorName}</span>
              </div>
              
              <div className="flex items-center gap-2 text-sm">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span>{formatDate(job.scheduledDate)}</span>
              </div>
            </CardContent>
            
            <CardFooter className="gap-2">
              <Button variant="outline" size="sm" className="flex-1">
                View
              </Button>
              <Button size="sm" className="flex-1">
                Edit
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>
    );
  }
  
  // Table view on desktop
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Address</TableHead>
          <TableHead>Inspector</TableHead>
          <TableHead>Scheduled</TableHead>
          <TableHead>Status</TableHead>
          <TableHead className="text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {jobs.map(job => (
          <TableRow key={job.id} className="hover-elevate">
            <TableCell className="font-medium">{job.address}</TableCell>
            <TableCell>{job.inspectorName}</TableCell>
            <TableCell>{formatDate(job.scheduledDate)}</TableCell>
            <TableCell>
              <Badge variant={getStatusVariant(job.status)}>
                {job.status}
              </Badge>
            </TableCell>
            <TableCell className="text-right">
              <div className="flex gap-2 justify-end">
                <Button variant="ghost" size="sm">View</Button>
                <Button variant="ghost" size="sm">Edit</Button>
              </div>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
```

---

### 10.2 Sortable Columns

**Allow users to sort table data by clicking column headers.**

```tsx
// Sortable table
function SortableJobsTable({ jobs }) {
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  
  const handleSort = (column: string) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
  };
  
  const sortedJobs = useMemo(() => {
    if (!sortColumn) return jobs;
    
    return [...jobs].sort((a, b) => {
      const aValue = a[sortColumn];
      const bValue = b[sortColumn];
      
      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  }, [jobs, sortColumn, sortDirection]);
  
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>
            <Button
              variant="ghost"
              onClick={() => handleSort('address')}
              className="hover-elevate"
            >
              Address
              {sortColumn === 'address' && (
                sortDirection === 'asc' ? <ChevronUp className="ml-2 h-4 w-4" /> : <ChevronDown className="ml-2 h-4 w-4" />
              )}
            </Button>
          </TableHead>
          
          <TableHead>
            <Button
              variant="ghost"
              onClick={() => handleSort('scheduledDate')}
              className="hover-elevate"
            >
              Scheduled Date
              {sortColumn === 'scheduledDate' && (
                sortDirection === 'asc' ? <ChevronUp className="ml-2 h-4 w-4" /> : <ChevronDown className="ml-2 h-4 w-4" />
              )}
            </Button>
          </TableHead>
          
          <TableHead>Status</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {sortedJobs.map(job => (
          <TableRow key={job.id}>
            <TableCell>{job.address}</TableCell>
            <TableCell>{formatDate(job.scheduledDate)}</TableCell>
            <TableCell>
              <Badge variant={getStatusVariant(job.status)}>
                {job.status}
              </Badge>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
```

---

### 10.3 Bulk Selection

**Allow users to select multiple rows for bulk actions.**

```tsx
// Bulk selection table
function BulkSelectTable({ jobs, onBulkAction }) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  
  const toggleAll = () => {
    if (selectedIds.size === jobs.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(jobs.map(j => j.id)));
    }
  };
  
  const toggleRow = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };
  
  return (
    <>
      {/* Bulk actions toolbar */}
      {selectedIds.size > 0 && (
        <div className="flex items-center gap-4 p-4 bg-muted rounded-lg mb-4">
          <span className="font-medium">
            {selectedIds.size} selected
          </span>
          
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onBulkAction('assign', Array.from(selectedIds))}
            >
              Assign Inspector
            </Button>
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => onBulkAction('export', Array.from(selectedIds))}
            >
              Export
            </Button>
            
            <Button
              variant="destructive"
              size="sm"
              onClick={() => onBulkAction('delete', Array.from(selectedIds))}
            >
              Delete
            </Button>
          </div>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSelectedIds(new Set())}
            className="ml-auto"
          >
            Clear Selection
          </Button>
        </div>
      )}
      
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-12">
              <Checkbox
                checked={selectedIds.size === jobs.length}
                onCheckedChange={toggleAll}
                aria-label="Select all"
              />
            </TableHead>
            <TableHead>Address</TableHead>
            <TableHead>Inspector</TableHead>
            <TableHead>Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {jobs.map(job => (
            <TableRow key={job.id}>
              <TableCell>
                <Checkbox
                  checked={selectedIds.has(job.id)}
                  onCheckedChange={() => toggleRow(job.id)}
                  aria-label={`Select ${job.address}`}
                />
              </TableCell>
              <TableCell>{job.address}</TableCell>
              <TableCell>{job.inspectorName}</TableCell>
              <TableCell>
                <Badge variant={getStatusVariant(job.status)}>
                  {job.status}
                </Badge>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </>
  );
}
```

---

## 11. Components - Modals & Dialogs

### 11.1 Modal Best Practices

**Modals interrupt the user—use them sparingly and make them delightful.**

**Principles:**
1. **Clear primary action** (one obvious thing to do)
2. **Escape key to close** (always)
3. **Click outside to close** (for non-critical dialogs)
4. **Focus trap** (keyboard navigation stays in modal)
5. **Confirmation for destructive actions** (double-check before deleting)
6. **Loading state in modal** (don't close during async operations)
7. **Size appropriateness** (don't overwhelm with massive dialogs)

---

### 11.2 Modal Example with Focus Trap

```tsx
// Modal with all best practices
function JobDeleteDialog({ job, open, onOpenChange }) {
  const [isDeleting, setIsDeleting] = useState(false);
  
  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await apiRequest(`/api/jobs/${job.id}`, { method: 'DELETE' });
      toast.success('Job deleted successfully');
      onOpenChange(false);
    } catch (error) {
      toast.error('Failed to delete job');
      setIsDeleting(false);
    }
  };
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Delete Job</DialogTitle>
          <DialogDescription>
            Are you sure you want to delete this job? This action cannot be undone.
          </DialogDescription>
        </DialogHeader>
        
        {/* Job details for confirmation */}
        <Card>
          <CardContent className="pt-6 space-y-2">
            <div>
              <span className="text-sm font-medium">Address:</span>
              <p className="text-sm text-muted-foreground">{job.address}</p>
            </div>
            <div>
              <span className="text-sm font-medium">Inspector:</span>
              <p className="text-sm text-muted-foreground">{job.inspectorName}</p>
            </div>
          </CardContent>
        </Card>
        
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isDeleting}
          >
            Cancel
          </Button>
          
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={isDeleting}
          >
            {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isDeleting ? 'Deleting...' : 'Delete Job'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

---

### 11.3 Bottom Sheet (Mobile Alternative)

**On mobile, prefer bottom sheets over centered modals.**

```tsx
// Bottom sheet for mobile
function MobileJobDialog({ job, open, onOpenChange }) {
  const isMobile = useMediaQuery('(max-width: 768px)');
  
  if (isMobile) {
    // Use bottom sheet on mobile
    return (
      <Drawer open={open} onOpenChange={onOpenChange}>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>{job.address}</DrawerTitle>
            <DrawerDescription>
              Job Details
            </DrawerDescription>
          </DrawerHeader>
          
          <div className="p-4 space-y-4">
            <div>
              <Label>Inspector</Label>
              <p>{job.inspectorName}</p>
            </div>
            
            <div>
              <Label>Scheduled Date</Label>
              <p>{formatDate(job.scheduledDate)}</p>
            </div>
            
            <div>
              <Label>Status</Label>
              <Badge variant={getStatusVariant(job.status)}>
                {job.status}
              </Badge>
            </div>
          </div>
          
          <DrawerFooter>
            <Button className="w-full">Edit Job</Button>
            <DrawerClose asChild>
              <Button variant="outline" className="w-full">
                Close
              </Button>
            </DrawerClose>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    );
  }
  
  // Use centered dialog on desktop
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        {/* Desktop dialog content */}
      </DialogContent>
    </Dialog>
  );
}
```

---

## 12. Components - Navigation

### 12.1 Active State Clarity

**Users should always know where they are.**

```tsx
// Sidebar navigation with active states
function AppNavigation() {
  const [location] = useLocation();
  
  const navItems = [
    { path: '/', label: 'Dashboard', icon: Home },
    { path: '/jobs', label: 'Jobs', icon: ClipboardList },
    { path: '/schedule', label: 'Schedule', icon: Calendar },
    { path: '/photos', label: 'Photos', icon: Camera },
    { path: '/reports', label: 'Reports', icon: FileText }
  ];
  
  return (
    <Sidebar>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Main Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = location === item.path;
                
                return (
                  <SidebarMenuItem key={item.path}>
                    <SidebarMenuButton
                      asChild
                      isActive={isActive}
                      data-testid={`nav-${item.label.toLowerCase()}`}
                    >
                      <Link href={item.path}>
                        <Icon className="h-5 w-5" />
                        <span>{item.label}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
```

---

### 12.2 Breadcrumbs for Deep Hierarchies

**Show the path to current page.**

```tsx
// Breadcrumb navigation
function PageBreadcrumbs({ items }) {
  return (
    <Breadcrumb>
      <BreadcrumbList>
        <BreadcrumbItem>
          <BreadcrumbLink href="/">
            <Home className="h-4 w-4" />
          </BreadcrumbLink>
        </BreadcrumbItem>
        
        {items.map((item, index) => (
          <Fragment key={item.href}>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              {index === items.length - 1 ? (
                <BreadcrumbPage>{item.label}</BreadcrumbPage>
              ) : (
                <BreadcrumbLink href={item.href}>
                  {item.label}
                </BreadcrumbLink>
              )}
            </BreadcrumbItem>
          </Fragment>
        ))}
      </BreadcrumbList>
    </Breadcrumb>
  );
}

// Usage
<PageBreadcrumbs
  items={[
    { label: 'Jobs', href: '/jobs' },
    { label: '123 Main Street', href: `/jobs/${jobId}` },
    { label: 'Photos', href: `/jobs/${jobId}/photos` }
  ]}
/>
```

---

### 12.3 Keyboard Shortcuts

**Power users love keyboard shortcuts.**

```tsx
// Command palette for keyboard shortcuts
function CommandPalette() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen(true);
      }
    };
    
    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, []);
  
  return (
    <>
      {/* Keyboard shortcut hint */}
      <Button
        variant="outline"
        onClick={() => setOpen(true)}
        className="text-muted-foreground"
      >
        <Search className="mr-2 h-4 w-4" />
        <span>Search...</span>
        <kbd className="ml-auto pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-xs font-medium text-muted-foreground opacity-100">
          <span className="text-xs">⌘</span>K
        </kbd>
      </Button>
      
      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput placeholder="Type a command or search..." />
        <CommandList>
          <CommandEmpty>No results found.</CommandEmpty>
          
          <CommandGroup heading="Navigation">
            <CommandItem onSelect={() => { navigate('/'); setOpen(false); }}>
              <Home className="mr-2 h-4 w-4" />
              <span>Dashboard</span>
            </CommandItem>
            <CommandItem onSelect={() => { navigate('/jobs'); setOpen(false); }}>
              <ClipboardList className="mr-2 h-4 w-4" />
              <span>Jobs</span>
            </CommandItem>
            <CommandItem onSelect={() => { navigate('/schedule'); setOpen(false); }}>
              <Calendar className="mr-2 h-4 w-4" />
              <span>Schedule</span>
            </CommandItem>
          </CommandGroup>
          
          <CommandGroup heading="Actions">
            <CommandItem>
              <Plus className="mr-2 h-4 w-4" />
              <span>Create Job</span>
              <kbd className="ml-auto">⌘N</kbd>
            </CommandItem>
            <CommandItem>
              <Camera className="mr-2 h-4 w-4" />
              <span>Take Photo</span>
              <kbd className="ml-auto">⌘P</kbd>
            </CommandItem>
          </CommandGroup>
        </CommandList>
      </CommandDialog>
    </>
  );
}
```

---

## 13. Micro-interactions

### 13.1 Button Press Animation

**Subtle scale on press provides tactile feedback.**

```tsx
// Animated button with press feedback
function AnimatedButton({ children, onClick, ...props }) {
  return (
    <Button
      {...props}
      className={cn(
        // Scale down slightly on press
        "transition-transform active:scale-95",
        props.className
      )}
      onClick={onClick}
    >
      {children}
    </Button>
  );
}
```

---

### 13.2 Checkbox/Toggle Animations

**Smooth transitions make interactions feel polished.**

```tsx
// Animated checkbox
function AnimatedCheckbox({ checked, onCheckedChange, label }) {
  return (
    <div className="flex items-center gap-2">
      <Checkbox
        checked={checked}
        onCheckedChange={onCheckedChange}
        className={cn(
          "transition-all duration-200",
          checked && "bg-primary border-primary"
        )}
      />
      <Label className="cursor-pointer">
        {label}
      </Label>
    </div>
  );
}

// Animated toggle switch
function AnimatedSwitch({ checked, onCheckedChange, label }) {
  return (
    <div className="flex items-center gap-2">
      <Switch
        checked={checked}
        onCheckedChange={onCheckedChange}
        className="transition-all duration-200"
      />
      <Label>{label}</Label>
    </div>
  );
}
```

---

### 13.3 Drag and Drop Feedback

**Visual feedback during drag operations.**

```tsx
// Drag and drop with visual feedback
function DraggableJobCard({ job, index }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: job.id });
  
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    cursor: isDragging ? 'grabbing' : 'grab'
  };
  
  return (
    <div ref={setNodeRef} style={style} {...attributes}>
      <Card className={cn(
        "transition-all",
        isDragging && "shadow-xl ring-2 ring-primary"
      )}>
        <CardHeader>
          <div className="flex items-center gap-3">
            {/* Drag handle */}
            <button
              {...listeners}
              className="cursor-grab active:cursor-grabbing p-2 hover-elevate rounded"
            >
              <GripVertical className="h-5 w-5 text-muted-foreground" />
            </button>
            
            <CardTitle>{job.address}</CardTitle>
          </div>
        </CardHeader>
      </Card>
    </div>
  );
}
```

---

## 14. Animation Principles

### 14.1 Purposeful Animations

**Every animation must serve a purpose—not just decoration.**

**Good reasons for animation:**
- ✅ **Provide feedback** (button pressed, action completed)
- ✅ **Show relationships** (element moved from A to B)
- ✅ **Direct attention** (important notification)
- ✅ **Maintain context** (modal slides in from edge, not center)
- ✅ **Express brand personality** (subtle, professional)

**Bad reasons for animation:**
- ❌ "It looks cool"
- ❌ Following a trend
- ❌ Hiding poor UX

---

### 14.2 Respect Prefers-Reduced-Motion

**Some users get motion sickness—respect their preferences.**

```tsx
// Respect prefers-reduced-motion
const animations = {
  fadeIn: {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    transition: { duration: 0.2 }
  },
  
  slideIn: {
    initial: { x: -20, opacity: 0 },
    animate: { x: 0, opacity: 1 },
    transition: { duration: 0.3 }
  }
};

// Check user preference
function useReducedMotion() {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mediaQuery.matches);
    
    const handler = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches);
    mediaQuery.addEventListener('change', handler);
    
    return () => mediaQuery.removeEventListener('change', handler);
  }, []);
  
  return prefersReducedMotion;
}

// Animated component with reduced motion support
function AnimatedCard({ children }) {
  const prefersReducedMotion = useReducedMotion();
  
  if (prefersReducedMotion) {
    // No animation
    return <Card>{children}</Card>;
  }
  
  // With animation
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
    >
      <Card>{children}</Card>
    </motion.div>
  );
}
```

---

### 14.3 Animation Duration Guidelines

**Fast animations feel responsive. Slow animations feel sluggish.**

| Duration | Usage | Example |
|----------|-------|---------|
| **100-150ms** | Instant feedback | Button hover, focus states |
| **200-300ms** | Standard transitions | Page transitions, modals |
| **400-500ms** | Complex animations | Layout changes, reordering |
| **1000ms+** | Only with user control | Video playback, progress bars |

```css
/* Global animation settings */
:root {
  --animation-fast: 150ms;
  --animation-medium: 250ms;
  --animation-slow: 400ms;
}

/* Apply to components */
.button {
  transition: all var(--animation-fast) ease;
}

.modal {
  animation: slideIn var(--animation-medium) ease-out;
}

.page {
  transition: opacity var(--animation-slow) ease;
}
```

---

## 15. Accessibility Checklist

### 15.1 Keyboard Navigation

**Every interactive element must be keyboard accessible.**

**Requirements:**
- ✅ Logical tab order (top to bottom, left to right)
- ✅ Visible focus indicators (outline, ring, highlight)
- ✅ Skip links (skip to main content)
- ✅ Keyboard shortcuts (Cmd+K, Escape, Enter)
- ✅ Arrow key navigation (lists, dropdowns)

```tsx
// Accessible button group with keyboard navigation
function ButtonGroup({ items, onSelect }) {
  const [focusedIndex, setFocusedIndex] = useState(0);
  
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowRight') {
      e.preventDefault();
      setFocusedIndex((prev) => (prev + 1) % items.length);
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      setFocusedIndex((prev) => (prev - 1 + items.length) % items.length);
    } else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onSelect(items[focusedIndex]);
    }
  };
  
  return (
    <div
      role="group"
      aria-label="Button group"
      onKeyDown={handleKeyDown}
      className="flex gap-2"
    >
      {items.map((item, index) => (
        <Button
          key={item.id}
          variant={focusedIndex === index ? 'default' : 'outline'}
          onClick={() => onSelect(item)}
          tabIndex={focusedIndex === index ? 0 : -1}
        >
          {item.label}
        </Button>
      ))}
    </div>
  );
}
```

---

### 15.2 Screen Reader Support

**Provide descriptive labels for all interactive elements.**

```tsx
// Screen reader friendly components
function AccessibleButton({ icon: Icon, label, onClick }) {
  return (
    <Button
      onClick={onClick}
      aria-label={label}  // Screen reader announcement
      title={label}       // Tooltip on hover
    >
      <Icon className="h-5 w-5" />
      <span className="sr-only">{label}</span>  {/* Hidden but read by screen readers */}
    </Button>
  );
}

// Live region for dynamic updates
function NotificationList({ notifications }) {
  return (
    <div
      role="region"
      aria-live="polite"
      aria-label="Notifications"
    >
      {notifications.map(notification => (
        <Alert key={notification.id}>
          <AlertTitle>{notification.title}</AlertTitle>
          <AlertDescription>{notification.message}</AlertDescription>
        </Alert>
      ))}
    </div>
  );
}
```

---

### 15.3 Color Not Sole Indicator

**Use icons in addition to color to convey status.**

```tsx
// Status with icon + color
function StatusIndicator({ status }: { status: JobStatus }) {
  const config = {
    completed: {
      icon: CheckCircle,
      variant: 'success',
      label: 'Completed'
    },
    failed: {
      icon: XCircle,
      variant: 'destructive',
      label: 'Failed'
    },
    pending: {
      icon: Clock,
      variant: 'warning',
      label: 'Pending'
    }
  };
  
  const { icon: Icon, variant, label } = config[status];
  
  return (
    <Badge variant={variant}>
      <Icon className="h-3 w-3 mr-1" />  {/* Icon for non-color users */}
      {label}
    </Badge>
  );
}
```

---

## 16. Mobile Responsiveness

### 16.1 Thumb-Friendly Navigation

**Bottom navigation for one-handed use.**

```tsx
// Bottom navigation for mobile
function MobileBottomNav() {
  const [location] = useLocation();
  
  const navItems = [
    { path: '/', icon: Home, label: 'Home' },
    { path: '/jobs', icon: ClipboardList, label: 'Jobs' },
    { path: '/schedule', icon: Calendar, label: 'Schedule' },
    { path: '/photos', icon: Camera, label: 'Photos' }
  ];
  
  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-card border-t md:hidden">
      <div className="grid grid-cols-4 gap-1 p-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = location === item.path;
          
          return (
            <Link
              key={item.path}
              href={item.path}
              className={cn(
                "flex flex-col items-center gap-1 p-2 rounded-lg min-h-[60px]",
                isActive ? "bg-primary text-primary-foreground" : "hover-elevate"
              )}
            >
              <Icon className="h-6 w-6" />
              <span className="text-xs">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
```

---

### 16.2 Mobile-Optimized Forms

**Single-column layout, large inputs, native keyboards.**

```tsx
// Mobile-optimized form
function MobileJobForm() {
  return (
    <form className="space-y-4 p-4">
      {/* Full-width inputs */}
      <div>
        <Label htmlFor="address">Address</Label>
        <Input
          id="address"
          type="text"
          autoComplete="street-address"
          className="h-12 text-base"  {/* Larger for touch */}
          placeholder="123 Main St"
        />
      </div>
      
      {/* Native date picker */}
      <div>
        <Label htmlFor="date">Scheduled Date</Label>
        <Input
          id="date"
          type="date"
          className="h-12 text-base"
        />
      </div>
      
      {/* Native select (better than custom dropdown on mobile) */}
      <div>
        <Label htmlFor="inspector">Inspector</Label>
        <select
          id="inspector"
          className="w-full h-12 px-3 rounded-md border border-input bg-background text-base"
        >
          <option value="">Select inspector...</option>
          <option value="inspector-1">Alex Johnson</option>
          <option value="inspector-2">Jamie Smith</option>
        </select>
      </div>
      
      {/* Full-width button */}
      <Button type="submit" className="w-full h-12">
        Create Job
      </Button>
    </form>
  );
}
```

---

## 17. Performance & Perceived Speed

### 17.1 Image Lazy Loading

**Only load images when they enter the viewport.**

```tsx
// Lazy-loaded image component
function LazyImage({ src, alt, className }) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isInView, setIsInView] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);
  
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setIsInView(true);
        }
      },
      { rootMargin: '100px' }  // Start loading 100px before visible
    );
    
    if (imgRef.current) {
      observer.observe(imgRef.current);
    }
    
    return () => observer.disconnect();
  }, []);
  
  return (
    <div className={cn("relative", className)}>
      {/* Placeholder while loading */}
      {!isLoaded && (
        <Skeleton className="absolute inset-0" />
      )}
      
      {/* Actual image */}
      <img
        ref={imgRef}
        src={isInView ? src : undefined}
        alt={alt}
        onLoad={() => setIsLoaded(true)}
        className={cn(
          "transition-opacity duration-300",
          isLoaded ? "opacity-100" : "opacity-0"
        )}
      />
    </div>
  );
}
```

---

### 17.2 Debounced Search

**Wait for user to stop typing before searching.**

```tsx
// Debounced search input
function DebouncedSearch({ onSearch, placeholder = "Search..." }) {
  const [value, setValue] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  
  const debouncedSearch = useMemo(
    () =>
      debounce((searchTerm: string) => {
        setIsSearching(true);
        onSearch(searchTerm).finally(() => setIsSearching(false));
      }, 300),
    [onSearch]
  );
  
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setValue(newValue);
    debouncedSearch(newValue);
  };
  
  return (
    <div className="relative">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
      <Input
        value={value}
        onChange={handleChange}
        placeholder={placeholder}
        className="pl-10"
      />
      {isSearching && (
        <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
      )}
    </div>
  );
}
```

---

### 17.3 Virtualized Lists

**Only render visible rows (critical for large datasets).**

```tsx
// Virtualized job list
import { useVirtualizer } from '@tanstack/react-virtual';

function VirtualizedJobList({ jobs }) {
  const parentRef = useRef<HTMLDivElement>(null);
  
  const rowVirtualizer = useVirtualizer({
    count: jobs.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 120,  // Estimated row height
    overscan: 5  // Render 5 extra rows above/below viewport
  });
  
  return (
    <div
      ref={parentRef}
      className="h-[600px] overflow-auto"
    >
      <div
        style={{
          height: `${rowVirtualizer.getTotalSize()}px`,
          position: 'relative'
        }}
      >
        {rowVirtualizer.getVirtualItems().map((virtualRow) => {
          const job = jobs[virtualRow.index];
          
          return (
            <div
              key={virtualRow.key}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: `${virtualRow.size}px`,
                transform: `translateY(${virtualRow.start}px)`
              }}
            >
              <JobCard job={job} />
            </div>
          );
        })}
      </div>
    </div>
  );
}
```

---

## 18. Dark Mode Standards

### 18.1 Intentional Dark Palette

**Not pure black—use dark gray for reduced eye strain.**

```css
/* Dark mode colors (intentionally designed) */
.dark {
  /* Not pure black (#000000) - too harsh */
  --background: 210 4% 10%;           /* #181A1F */
  --foreground: 0 0% 95%;             /* #F2F2F2 */
  
  /* Cards slightly lighter than background */
  --card: 210 4% 12%;                 /* #1C1E24 */
  
  /* Reduced contrast for less eye strain */
  --muted: 210 8% 20%;                /* #2F3339 */
  --muted-foreground: 210 8% 60%;     /* #8A8F98 */
  
  /* Slightly desaturated accent colors */
  --primary: 220 63% 35%;             /* Darker blue */
  --success: 134 61% 35%;             /* Darker green */
}
```

---

### 18.2 Dark Mode Toggle

**Let users override system preference.**

```tsx
// Theme toggle with system preference detection
function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon">
          <Sun className="h-5 w-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
          <Moon className="absolute h-5 w-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
          <span className="sr-only">Toggle theme</span>
        </Button>
      </DropdownMenuTrigger>
      
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => setTheme('light')}>
          <Sun className="mr-2 h-4 w-4" />
          Light
        </DropdownMenuItem>
        
        <DropdownMenuItem onClick={() => setTheme('dark')}>
          <Moon className="mr-2 h-4 w-4" />
          Dark
        </DropdownMenuItem>
        
        <DropdownMenuItem onClick={() => setTheme('system')}>
          <Laptop className="mr-2 h-4 w-4" />
          System
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
```

---

## 19. Field-Specific Requirements

### 19.1 Outdoor Readability

**High contrast mode for direct sunlight.**

```tsx
// High contrast toggle for outdoor use
function OutdoorModeToggle() {
  const [isOutdoorMode, setIsOutdoorMode] = useState(false);
  
  useEffect(() => {
    document.documentElement.classList.toggle('outdoor-mode', isOutdoorMode);
  }, [isOutdoorMode]);
  
  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={() => setIsOutdoorMode(!isOutdoorMode)}
      aria-label="Toggle outdoor mode"
      title="High contrast for outdoor visibility"
    >
      <Sun className="h-5 w-5" />
    </Button>
  );
}

// CSS for outdoor mode
.outdoor-mode {
  /* Maximum contrast */
  --background: 0 0% 100%;      /* Pure white */
  --foreground: 0 0% 0%;        /* Pure black */
  --border: 0 0% 0%;            /* Black borders */
  
  /* Thicker borders */
  * {
    border-width: 2px !important;
  }
  
  /* No shadows */
  * {
    box-shadow: none !important;
  }
  
  /* Heavier fonts */
  body {
    font-weight: 500;
  }
}
```

---

### 19.2 Camera Integration

**Seamless photo capture workflow.**

```tsx
// Camera capture component
function PhotoCapture({ onCapture }) {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  const startCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'environment',  // Back camera
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        }
      });
      
      setStream(mediaStream);
      
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (error) {
      toast.error('Camera access denied');
    }
  };
  
  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;
    
    const canvas = canvasRef.current;
    const video = videoRef.current;
    
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    
    const ctx = canvas.getContext('2d');
    ctx?.drawImage(video, 0, 0);
    
    canvas.toBlob((blob) => {
      if (blob) {
        onCapture(blob);
      }
    }, 'image/jpeg', 0.9);
  };
  
  return (
    <div className="relative">
      <video
        ref={videoRef}
        autoPlay
        playsInline
        className="w-full rounded-lg"
      />
      
      <canvas ref={canvasRef} className="hidden" />
      
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-4">
        {!stream ? (
          <Button size="lg" onClick={startCamera}>
            <Camera className="mr-2 h-5 w-5" />
            Open Camera
          </Button>
        ) : (
          <Button size="lg" onClick={capturePhoto}>
            <Camera className="mr-2 h-5 w-5" />
            Capture Photo
          </Button>
        )}
      </div>
    </div>
  );
}
```

---

### 19.3 Offline Indicators

**Clear visual feedback about sync status.**

```tsx
// Sync status indicator
function SyncStatusIndicator() {
  const { isOnline, pendingCount } = useNetworkStatus();
  const { isSyncing } = useSyncQueue();
  
  if (isOnline && !isSyncing && pendingCount === 0) {
    return (
      <div className="flex items-center gap-2 text-success">
        <Cloud className="h-4 w-4" />
        <span className="text-sm">Synced</span>
      </div>
    );
  }
  
  if (isSyncing) {
    return (
      <div className="flex items-center gap-2 text-warning">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span className="text-sm">Syncing...</span>
      </div>
    );
  }
  
  if (!isOnline) {
    return (
      <Badge variant="destructive">
        <WifiOff className="h-3 w-3 mr-1" />
        Offline ({pendingCount} pending)
      </Badge>
    );
  }
  
  return null;
}
```

---

## 20. Code Examples & Patterns

### 20.1 Loading Skeleton Component

```tsx
// Reusable skeleton loader
export function SkeletonCard() {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-6 w-20" />
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4" />
      </CardContent>
      <CardFooter>
        <Skeleton className="h-12 w-full" />
      </CardFooter>
    </Card>
  );
}
```

---

### 20.2 Error Boundary with User-Friendly UI

```tsx
// Error boundary component
class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error: Error | null }
> {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  
  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }
  
  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Error boundary caught:', error, errorInfo);
    // Log to Sentry
    Sentry.captureException(error, { contexts: { react: errorInfo } });
  }
  
  render() {
    if (this.state.hasError) {
      return (
        <div className="flex items-center justify-center min-h-screen p-4">
          <Card className="max-w-md">
            <CardHeader>
              <div className="mx-auto w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center mb-4">
                <AlertTriangle className="h-6 w-6 text-destructive" />
              </div>
              <CardTitle className="text-center">
                Something went wrong
              </CardTitle>
              <CardDescription className="text-center">
                An unexpected error occurred. Our team has been notified.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                className="w-full"
                onClick={() => window.location.reload()}
              >
                Reload Page
              </Button>
            </CardContent>
          </Card>
        </div>
      );
    }
    
    return this.props.children;
  }
}
```

---

### 20.3 Toast Notification System

```tsx
// Toast notification hook
export function useToast() {
  const { toast } = useToast();
  
  return {
    success: (message: string) => {
      toast({
        title: 'Success',
        description: message,
        duration: 5000
      });
    },
    
    error: (message: string) => {
      toast({
        title: 'Error',
        description: message,
        variant: 'destructive',
        duration: 7000
      });
    }
  };
}
```

---

### 20.4 Modal with Focus Trap

```tsx
// Modal with focus trap
export function FocusTrapModal({ open, onClose, children }) {
  const modalRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    if (!open) return;
    
    const handleKeyDown = (e: KeyboardEvent) => {
      // Close on Escape
      if (e.key === 'Escape') {
        onClose();
      }
      
      // Trap focus
      if (e.key === 'Tab') {
        const modal = modalRef.current;
        if (!modal) return;
        
        const focusableElements = modal.querySelectorAll(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        
        const firstElement = focusableElements[0] as HTMLElement;
        const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;
        
        if (e.shiftKey && document.activeElement === firstElement) {
          e.preventDefault();
          lastElement?.focus();
        } else if (!e.shiftKey && document.activeElement === lastElement) {
          e.preventDefault();
          firstElement?.focus();
        }
      }
    };
    
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose]);
  
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent ref={modalRef}>
        {children}
      </DialogContent>
    </Dialog>
  );
}
```

---

### 20.5 Responsive Table/Card View

```tsx
// Responsive data view
export function ResponsiveDataView({ items }) {
  const isMobile = useMediaQuery('(max-width: 768px)');
  
  if (isMobile) {
    return (
      <div className="space-y-4">
        {items.map(item => (
          <Card key={item.id}>
            <CardContent className="pt-6">
              <div className="space-y-2">
                <div>
                  <span className="text-sm font-medium">Name:</span>
                  <p>{item.name}</p>
                </div>
                <div>
                  <span className="text-sm font-medium">Status:</span>
                  <Badge>{item.status}</Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }
  
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Name</TableHead>
          <TableHead>Status</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {items.map(item => (
          <TableRow key={item.id}>
            <TableCell>{item.name}</TableCell>
            <TableCell>
              <Badge>{item.status}</Badge>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
```

---

## Conclusion

These UI/UX standards ensure that every feature we build is:

✅ **Beautiful** - Clean, polished, professional  
✅ **Functional** - Works reliably in real-world conditions  
✅ **Accessible** - Usable by everyone, including screen readers and keyboard-only users  
✅ **Performant** - Fast, responsive, optimized  
✅ **Field-Ready** - Optimized for outdoor inspection work  

Remember: **Good UX is invisible. Users don't notice great design—they just accomplish their goals faster and with less frustration.**

---

**Document Version:** 1.0.0  
**Last Updated:** October 30, 2025  
**Maintained By:** Design & Engineering Team  
**Review Frequency:** Quarterly
