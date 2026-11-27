import { EditorView } from "@codemirror/view";

/** Label Studio token colors aligned with code-editor.module.css CM5 classes. */
export const labelStudioCm6Theme = EditorView.theme({
  "&": {
    height: "100%",
    width: "100%",
    display: "flex",
    flexDirection: "column",
    minHeight: 0,
    overflow: "hidden",
    fontFamily: "var(--font-mono)",
    backgroundColor: "var(--color-neutral-background)",
    color: "var(--color-neutral-content-subtle)",
    border: "1px solid var(--color-neutral-border)",
    borderRadius: "var(--corner-radius-small)",
  },
  ".cm-scroller": {
    flex: 1,
    minHeight: 0,
    overflow: "auto",
  },
  ".cm-content": {
    padding: "var(--spacing-tight) 0",
    caretColor: "var(--color-neutral-content)",
  },
  ".cm-line": {
    padding: "0 var(--spacing-tight)",
  },
  ".cm-gutters": {
    backgroundColor: "var(--color-neutral-surface-inset)",
    color: "var(--color-neutral-content-subtlest)",
    borderRight: "1px solid var(--color-neutral-border)",
  },
  ".cm-cursor": {
    borderLeftColor: "var(--color-neutral-content)",
  },
  ".cm-activeLine": {
    backgroundColor: "transparent",
  },
  "&.cm-focused": {
    outline: "none",
  },
  ".tok-keyword": { color: "var(--color-accent-blueberry-bold)" },
  ".tok-definition": { color: "var(--color-accent-grape-bold)" },
  ".tok-builtin": { color: "var(--color-accent-canteloupe-bold)" },
  ".tok-number": { color: "var(--color-accent-kiwi-bold)" },
  ".tok-tag": { color: "var(--color-accent-kale-bold)" },
  ".tok-bracket": { color: "var(--color-accent-kale-bold)" },
  ".tok-string": { color: "var(--color-accent-persimmon-bold)" },
  ".tok-comment": { color: "var(--color-accent-sand-bold)" },
  ".tok-atom": { color: "var(--color-accent-blueberry-bolder)" },
  ".tok-meta": { color: "var(--color-accent-blueberry-bolder)" },
  ".tok-variableName": { color: "var(--color-neutral-content)" },
  ".tok-typeName": { color: "var(--color-accent-kale-bolder)" },
  ".cm-changed-range": {
    backgroundColor: "var(--color-primary-emphasis-subtle)",
  },
});
