# Label Studio Design System

This document provides comprehensive guidance for creating user interfaces that are consistent with the HumanSignal design language. It ensures all UI components follow our brand principles, accessibility standards, and technical implementation patterns.

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

### Mission

Our mission is to solve human problems and enhance human ability through user-centered design. By making data labeling easier and more efficient, we unlock the potential of AI systems through high-quality training data, accelerate innovation cycles, and empower teams to build more accurate and effective machine learning models.

### Design Principles

At the core of our application's design are principles that guide us in creating a product that is trustworthy, transparent, holistic, and predictive:

- **Solving human problems and enhancing human ability**: We strive to create an application that empowers users to do their work better and more efficiently.
- **Trustworthiness and transparency**: We aim to be honest, transparent, and accountable in our design decisions.
- **Learning and predicting human behavior**: We want to create an application that can learn from user behavior and predict what users need next.
- **Holistic design**: Our application considers the entire user experience and aims to create a consistent and seamless experience across all features and functions.

### Personality

Our personality is **human, optimistic, lighthearted, reliable, adaptable/resilient, and fine-crafting**. We aim for our users to feel at ease and enjoy using our application.

---

## Content Guidelines

### Voice and Tone

**Voice** (brand identity):
- Conversational, open, clear, and practical
- Users should feel like they're having a conversation with a friendly and helpful assistant

**Tone** (character):
- Informal, optimistic, positive, and friendly
- Users should feel encouraged and motivated

**Examples**:
- ✅ "Hi there! Let's get started by labeling some images. Are you ready?"
- ❌ "Please proceed to label some images."
- ✅ "Great job! Keep up the good work!"
- ❌ "Your progress is satisfactory."

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

Key terms used consistently throughout the application:

**General Terms**:
- **Project**: A collection of tasks and annotations organized around a specific goal
- **Dataset**: A collection of data items to be labeled or annotated
- **Task**: A single unit of work requiring annotation or labeling
- **Annotation**: The information added to a data item through labeling
- **Label**: A classification or tag applied to a data item
- **Tag**: A keyword or term assigned to a data item for organization

**Labeling-Specific Terms**:
- **Bounding Box**: A rectangular annotation outlining an object
- **Polygon**: A multi-point annotation defining the exact shape of an object
- **Region**: An annotation defining the precise area of an object or entity
- **Classification**: Assigning a category or class to an entire data item, discrete portions within it, or specific annotated regions
- **Metadata**: Additional properties, information, or context assigned to annotations or data items
- **Confidence**: A measure of certainty in an annotation or prediction
- **Review**: The process of checking and validating annotations
- **Consensus**: Agreement between multiple annotators, including models, on the same task

---

## Accessibility Standards

We follow **WCAG 2.1 Level AA** compliance. All components must adhere to the four main principles:

### 1. Perceivable

Information and user interface components must be presentable to users in ways they can perceive.

**Requirements**:
- All images have appropriate alt text
- Videos include captions
- Interface can be zoomed up to 200% without loss of content
- Color is never used as the only means of conveying information
- Text maintains a minimum contrast ratio of 4.5:1

### 2. Operable

User interface components and navigation must be operable by all users.

**Requirements**:
- ✅ **All interactive elements must be keyboard accessible**
- ✅ **Proper tab order through the interface**
- ✅ **Visible focus indicators** (minimum 3:1 contrast ratio)
- ✅ Support standard keyboard shortcuts (ESC, Enter, Space, Arrow keys)
- ✅ No focus traps (except intentional like modals)
- No flashing content
- Consistent navigation throughout the application
- Skip links provided for screen reader users

### 3. Understandable

Information and the operation of the user interface must be understandable.

**Requirements**:
- Clear, simple language used throughout
- Navigation and interactive elements behave consistently
- Error messages are clear and suggest corrections
- Labels and instructions provided for all form elements

### 4. Robust

Content must be robust enough to be interpreted by assistive technologies.

**Requirements**:
- Semantic HTML used throughout
- ARIA attributes used appropriately when needed
- Regular testing with screen readers and assistive technologies

### Keyboard Navigation

**Focus Management**:
- Clear, high-contrast focus indicators on all interactive elements
- Logical focus order following visual layout
- Focus returns to appropriate location after modal/dialog closes
- Skip links for screen reader users

**Implementation**:
- Tab order follows the visual layout
- Focus states clearly visible on all interactive elements
- Custom focus management for complex components (tabs, dropdowns)
- Focus moves predictably through the interface

### Screen Reader Support

- ARIA live regions for dynamic content updates
- Proper heading hierarchy (H1 → H2 → H3)
- Form labels associated with inputs via `for` attribute or wrapping
- Error messages linked to fields via `aria-describedby`

---

## Design Tokens

Design tokens are the foundation of our design system. They ensure consistency, enable dark mode, and make the UI maintainable.

### Token Location

All tokens are defined in: `web/libs/ui/src/tokens/tokens.scss`

### Semantic vs Numeric Tokens

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

**Accent Colors for Neutral Elements**:

For elements like tags, charts, or categories without positive/negative connotation:

| State | Text Color | Background Color |
|-------|-----------|------------------|
| **Default** | `-bold` | `-subtlest` |
| **Hover** | `-bold` | `-subtle` |
| **Active** | `-subtlest` | `-base` |
| **Charts** | N/A | `-base` |

Example:
```scss
// Tag with blueberry accent
.tag-default {
  color: var(--color-accent-blueberry-bold);
  background: var(--color-accent-blueberry-subtlest);
}

.tag-hover {
  color: var(--color-accent-blueberry-bold);
  background: var(--color-accent-blueberry-subtle);
}

.tag-active {
  color: var(--color-accent-blueberry-subtlest);
  background: var(--color-accent-blueberry-base);
}
```

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

Dark mode is automatic when using semantic tokens. The system switches token values based on the `[data-color-scheme="dark"]` attribute.

**Never use**:
- Hard-coded color values
- Numeric color tokens (grape-600, sand-100)
- Inline styles for colors

### Token Regeneration

To update tokens from Figma:

1. Export from Figma using the "Figma Variable Exporter" plugin
2. Replace contents of `web/design-tokens.json`
3. Run: `cd web/ && yarn design-tokens`
4. Run: `make fmt-all` (from project root)

---

## Component Library

### Location

All shared UI components are in the `@humansignal/ui` package:
- Source: `web/libs/ui/src/lib/`
- Import: `import { Button, Badge } from '@humansignal/ui';`

### Component Discovery

**Storybook** provides interactive documentation for all components:

```bash
# Run Storybook (port 4400)
yarn nx storybook storybook
```

Browse components, see all variants, and view implementation examples.

### Component Categories

**Buttons & Actions**:
- `Button` - Primary interactive element
- `Checkbox` - Selection control
- `Toggle` - Binary state switch

**Layout & Containers**:
- `Card` - Content container
- `Drawer` - Side panel
- `EmptyState` - Empty state placeholder
- `CollapsiblePanel` - Expandable section
- `Callout` - Highlighted information box

**Overlays & Dialogs**:
- `Modal` - Dialog overlay
- `Popover` - Floating content
- `Dropdown` - Menu overlay
- `Tooltip` - Contextual hint

**Data Display**:
- `Badge` - Status indicator
- `BadgeGroup` - Collection of badges
- `Typography` - Text formatting
- `DataTable` - Tabular data
- `Skeleton` - Loading placeholder

**Forms & Inputs**:
- `Select` - Dropdown selection
- `Label` - Form label
- `TagAutocomplete` - Tag input with suggestions
- `DateRangePicker` - Date selection

**Feedback**:
- `Message` - Informational box (use this for all informational messages)
- `Toast` - Temporary notification
- `Spinner` - Loading indicator

**Navigation**:
- `Tabs` - Tab navigation
- `Accordion` - Collapsible sections
- `Pagination` - Page navigation

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

Some components are built on shadcn/ui primitives. **Always import via `@humansignal/ui`**, never directly from `web/libs/ui/src/shad`.

```tsx
// ✅ Correct
import { Badge, Tabs } from '@humansignal/ui';

// ❌ Wrong
import { Badge } from '@humansignal/ui/src/shad/components/ui/badge';
```

---

## Styling Guidelines

### Tailwind CSS

See `tailwind.mdc` for complete guidelines. Key points:

**Use Semantic Utilities**:
```tsx
// ✅ Correct
<div className="p-tight bg-primary-surface text-body-medium">

// ❌ Wrong
<div className="p-200 bg-grape-600 text-16">
```

**Responsive Design**:
- Use mobile-first approach
- Apply responsive utilities: `sm:`, `md:`, `lg:`
- Test at different viewport widths

```tsx
<div className="flex flex-col md:flex-row gap-tight md:gap-base">
```

### SCSS Modules

For custom component styles, use SCSS modules co-located with components.

**File Structure**:
```
button/
  button.tsx
  button.module.scss  // ← SCSS module
  button.stories.tsx
  button.test.tsx
```

**Pattern: CSS Custom Properties for Variants**:

```scss
// button.module.scss
.base {
  // Define component tokens
  --background-color: var(--color-primary-surface);
  --text-color: var(--color-primary-surface-content);
  --border-color: var(--color-primary-border);
  
  background-color: var(--background-color);
  color: var(--text-color);
  border: 1px solid var(--border-color);
  
  &:hover {
    --background-color: var(--color-primary-surface-hover);
  }
}

// Variant classes override tokens
.variant-neutral {
  --background-color: var(--color-neutral-surface);
  --text-color: var(--color-neutral-content);
  --border-color: var(--color-neutral-border);
}

.variant-negative {
  --background-color: var(--color-negative-surface);
  --text-color: var(--color-negative-surface-content);
  --border-color: var(--color-negative-border);
}
```

**Using Tailwind in SCSS**:
```scss
.container {
  @apply flex items-center gap-tight;
  @apply bg-neutral-surface rounded-small;
}
```

**Component-Specific Tokens**:

Always create component tokens that reference semantic tokens:

```scss
.my-component {
  // Component tokens → Semantic tokens
  --component-background: var(--color-neutral-surface);
  --component-text: var(--color-neutral-content);
  --component-spacing: var(--spacing-tight);
  --component-radius: var(--corner-radius-small);
  
  background: var(--component-background);
  color: var(--component-text);
  padding: var(--component-spacing);
  border-radius: var(--component-radius);
}
```

**Canvas Elements and JavaScript-Based Rendering**:

For canvas elements and JavaScript-based rendering that cannot use CSS variables, use the `getTokenColor` utility to apply semantic token colors. The utility converts semantic token names to actual color values at runtime.

```tsx
import { getTokenColor } from '@humansignal/ui';

// Canvas rendering
const ctx = canvas.getContext('2d');
ctx.fillStyle = getTokenColor('--color-primary-surface');
ctx.strokeStyle = getTokenColor('--color-neutral-border');
```

---

## Component Development

See `react.mdc` for complete React patterns. Key points:

### File Structure

**For `@humansignal/ui` components** (kebab-case):
```
button/
  button.tsx
  button.module.scss
  button.stories.tsx
  button.test.tsx
  index.ts
```

**For application components** (PascalCase acceptable):
```
DataManager/
  DataManager.tsx
  DataManager.module.scss
  DataManager.test.tsx
```

### Component Pattern

```tsx
// button.tsx
import { forwardRef } from 'react';
import styles from './button.module.scss';
import { cn } from '@humansignal/core';

export interface ButtonProps {
  variant?: 'primary' | 'neutral' | 'negative';
  size?: 'small' | 'medium';
  disabled?: boolean;
  children: React.ReactNode;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'primary', size = 'medium', disabled, children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        disabled={disabled}
        className={cn(
          styles.base,
          styles[`variant-${variant}`],
          styles[`size-${size}`],
        )}
        {...props}
      >
        {children}
      </button>
    );
  }
);

Button.displayName = 'Button';
```

### Storybook Stories

Every component must have Storybook stories:

```tsx
// button.stories.tsx
import type { Meta, StoryObj } from '@storybook/react';
import { Button } from './button';

const meta: Meta<typeof Button> = {
  component: Button,
  title: 'UI/Button',
  argTypes: {
    variant: { control: 'select' },
    size: { control: 'select' },
    disabled: { control: 'boolean' },
  },
};

export default meta;
type Story = StoryObj<typeof Button>;

export const Primary: Story = {
  args: {
    children: 'Primary Button',
    variant: 'primary',
  },
};

export const Disabled: Story = {
  args: {
    children: 'Disabled Button',
    disabled: true,
  },
};
```

---

## Common Patterns

### State Variants

- **primary**: Brand/primary actions
- **neutral**: Secondary actions
- **positive**: Success states
- **negative**: Error/destructive actions
- **warning**: Warning states
- **gradient**: Special AI/premium features

### Size Variants

- **smaller**: Compact UI (height: 24px)
- **small**: Dense UI (height: 32px)
- **medium**: Default (height: 40px)
- **large**: Prominent (height: 48px+)

### Look Variants

- **filled**: Solid background (default)
- **outlined**: Border only
- **string**: Text only (no background/border)

### Disabled States

Always use `neutral-content-subtlest` for disabled text:

```tsx
<button disabled className="text-neutral-content-subtlest">
  Disabled Button
</button>
```

### Loading States

Use the `waiting` prop or `Spinner` component:

```tsx
<Button waiting={isLoading}>Save Changes</Button>
```

### Empty States

Use the `EmptyState` component with icon, title, description, and actions:

```tsx
<EmptyState
  variant="neutral"
  size="large"
  icon={<IconInbox />}
  title="No tasks yet"
  description="Create your first task to get started"
  actions={<Button>Create Task</Button>}
/>
```

---

## Component Reuse & Best Practices

### Component Selection

**Before creating a new component**:
1. ✅ Check if a comparable component exists in `@humansignal/ui`
2. ✅ Browse Storybook to see all available components
3. ✅ Check if existing components can be composed to achieve your goal

**Common Replacements**:
- ❌ Don't use `<button>` → ✅ Use `<Button>` from `@humansignal/ui`
- ❌ Don't create custom info boxes → ✅ Use `<Message>` component
- ❌ Don't create custom tooltips → ✅ Use `<Tooltip>` component
- ❌ Don't create custom modals → ✅ Use `<Modal>` component

### Naming Conventions

- **Components in `@humansignal/ui`**: kebab-case files (`button.tsx`, `empty-state.tsx`)
- **Components outside `@humansignal/ui`**: PascalCase is acceptable (`DataManager.tsx`)
- **Props interfaces**: `ComponentNameProps` (`ButtonProps`, `EmptyStateProps`)

### Values & Tokens

**Never hard-code values**:
```tsx
// ❌ Wrong - hard-coded values
<div style={{ color: '#4C5FA9', padding: '8px', fontSize: '16px' }}>

// ✅ Correct - semantic tokens
<div className="text-primary-content p-tight text-body-medium">
```

**Create component tokens**:
```scss
.my-component {
  // Component tokens reference semantic tokens
  --component-bg: var(--color-neutral-surface);
  --component-spacing: var(--spacing-tight);
  --component-text: var(--color-neutral-content);
}
```

**Use rem for dimensions**:
```scss
// ✅ Preferred
.container {
  width: 20rem;
  max-width: 60rem;
}

// ⚠️ Acceptable when necessary
.fixed-size {
  width: 320px;
}
```

### Button Hierarchy

**Only ONE primary/filled button per screen**:

```tsx
// ✅ Correct - single primary CTA
<div>
  <Button variant="primary" look="filled">Save Changes</Button>
  <Button variant="neutral" look="outlined">Cancel</Button>
  <Button variant="neutral" look="outlined">Preview</Button>
</div>

// ❌ Wrong - multiple primary buttons
<div>
  <Button variant="primary" look="filled">Save</Button>
  <Button variant="primary" look="filled">Publish</Button>
</div>
```

This creates clear visual hierarchy and guides user attention to the main action.

### Responsive Design

**Ensure layouts adapt to smaller screens**:

```tsx
// ✅ Responsive layout
<div className="flex flex-col md:flex-row gap-tight">
  <div className="w-full md:w-1/2">Content</div>
  <div className="w-full md:w-1/2">Sidebar</div>
</div>

// ✅ Responsive spacing
<div className="p-tight md:p-base lg:p-wide">

// ✅ Responsive typography
<h1 className="text-title-medium md:text-headline-small">
```

**Test at different viewports**:
- Mobile: 375px - 767px
- Tablet: 768px - 1023px
- Desktop: 1024px+

### Saving Settings

**Use explicit Save buttons for settings and configuration changes** instead of auto-saving on every interaction.

This provides users with:
- Control over when changes are applied
- Prevention of unintended changes
- Clear feedback about unsaved state
- Ability to review changes before committing

```tsx
// ✅ Correct - explicit save pattern
<form>
  <Input label="Project name" value={name} onChange={setName} />
  <Select label="Default view" value={view} onChange={setView} />
  
  <div className="flex gap-tight">
    <Button variant="primary" look="filled" type="submit">
      Save Changes
    </Button>
    <Button variant="neutral" look="outlined" onClick={handleCancel}>
      Cancel
    </Button>
  </div>
</form>

// ❌ Wrong - auto-saving on every change
<form>
  <Input 
    label="Project name" 
    value={name} 
    onChange={(val) => {
      setName(val);
      autoSave(); // Don't do this
    }} 
  />
</form>
```

**Exceptions**: Auto-save is acceptable for:
- Draft content (e.g., annotation work in progress)
- User preferences that don't affect data integrity
- Toggles with immediate, reversible effects

### Empty States

**Always use the `EmptyState` component** when there is no data to display or when searches return no results.

Empty states should include:
- Icon that represents the empty context
- Clear title explaining what's missing
- Description providing context or guidance
- Appropriate actions to resolve the empty state

```tsx
// ✅ Correct - using EmptyState component
<EmptyState
  variant="neutral"
  size="large"
  icon={<IconInbox />}
  title="No tasks yet"
  description="Create your first task to get started with labeling"
  actions={<Button variant="primary">Create Task</Button>}
/>

// ✅ Correct - empty search results
<EmptyState
  variant="neutral"
  size="medium"
  icon={<IconSearch />}
  title="No results found"
  description="Try adjusting your search terms or filters"
  actions={<Button variant="neutral" look="outlined">Clear Filters</Button>}
/>

// ❌ Wrong - plain text for empty state
<div>
  <p>No tasks available</p>
</div>

// ❌ Wrong - missing guidance
<EmptyState
  icon={<IconInbox />}
  title="No tasks"
/>
```

**Use cases**:
- Empty lists or tables
- No search results
- Initial states before data is added
- Filtered views with no matching items
- Deleted or cleared content areas

---

## Anti-Patterns to Avoid

### Tokens & Styling

- ❌ Using numeric tokens: `p-200`, `text-16`, `bg-grape-600`
- ❌ Hard-coded values: `color: #4C5FA9`, `padding: 8px`
- ❌ Inline styles for theming (breaks dark mode)
- ❌ Non-semantic color values
- ❌ Default Tailwind classes not in token system
- ❌ BEM-style class naming

### Components

- ❌ Creating new components when comparable ones exist
- ❌ Using `<button>` instead of `<Button>` component
- ❌ Importing from `web/libs/ui/src/shad` directly
- ❌ Skipping Storybook stories
- ❌ More than one primary/filled button per screen

### Accessibility

- ❌ Ignoring keyboard navigation
- ❌ Missing focus indicators
- ❌ Using color alone to convey information
- ❌ Insufficient contrast ratios (< 4.5:1)
- ❌ Non-semantic HTML
- ❌ Missing alt text on images
- ❌ Non-keyboard-accessible interactive elements

### Code Quality

- ❌ Custom CSS when Tailwind utilities exist
- ❌ Fixed pixel units when rem is more appropriate
- ❌ Non-responsive layouts
- ❌ Not following established file structure
- ❌ Inconsistent naming conventions

---

## Quick Reference

### Key Files & Locations

- **Component library**: `web/libs/ui/src/lib/`
- **Design tokens**: `web/libs/ui/src/tokens/tokens.scss`
- **Icons**: `@humansignal/icons` (from `web/libs/ui/src/assets/icons/`)
- **Storybook**: Run `yarn nx storybook storybook` (port 4400)
- **Token generation**: `cd web/ && yarn design-tokens`

### Related Documentation

- **React patterns**: See `react.mdc` for component structure, hooks, state management
- **Tailwind usage**: See `tailwind.mdc` for utility classes and responsive design
- **TypeScript**: See `typescript.mdc` for type conventions
- **Testing**: See `frontend-unit-tests.mdc` for testing patterns

### Design Language

Full design language documentation: https://humansignal.notion.site/Design-language-fe3a39ecfa794507b2f7e62cbb5636c8

### Common Imports

```tsx
// UI Components
import { Button, Badge, Message, EmptyState } from '@humansignal/ui';

// Icons
import { IconCheck, IconCross, IconInfo } from '@humansignal/icons';

// Utilities
import { cn } from '@humansignal/core';
```

### Token Examples

```tsx
// Spacing
className="p-tight m-base gap-wide"

// Typography
className="text-body-medium text-label-small"

// Colors
className="bg-primary-surface text-neutral-content border-neutral-border"

// Disabled text
className="text-neutral-content-subtlest"
```

---

## Summary

This design system ensures:

- ✅ Consistent visual design across all UI components
- ✅ WCAG 2.1 AA accessibility compliance
- ✅ Dark mode compatibility by default
- ✅ Efficient component discovery and reuse
- ✅ Clear content guidelines and brand voice
- ✅ Cohesive user experience
- ✅ Reduced design debt
- ✅ Faster development with established patterns

When in doubt, check existing components in Storybook, refer to the related cursor rules, and follow the semantic token system.
