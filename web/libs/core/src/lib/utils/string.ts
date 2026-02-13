/**
 * Re-exports of lodash-compatible string utilities from es-toolkit.
 * Uses es-toolkit/compat for exact lodash behavior (e.g. startCase preserves uppercase words).
 */

export { camelCase, capitalize, kebabCase, snakeCase, startCase } from "es-toolkit/compat";

import { camelCase } from "es-toolkit/compat";

/**
 * Converts `string` to PascalCase (StudlyCase).
 * This is camelCase with the first letter capitalized.
 */
export const toStudlyCaps = (str: string): string => {
  const cc = camelCase(str);
  return cc.charAt(0).toUpperCase() + cc.slice(1);
};
