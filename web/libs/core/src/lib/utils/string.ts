/**
 * Re-exports of lodash-compatible string utilities from es-toolkit.
 * Uses es-toolkit/compat for exact lodash behavior (e.g. startCase preserves uppercase words).
 */

export { camelCase, capitalize, kebabCase, snakeCase, startCase } from "es-toolkit/compat";
export { pascalCase } from "es-toolkit/string";

/**
 * Truncates a label to a maximum display length, appending an ellipsis when clipped.
 * Use this wherever a label is embedded in a string context (toast messages, modal titles,
 * dropdown option text) where CSS truncation is not available.
 */
export function truncateLabel(label: string, maxLength = 20): string {
  return label.length > maxLength ? `${label.slice(0, maxLength)}\u2026` : label;
}
