/** Above this size, CM6 skips schema autocomplete (syntax highlighting stays enabled). */
export const LARGE_DOCUMENT_CHAR_THRESHOLD = 100_000;

export function isLargeDocument(charCount: number): boolean {
  return charCount >= LARGE_DOCUMENT_CHAR_THRESHOLD;
}
