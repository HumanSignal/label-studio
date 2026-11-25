/**
 * Every rule ds:check can report. Each metrics snapshot records this list, so a point measured before a rule existed
 * is found and remeasured (`ds:metrics --stale`). The rules test keeps it in step with the rules the checks emit.
 */
export const DS_RULES = [
  "avatar-size",
  "badge-props",
  "button-look",
  "color-literal",
  "control-size",
  "deprecated-import",
  "hand-built-overlay",
  "imperative-dialog",
  "inline-style-token",
  "internal-import",
  "legacy-icon",
  "phosphor-import",
  "raw-control",
  "replaced-import",
  "shad-import",
  "tailwind-primitive",
  "template-dialog",
  "template-raw-control",
  "unknown-token",
] as const;
