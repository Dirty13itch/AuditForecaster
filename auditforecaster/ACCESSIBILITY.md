# Accessibility Guidelines

## Overview
This document outlines accessibility standards and best practices for the Field Inspect application.

## Target Standard
**WCAG 2.1 Level AA Compliance**

---

## Key Principles

### 1. Perceivable
- ✅ All images have descriptive `alt` text
- ✅ Color is not the only means of conveying information
- ✅ Text has sufficient contrast ratio (4.5:1 minimum)
- ✅ Forms have visible labels

### 2. Operable
- ✅ All functionality available via keyboard
- ✅ Focus indicators are visible
- ✅ Touch targets are at least 44x44 pixels
- ✅ No keyboard traps

### 3. Understandable
- ✅ Error messages are clear and helpful
- ✅ Forms have labels and instructions
- ✅ Consistent navigation patterns

### 4. Robust
- ✅ Valid HTML semantics
- ✅ ARIA attributes used correctly
- ✅ Compatible with assistive technologies

---

## Implementation Checklist

### Forms
- [ ] All form fields have associated `<label>` elements
- [ ] Required fields are marked with `aria-required="true"`
- [ ] Error states use `aria-invalid="true"` and `aria-describedby`
- [ ] Submit buttons have descriptive text

### Interactive Elements
- [ ] Buttons have descriptive labels (not just icons)
- [ ] Links indicate their purpose
- [ ] Custom components have appropriate ARIA roles
- [ ] Focus order is logical

### Images
- [ ] Decorative images have `alt=""` or `aria-hidden="true"`
- [ ] Informative images have descriptive `alt` text
- [ ] Icons paired with text for context

### Navigation
- [ ] Skip links provided for main content
- [ ] Breadcrumbs use `aria-label="Breadcrumb"`
- [ ] Current page indicated in navigation

### Dynamic Content
- [ ] Loading states announced with `aria-live` regions
- [ ] Error messages use `role="alert"`
- [ ] Updates to content are perceivable

---

## Component Patterns

### Accessible Button
```typescript
<Button aria-label="Delete item">
    <Trash2 className="h-4 w-4" />
</Button>
```

### Accessible Form
```typescript
<form>
    <label htmlFor="email">Email Address</label>
    <input 
        id="email"
        type="email"
        aria-required="true"
        aria-invalid={hasError}
        aria-describedby={hasError ? "email-error" : undefined}
    />
    {hasError && (
        <span id="email-error" role="alert">
            Please enter a valid email
        </span>
    )}
</form>
```

### Accessible Modal/Dialog
```typescript
<Dialog open={open} onOpenChange={setOpen}>
    <DialogContent aria-labelledby="dialog-title" aria-describedby="dialog-description">
        <DialogTitle id="dialog-title">Confirm Action</DialogTitle>
        <DialogDescription id="dialog-description">
            Are you sure you want to proceed?
        </DialogDescription>
        {/* ... */}
    </DialogContent>
</Dialog>
```

---

## Testing Guidelines

### Automated Testing
```bash
# Install axe-core for automated testing
npm install --save-dev @axe-core/react

# Run Lighthouse accessibility audit
npm run build
# Then run Lighthouse on localhost:3000
```

### Manual Testing
1. **Keyboard Navigation**
   - Tab through entire page
   - Verify all interactive elements are reachable
   - Ensure focus indicators are visible
   - Test Escape key for modals/dialogs

2. **Screen Reader Testing**
   - Windows: NVDA or JAWS
   - macOS: VoiceOver (Cmd+F5)
   - Verify all content is announced
   - Check form labels are associated

3. **Zoom Testing**
   - Test at 200% zoom
   - Verify no content is cut off
   - Check horizontal scrolling is minimal

4. **Color Contrast**
   - Use browser DevTools to check contrast
   - Minimum 4.5:1 for normal text
   - Minimum 3:1 for large text (18pt+)

---

## Common Fixes

### Missing Alt Text
```diff
- <img src="/logo.png" />
+ <img src="/logo.png" alt="Field Inspect Logo" />
```

### Icon-Only Buttons
```diff
- <Button><Plus /></Button>
+ <Button aria-label="Add new item"><Plus /></Button>
```

### Missing Form Labels
```diff
- <input type="text" placeholder="Search..." />
+ <label htmlFor="search">Search</label>
+ <input id="search" type="text" placeholder="Search..." />
```

### Insufficient Contrast
```diff
- <p className="text-gray-300">Low contrast text</p>
+ <p className="text-gray-700">Better contrast text</p>
```

---

## Resources

- [WCAG 2.1 Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
- [MDN Accessibility](https://developer.mozilla.org/en-US/docs/Web/Accessibility)
- [WebAIM Articles](https://webaim.org/articles/)
- [a11y Project Checklist](https://www.a11yproject.com/checklist/)

---

## Status

**Current Compliance**: Partial (estimated ~70%)

**Priority Improvements**:
1. Add ARIA labels to all icon-only buttons
2. Ensure all forms have associated labels
3. Implement skip navigation links
4. Add focus management for modal dialogs
5. Run full Lighthouse audit

**Last Updated**: 2025-11-23
