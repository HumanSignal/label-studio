import type { JsonThemeOverride } from "react-json-virtualization";

/**
 * Maps Label Studio JsonViewer CSS variables to react-json-virtualization theme tokens.
 * Required because the library applies theme via inline custom properties on .rjv-container,
 * which otherwise wins over parent-scoped --rjv-* overrides.
 */
export const labelStudioVirtualizedTheme: JsonThemeOverride = {
  background: "transparent",
  rowHover: "var(--json-viewer-button-hover-background)",
  rowSelected: "var(--json-viewer-button-hover-background)",
  rowMatch: "var(--color-primary-emphasis-subtle)",
  plainLineMatch: "var(--color-primary-emphasis-subtle)",
  key: "var(--json-viewer-color-keys)",
  punctuation: "var(--json-viewer-color-brackets)",
  string: "var(--json-viewer-color-string)",
  number: "var(--json-viewer-color-number)",
  boolean: "var(--json-viewer-color-boolean)",
  null: "var(--json-viewer-color-null)",
  focusRing: "var(--color-primary-border)",
};
