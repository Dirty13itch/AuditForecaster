# Energy Auditing Field Application - Design Guidelines

## Design Approach
**Utility-Focused Field Application** inspired by CompanyCam and iAuditor with emphasis on outdoor readability, offline-first functionality, and rapid data entry for field inspectors working in varying lighting conditions.

## Color System

### Core Palette (Pre-Defined)
- **Primary**: #2E5BBA (Professional Blue) - Main actions, headers, active states
- **Secondary**: #28A745 (Success Green) - Completed items, pass states, positive indicators
- **Warning**: #FFC107 (Attention Yellow) - Pending reviews, caution states
- **Error**: #DC3545 (Alert Red) - Failed items, critical alerts, validation errors
- **Background**: #F8F9FA (Clean Grey) - Main canvas, card backgrounds
- **Text**: #212529 (Dark) - Primary content, labels

### Extended Palette
- **Neutral Grays**: #6C757D (secondary text), #DEE2E6 (borders), #F8F9FA to #FFFFFF (surface variations)
- **Status Colors**: #17A2B8 (info/forecast data), #FD7E14 (offline indicator)
- **Overlay**: rgba(0,0,0,0.5) for photo viewing, rgba(255,255,255,0.95) for modal backgrounds

## Typography

### Font Stack
- **Primary**: Roboto (headings, UI elements, data labels)
- **Secondary**: Open Sans (body text, descriptions, notes)
- Load via Google Fonts CDN with weights: 400, 500, 600, 700

### Type Scale
- **Hero/Dashboard Title**: 32px bold (mobile: 24px)
- **Section Headers**: 24px semi-bold (mobile: 20px)
- **Card Titles**: 18px semi-bold
- **Body Text**: 16px regular (minimum for outdoor readability)
- **Labels/Meta**: 14px medium
- **Captions**: 12px regular

## Layout System

### Spacing Primitives
Use Tailwind units: **4, 6, 8, 12, 16, 24** for consistent rhythm
- Touch targets: minimum 48px (p-3 or h-12)
- Card padding: p-6 (24px) desktop, p-4 (16px) mobile
- Section spacing: space-y-8 or space-y-6
- Grid gaps: gap-6 desktop, gap-4 mobile

### Grid Structure
- **Dashboard**: 3-column grid on desktop (lg:grid-cols-3), 2-col tablet (md:grid-cols-2), single mobile
- **Inspection Lists**: Single column with full-width cards for easy scrolling
- **Photo Gallery**: 3-4 columns desktop, 2 columns mobile (masonry style like CompanyCam)
- **Container**: max-w-7xl with px-4 for main content areas

## Component Library

### Navigation
- **Top Bar**: Fixed position, 64px height, #2E5BBA background with white text
  - Left: Menu/back button, breadcrumbs (desktop)
  - Center: Current job/inspection name
  - Right: Sync status indicator, offline badge, profile
- **Bottom Navigation** (Mobile): Fixed, 64px height, 4-5 primary actions with icons and labels

### Cards (Primary Pattern)
- **Job Cards**: White background, 1px #DEE2E6 border, 8px rounded corners, 4px shadow on hover
  - Header: Job name (18px bold), status badge (top-right)
  - Body: Address, contractor, inspection dates with icons
  - Footer: Progress indicator, primary action button
- **Inspection Item Cards**: Expandable accordion style
  - Collapsed: Checkbox, item number, title, status icon
  - Expanded: Full checklist details, photo upload, notes field

### Forms & Input
- **Text Inputs**: 48px height, 16px font, #DEE2E6 border, 4px rounded, focus: 2px #2E5BBA outline
- **Checkboxes**: 24px custom styled with #28A745 check on white background
- **Dropdowns**: Same height as text inputs, clear visual hierarchy for selected state
- **Photo Upload**: Large drop zone (200px height) with camera icon, "Tap to capture" text
- **Validation States**: 
  - Error: #DC3545 border, error message below
  - Warning: #FFC107 left border accent
  - Success: #28A745 checkmark icon

### Buttons
- **Primary**: #2E5BBA background, white text, 48px height, 8px rounded, full width on mobile
- **Secondary**: White background, #2E5BBA border/text, same dimensions
- **Success**: #28A745 for "Complete" actions
- **Destructive**: #DC3545 for delete/reset actions
- **Icon Buttons**: 48px square minimum for touch targets

### Data Display
- **Forecast Cards**: Large numerical displays with comparison indicators
  - Predicted TDL/DLO: 36px bold numbers, unit labels, confidence percentage
  - Actual Results: Side-by-side comparison with variance percentage in color (green under, red over)
- **Progress Indicators**: Linear bars with percentage, segment counts (e.g., "42/52 items complete")
- **Status Badges**: 24px height, 6px rounded, uppercase 12px text, colored backgrounds with white text

### Photo Management
- **Gallery View**: Masonry grid (CompanyCam style), overlay with metadata on hover
- **Photo Viewer**: Full-screen modal, black background, swipe gestures, zoom capability
- **Thumbnail Strip**: 80px squares in carousel for inspection items

### Offline Indicators
- **Sync Status**: Animated icon in header (green: synced, orange pulsing: syncing, red: offline with queued count)
- **Toast Notifications**: Bottom-center, 48px height, auto-dismiss for status updates

## High Contrast Mode

### Outdoor Visibility Enhancements
- **Toggle**: Accessible from header, persists in localStorage
- **Enhanced Palette**: 
  - Background: Pure white (#FFFFFF)
  - Text: Pure black (#000000)
  - Primary buttons: Darker blue (#1A3A7A) with 2px black border
  - Borders: Thicker (2px) with #000000
  - Shadows: Eliminated, replaced with solid borders

## Responsive Breakpoints
- **Mobile**: < 768px (primary design target for field use)
- **Tablet**: 768px - 1024px (landscape inspection mode)
- **Desktop**: > 1024px (office review/reporting)

## Animation & Transitions
**Minimal animations** to preserve battery and performance:
- Card hover: transform scale(1.02) 150ms ease
- Page transitions: Simple fade 200ms
- Loading states: Subtle spinner, no complex animations
- Photo uploads: Progress bar only, no flourishes

## Images

### Dashboard Hero Section
- **Not applicable** - Utility app launches directly to dashboard with job cards, no marketing hero needed

### Photo Integration
- **Inspection Photos**: User-captured images throughout workflow
  - Location: Within inspection item cards, expandable gallery view
  - Treatment: Thumbnails with metadata overlay (timestamp, item number)
  - Style: Consistent border radius (8px), shadow on selection

### Icon Library
- **Use**: Heroicons via CDN (outline style for consistency with CompanyCam aesthetic)
- **Common Icons**: Camera, check-circle, exclamation-triangle, cloud-upload, wifi-off, map-pin, clipboard-list

## Touch Target Standards (CRITICAL FOR FIELD USE)

### Minimum Touch Target Requirements
**All interactive elements MUST meet a minimum 48x48px touch target** for reliable interaction with gloves on Samsung Galaxy S23 Ultra in outdoor field conditions.

### Component-Specific Standards

#### Buttons
All button sizes have been audited and meet the 48px minimum requirement:
- **size="default"**: min-h-12 (48px) - Standard size for most actions
- **size="sm"**: min-h-12 (48px) - Same as default to ensure accessibility (no smaller buttons allowed)
- **size="lg"**: min-h-14 (56px) - Larger for primary/important actions
- **size="icon"**: h-12 w-12 (48x48px) - Square buttons for icon-only actions

**IMPORTANT**: Never override button sizes with custom height/width classes (e.g., h-6 w-6) as this breaks accessibility.

#### Form Inputs
- **Text Inputs**: h-12 (48px) height - Ensures easy tapping and text entry with gloves
- **Select Dropdowns**: h-12 (48px) trigger height - Matches text input height
- **Select Items**: min-h-12 (48px) with py-3 padding - Each option is easy to tap
- **Textarea**: min-h-20 (80px) - Larger minimum for text areas

#### Selection Controls
- **Checkbox**: h-6 w-6 (24px visual) with p-3 padding = 48px total touch target
  - Visual size kept reasonable while ensuring large clickable area
  - Never override with custom h-* w-* classes
- **Radio Button**: h-6 w-6 (24px visual) with p-3 padding = 48px total touch target
  - Same principle as checkbox for consistency
- **Switch**: h-10 w-[4.5rem] (40px height, 72px width) - Larger for outdoor use

#### Drag Handles
- **Route sorting drag handles**: h-12 w-12 (48x48px) with centered grip icon
- **Schedule drag cards**: min-h-12 (48px) for entire draggable card
- All drag handles use flex centering to ensure easy grip

#### Special Interactive Elements
- **Color picker buttons** (PhotoAnnotator): h-12 w-12 (48x48px) - Enlarged from 32px
- **Navigation buttons**: All use size="icon" (48x48px minimum)
- **Toolbar action buttons**: All use proper Button component sizing
- **Photo gallery interactions**: 
  - Zoom buttons: size="icon" (48x48px)
  - Delete buttons: size="icon" (48x48px) - no size overrides allowed
  - Selection checkboxes: Standard checkbox touch target (48x48px)

### Development Rules

#### DO:
✅ Use standard Button component sizes (default, sm, lg, icon)
✅ Use standard Input, Select, Checkbox components without size overrides
✅ Add min-h-12 or h-12 to custom interactive elements
✅ Test all interactive elements in mobile viewport with touch/tap simulation
✅ Use flex centering for icons inside touch targets

#### DON'T:
❌ Never use h-6, h-8, h-9, h-10, w-6, w-8, w-9, w-10 on buttons
❌ Never override Checkbox/Radio sizes with custom classes
❌ Never create custom clickable elements smaller than 48x48px
❌ Never use "micro" buttons or "tiny" action buttons
❌ Never assume desktop mouse precision - always design for touch

### Testing Checklist
Before deploying any interactive feature:
1. Open in mobile viewport (480px width minimum)
2. Enable DevTools touch emulation
3. Verify all interactive elements are at least 48x48px
4. Test with accessibility features enabled
5. Verify no layout breaks when buttons are larger

## Special Considerations

### Field Usability
- All interactive elements minimum 48px touch target (see Touch Target Standards above)
- Swipe gestures for photo navigation and card actions
- Voice notes capability (future enhancement placeholder)
- GPS location tagging with visual map confirmation

### Offline-First Design
- Clear visual distinction between synced/unsynced data
- Queue counter for pending uploads
- Local storage progress indicators
- Retry mechanisms with user control

### Reporting Interface
- Print-optimized layout with simplified color palette
- Exportable PDF with forecast vs. actual comparison charts
- Before/after photo layouts for corrective action documentation