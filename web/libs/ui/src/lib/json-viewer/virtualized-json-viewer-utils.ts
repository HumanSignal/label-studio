/** Default tree depth for Task Source–scale payloads (root + data + one annotation object). */
export const VIRTUALIZED_DEFAULT_EXPAND_DEPTH = 3;

/** Matches json-edit-react default `stringTruncate`. */
export const DEFAULT_STRING_TRUNCATE = 200;

export function clipString(value: string, maxLength: number): string {
  if (maxLength <= 3 || value.length <= maxLength) {
    return value;
  }

  return `${value.slice(0, maxLength - 3)}...`;
}

/** Clipboard text for a single node — mirrors json-edit-react enableClipboard behavior. */
export function formatNodeClipboardText(value: unknown): string {
  if (value !== null && typeof value === "object") {
    return JSON.stringify(value, null, 2);
  }

  return String(value);
}

export function resolveStringTruncate(stringTruncate?: number): number {
  return stringTruncate ?? DEFAULT_STRING_TRUNCATE;
}

export function resolvePathFilterQuery(activeFilterId: string | null): string | undefined {
  if (!activeFilterId || activeFilterId === "all") {
    return undefined;
  }

  // Task Source filters use ids that match JSON path segments (annotations, data, predictions).
  // Library paths are rooted at "$" (e.g. $.annotations[0]); prefix mode needs the $. prefix.
  return `$.${activeFilterId}`;
}

export function resolveInitialExpandDepth(collapseDepth: number | boolean): number {
  if (collapseDepth === false) {
    return VIRTUALIZED_DEFAULT_EXPAND_DEPTH;
  }

  if (collapseDepth === true) {
    return 0;
  }

  if (collapseDepth === Number.POSITIVE_INFINITY) {
    // Never fully expand MB payloads — filtering relies on pathFilterQuery, not deep expansion.
    return VIRTUALIZED_DEFAULT_EXPAND_DEPTH;
  }

  if (typeof collapseDepth === "number") {
    return collapseDepth;
  }

  return VIRTUALIZED_DEFAULT_EXPAND_DEPTH;
}
