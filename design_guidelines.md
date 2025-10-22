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

## Special Considerations

### Field Usability
- All interactive elements minimum 48px touch target
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