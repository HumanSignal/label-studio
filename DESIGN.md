# Label Studio Design System

## Table of Contents

- [Brand & Design Principles](#brand--design-principles)
- [Content Guidelines](#content-guidelines)
- [Accessibility Standards](#accessibility-standards)
- [Design Tokens](#design-tokens)
- [Component Library](#component-library)
- [Styling Guidelines](#styling-guidelines)
- [Component Development](#component-development)
- [Common Patterns](#common-patterns)
- [Component Reuse & Best Practices](#component-reuse--best-practices)
- [Anti-Patterns to Avoid](#anti-patterns-to-avoid)
- [Quick Reference](#quick-reference)

---

## Brand & Design Principles

**Personality**: Human, optimistic, lighthearted, reliable, adaptable, fine-crafting.

**Design Principles**: Solve human problems, enhance human ability, trustworthy, transparent, holistic, predictive.

---

## Content Guidelines

### Voice and Tone

- Conversational, open, clear, and practical
- Informal, optimistic, positive, and friendly
- Users should feel encouraged and motivated

### Writing Style

- Use concise sentences and aim for seventh-grade reading level or lower
- Use the same names for elements across the application (e.g., if you use "category" for labeling, always use "category" not "type" or "group")
- Use active voice whenever possible for clarity (e.g., "Reviewers review and update annotations" not "Annotations are reviewed by reviewers")
- Use sentence case for headings, input labels, and controls (e.g., "Selection details", "Email address", "Enable notifications")
- Use Title Case for buttons and navigational items (e.g., "Save Changes", "Upload Dataset", "View Documentation")
- Use contractions to make language more conversational (e.g., "can't", "don't", "it's" instead of "cannot", "do not", "it is")

### UI Text Guidelines

**Error Messages**:
- Be clear, specific, and helpful
- Tell users what went wrong and how to fix it

**Feedback Messages**:
- Be positive, encouraging, and informative

**Labels and Buttons**:
- Use action verbs for buttons (Save, Cancel, Upload)
- Keep labels concise but descriptive
- Use Title Case for buttons
- Use sentence case for labels

**Links**:
- Use descriptive link text that indicates the destination

### Vocabulary

For domain terminology (Project, Task, Annotation, etc.), see `terminology.mdc` cursor rule.

---

## Accessibility Standards

**WCAG 2.1 Level AA** compliance required.

### Critical Requirements

**Keyboard Navigation**:
- ✅ All interactive elements must be keyboard accessible
- ✅ Proper tab order through interface
- ✅ Visible focus indicators (minimum 3:1 contrast ratio)
- ✅ Support ESC, Enter, Space, Arrow keys
- ✅ No focus traps (except modals)
- ✅ Focus returns to appropriate location after modal/dialog closes

**Visual**:
- Minimum 4.5:1 text contrast ratio
- Color never used as sole means of conveying information
- Interface zoomable to 200% without content loss
- Alt text for all images

**Structure**:
- Semantic HTML throughout
- ARIA attributes when needed
- Proper heading hierarchy (H1 → H2 → H3)
- Form labels associated with inputs
- Error messages linked to fields via `aria-describedby`
- ARIA live regions for dynamic content

---

## Design Tokens

**Location**: `web/libs/ui/src/tokens/tokens.scss`

**Always use semantic tokens** instead of numeric values:

| Category | ✅ Use Semantic | ❌ Don't Use Numeric |
|----------|----------------|---------------------|
| **Spacing** | `p-tight`, `m-base`, `gap-wide` | `p-200`, `m-400`, `gap-600` |
| **Typography** | `text-body-medium`, `text-label-small` | `text-16`, `text-14` |
| **Colors** | `bg-primary-surface`, `text-neutral-content` | `bg-grape-600`, `text-sand-800` |

### Color Tokens

**Semantic Color Categories**:
- **Primary**: Brand colors (grape/blue)
- **Neutral**: Grayscale colors (sand)
- **Positive**: Success states (kale/green)
- **Negative**: Error states (persimmon/red)
- **Warning**: Warning states (canteloupe/orange)
- **Accent**: Decorative colors (grape, blueberry, kale, kiwi, mango, canteloupe, persimmon, plum, fig, sand)

**Color Token Structure**:
```scss
// Surface colors (for backgrounds of interactive elements)
--color-primary-surface
--color-primary-surface-hover
--color-primary-surface-active

// Content colors (for text)
--color-neutral-content
--color-neutral-content-subtle
--color-neutral-content-subtler
--color-neutral-content-subtlest  // Use for disabled text

// Background colors (for page/container backgrounds)
--color-neutral-background
--color-primary-background

// Border colors
--color-neutral-border
--color-primary-border-subtle

// Icon colors
--color-primary-icon
--color-negative-icon
```

**Accent Colors** (tags, charts, categories):
- Default: `-bold` text, `-subtlest` bg
- Hover: `-bold` text, `-subtle` bg
- Active: `-subtlest` text, `-base` bg
- Charts: `-base` bg

### Spacing Tokens

**Semantic Scale**:
- `--spacing-tightest` / `tightest`: 2px
- `--spacing-tighter` / `tighter`: 4px
- `--spacing-tight` / `tight`: 8px
- `--spacing-base` / `base`: 16px
- `--spacing-wide` / `wide`: 24px
- `--spacing-wider` / `wider`: 32px
- `--spacing-widest` / `widest`: 40px

### Typography Tokens

**Semantic Scale**:
- `text-body-smallest` / `--font-size-body-smallest`: 10px
- `text-body-smaller` / `--font-size-body-smaller`: 12px
- `text-body-small` / `--font-size-body-small`: 14px
- `text-body-medium` / `--font-size-body-medium`: 16px
- `text-label-small` / `--font-size-label-small`: 14px
- `text-label-medium` / `--font-size-label-medium`: 16px
- `text-title-small` / `--font-size-title-small`: 18px
- `text-title-medium` / `--font-size-title-medium`: 20px
- `text-title-large` / `--font-size-title-large`: 24px

### Dark Mode

Automatic when using semantic tokens. Never use hard-coded colors, numeric tokens (grape-600), or inline color styles.


---

## Component Library

### Location

All shared UI components are in the `@humansignal/ui` package:
- Source: `web/libs/ui/src/lib/`
- Import: `import { Button, Badge } from '@humansignal/ui';`

### Component Discovery

Browse available components in `@humansignal/ui`:
- **Source**: `web/libs/ui/src/lib/`
- **Storybook**: Run `yarn nx storybook storybook` (port 4400)

**Critical**: Always check `@humansignal/ui` before creating new components. Use `Message` for informational boxes, `EmptyState` for empty states, `Button` instead of `<button>`.

### Import Patterns

```tsx
// UI components
import { Button, Badge, Message } from '@humansignal/ui';

// Icons
import { IconCheck, IconCross } from '@humansignal/icons';

// Core utilities
import { cn } from '@humansignal/core';
```

### shadcn/ui Integration

Some components built on shadcn/ui. Always import via `@humansignal/ui`, never from `/src/shad/`.

---

## Styling Guidelines

### Tailwind CSS

See `tailwind.mdc` for complete guidelines.

**Use semantic utilities**: `p-tight`, `bg-primary-surface`, `text-body-medium` (not `p-200`, `bg-grape-600`, `text-16`)

**Responsive**: `sm:`, `md:`, `lg:` utilities

### SCSS Modules

Co-locate `.module.scss` with components.

**Component Tokens Pattern**:
```scss
.base {
  --background-color: var(--color-primary-surface);
  --text-color: var(--color-primary-surface-content);
  background-color: var(--background-color);
  color: var(--text-color);
}

.variant-neutral {
  --background-color: var(--color-neutral-surface);
  --text-color: var(--color-neutral-content);
}
```

**Tailwind in SCSS**: `@apply flex items-center gap-tight;`

**Canvas Elements**:

For canvas/JS rendering that cannot use CSS variables, use `getTokenColor`:

```tsx
import { getTokenColor } from '@humansignal/ui';
ctx.fillStyle = getTokenColor('--color-primary-surface');
```

---

## Component Development

See `react.mdc` for complete React patterns.

### File Structure

- `@humansignal/ui` components: kebab-case (`button.tsx`, `empty-state.tsx`)
- Application components: PascalCase acceptable (`DataManager.tsx`)
- Co-locate: `.tsx`, `.module.scss`, `.stories.tsx`, `.test.tsx`
- Every component must have Storybook stories

---

## Common Patterns

### Component Variants

**State**: `primary`, `neutral`, `positive`, `negative`, `warning`, `gradient`
**Size**: `smaller` (24px), `small` (32px), `medium` (40px), `large` (48px+)
**Look**: `filled` (solid), `outlined` (border), `string` (text only)

### Disabled States

Use `neutral-content-subtlest` for disabled text: `<button disabled className="text-neutral-content-subtlest">`

### Loading States

Use `waiting` prop: `<Button waiting={isLoading}>Save</Button>`

### Empty States

Always use `EmptyState` with icon, title, description, actions:
```tsx
<EmptyState icon={<IconInbox />} title="No tasks yet" description="..." actions={<Button>Create</Button>} />
```

### Modal Patterns

**Footer Actions**: All CTAs and navigation buttons in footer (default: right-aligned; "Previous" buttons: left-aligned)

**Button Visual Hierarchy**: See "Button Hierarchy" section.

**Destructive Actions**: Require confirmation. High-impact actions require typing validation ("DELETE" or entity name).

**Modal Stacking**: Avoid modal-over-modal. Use multi-step modals or drawers instead.

```tsx
// Right-aligned footer (default)
<Modal.Footer align="right">
  <Button variant="neutral" look="outlined">Cancel</Button>
  <Button variant="primary" look="filled">Save Changes</Button>
</Modal.Footer>

```

---

## Component Reuse & Best Practices

### Component Selection

Before creating new components, check `@humansignal/ui` and Storybook.

**Always use existing**:
- `<Button>` not `<button>`
- `<Message>` for info boxes
- `<Tooltip>` for tooltips
- `<Modal>` for modals
- `<EmptyState>` for empty states

### Naming Conventions

- `@humansignal/ui`: kebab-case (`button.tsx`)
- Application components: PascalCase ok (`DataManager.tsx`)
- Props: `ComponentNameProps`

### Values & Tokens

Never hard-code values. Use semantic tokens: `text-primary-content p-tight text-body-medium`

Create component tokens:
```scss
.component {
  --component-bg: var(--color-neutral-surface);
  background: var(--component-bg);
}
```

Prefer `rem` for dimensions, `px` acceptable when necessary.

### Button Hierarchy

**One primary/filled button per screen** (single CTA).

**Visual hierarchy by alignment**:
- Right-aligned: right-to-left (primary rightmost): `[Cancel] [Save]`
- Left-aligned: left-to-right (primary leftmost): `[Next] [Skip]`

### Responsive Design

Ensure layouts adapt: `flex-col md:flex-row`, `p-tight md:p-base`, `text-title-medium md:text-headline-small`


### Saving Settings

Use explicit Save buttons for settings/configuration (not auto-save).

Exceptions: draft content, preferences, immediate toggles.



---

## Anti-Patterns to Avoid

- ❌ Numeric tokens (`p-200`, `bg-grape-600`)
- ❌ Hard-coded values (`color: #4C5FA9`)
- ❌ Inline styles (breaks dark mode)
- ❌ Creating components when comparable exist
- ❌ Using `<button>` not `<Button>`
- ❌ Importing from `/src/shad/` directly
- ❌ Multiple primary/filled buttons per screen
- ❌ Missing keyboard navigation
- ❌ Missing focus indicators
- ❌ Color alone for information
- ❌ Insufficient contrast (< 4.5:1)
- ❌ Non-semantic HTML
- ❌ Non-responsive layouts

---

## Quick Reference

### Key Files

- Components: `web/libs/ui/src/lib/`
- Tokens: `web/libs/ui/src/tokens/tokens.scss`
- Icons: `@humansignal/icons`
- Storybook: `yarn nx storybook storybook`

### Related Documentation

- `react.mdc` - Component structure, hooks, state management
- `tailwind.mdc` - Utility classes, responsive design
- `typescript.mdc` - Type conventions
- `frontend-unit-tests.mdc` - Testing patterns
- `terminology.mdc` - Domain terminology

### Common Imports

```tsx
import { Button, Message, EmptyState } from '@humansignal/ui';
import { IconCheck } from '@humansignal/icons';
import { cn } from '@humansignal/core';
```

### Token Examples

`p-tight`, `m-base`, `gap-wide`, `text-body-medium`, `bg-primary-surface`, `text-neutral-content`, `text-neutral-content-subtlest` (disabled)

---

