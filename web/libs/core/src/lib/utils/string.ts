/**
 * Convert string to camelCase (vanilla, no lodash). Reusable across the application.
 */
export function camelCase(str: string): string {
  return String(str)
    .replace(/[-_\s]+(.)?/g, (_, c) => (c ? c.toUpperCase() : ""))
    .replace(/^[A-Z]/, (c) => c.toLowerCase());
}

/**
 * Convert string to snake_case (vanilla, no lodash). Reusable across the application.
 */
export function snakeCase(str: string): string {
  return String(str)
    .replace(/([A-Z])/g, (l) => `-${l.toLowerCase()}`)
    .replace(/[-\s]+/g, "_")
    .replace(/^_/, "");
}

/**
 * Convert string to kebab-case (vanilla, no lodash). Reusable across the application.
 */
export function kebabCase(str: string): string {
  return String(str)
    .replace(/([A-Z])/g, (l) => `-${l.toLowerCase()}`)
    .replace(/[\s_]+/g, "-")
    .replace(/^-/, "");
}

/**
 * Capitalize first letter of string (vanilla, no lodash). Reusable across the application.
 */
export function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * Convert string to PascalCase (StudlyCase)
 * This is essentially camelCase with the first letter capitalized
 */
export const toStudlyCaps = (str: string): string => {
  const camelCased = camelCase(str);
  return camelCased.charAt(0).toUpperCase() + camelCased.slice(1);
};
