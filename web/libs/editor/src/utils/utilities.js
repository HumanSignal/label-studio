/**
 * Minimal shim for html.js when it imports from "./utilities.js".
 * html.js only needs hashCode; other importers should use "./utilities" (resolves to utilities.ts).
 */
export function hashCode(str) {
  let hash = 0;
  if (str.length === 0) return `${hash}`;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash;
  }
  return `${hash}`;
}
