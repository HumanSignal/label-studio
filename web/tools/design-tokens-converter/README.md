# Design Tokens Converter

This script converts Figma design tokens from the `design-tokens.json` format into usable CSS variables and JavaScript objects for Tailwind integration.

## Features

- Converts Figma's design tokens to CSS variables
- Supports both light and dark themes
- Creates a JavaScript module for Tailwind integration
- Resolves token references like `{@primitives.$color.$sand.100}`
- Supports multiple token types:
  - Colors (light and dark modes)
  - Spacing
  - Typography (font family, font size, font weight, line height, letter spacing)
  - Corner Radius

## How to Use

1. Export design tokens from Figma as `design-tokens.json` and place it in the `label-studio/web/` directory (workspace root)
2. Run the conversion script using NX:

```bash
nx design-tokens ui
```

3. This will generate:
   - `libs/ui/src/tokens/tokens.prefix.css` - Contains CSS variables for light and dark themes
   - `libs/ui/src/tokens/tokens.js` - Contains JavaScript object for Tailwind integration

## Importing the Generated Files

### CSS Variables

Import the CSS file in your main stylesheet:

```css
@import 'libs/ui/src/tokens/tokens.prefix.css';
```

### Tailwind Integration

Update your Tailwind configuration to import the design tokens:

```js
// tailwind.config.js
const designTokens = require('./libs/ui/src/tokens/tokens.js');

module.exports = {
  // ...
  theme: {
    extend: {
      colors: {
        // ...your existing colors
        ...designTokens.colors,
      },
      spacing: designTokens.spacing,
      fontSize: designTokens.typography.fontSize,
      lineHeight: designTokens.typography.lineHeight,
      letterSpacing: designTokens.typography.letterSpacing,
      fontFamily: designTokens.typography.fontFamily,
      fontWeight: designTokens.typography.fontWeight,
      borderRadius: designTokens.cornerRadius,
    },
  },
};
```

## Usage Examples

### Using CSS Variables

```css
/* Colors */
.my-element {
  color: var(--color-primary-content);
  background-color: var(--color-neutral-surface);
}

/* Spacing */
.padded {
  padding: var(--spacing-base);
  margin: var(--spacing-wide);
}

/* Typography */
.heading {
  font-family: var(--font-family-sans);
  font-size: var(--font-size-24);
  line-height: var(--line-height-32);
  font-weight: var(--font-weight-bold);
}

/* Corner Radius */
.rounded {
  border-radius: var(--corner-radius-medium);
}
```

### Using in Tailwind Classes

```html
<!-- Colors -->
<div class="text-primary-content bg-neutral-surface">
  Styled with color tokens
</div>

<!-- Spacing -->
<div class="p-base my-large">
  Styled with spacing tokens
</div>

<!-- Typography -->
<h1 class="font-sans text-24 leading-32 font-bold">
  Styled with typography tokens
</h1>

<!-- Corner Radius -->
<div class="rounded-medium">
  Styled with corner radius tokens
</div>
```

## Dark Mode

The CSS variables support dark mode with the `data-color-scheme="dark"` attribute:

```html
<body data-color-scheme="dark">
  <!-- Dark theme will be applied -->
</body>
```

## Updating Design Tokens

When you get updated design tokens from Figma:

1. Replace the `design-tokens.json` file in the workspace root
2. Run the NX command again: `nx design-tokens ui`
3. The CSS and JavaScript files will be regenerated with the updated tokens 

## Known Issues

- The source design tokens refer to "corder-radius" (typo) instead of "corner-radius". The converter automatically corrects this in the generated output files.
