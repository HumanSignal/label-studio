/**
 * Collapse duplicate annotation `result` rows that share `(id, from_name, type)`.
 * First occurrence wins (matches backend `dedupe_annotation_result_list`).
 *
 * @param {unknown[]} serialized
 * @returns {unknown[]}
 */
export function dedupeAnnotationWireResults(serialized) {
  if (!Array.isArray(serialized)) {
    return serialized;
  }
  const seen = new Set();
  const result = [];
  for (const entry of serialized) {
    if (!entry || typeof entry !== "object" || !entry.id) {
      result.push(entry);
      continue;
    }
    const key = `${entry.id}\u0000${entry.from_name}\u0000${entry.type}`;
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(entry);
  }
  return result;
}
