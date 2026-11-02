/**
 * Pure helpers for the Data Manager column drag-and-drop (FIT-3307).
 *
 * A "gap" is an insertion point between columns: gap 0 is before the first column,
 * gap N is after the last one. The rects and the pointer position only need to share one coordinate
 * space (TableHead uses header-relative layout boxes), so horizontal scroll and page offsets never
 * enter the math.
 */

/**
 * Finds the gap closest to the pointer.
 *
 * @param {Array<{left: number, right: number}>} rects Column boxes in visual order.
 * @param {number} pointerX Pointer position, in the same coordinate space as `rects`.
 * @returns {{gapIndex: number, offset: number} | null} The gap index and its x position in that
 * coordinate space, or `null` when there are no columns.
 */
export const getColumnDropTarget = (rects, pointerX) => {
  if (!rects?.length) return null;

  let gapIndex = 0;

  for (const { left, right } of rects) {
    if (pointerX < left + (right - left) / 2) break;
    gapIndex += 1;
  }

  const offset = gapIndex < rects.length ? rects[gapIndex].left : rects[rects.length - 1].right;

  return { gapIndex, offset };
};

/**
 * Moves `draggedId` into `gapIndex`, where the gap index refers to the list *before* the move.
 * Returns a new array; the input is never mutated.
 *
 * @param {string[]} ids Column ids in current order.
 * @param {string} draggedId
 * @param {number} gapIndex
 */
export const reorderColumnIds = (ids, draggedId, gapIndex) => {
  const fromIndex = ids.indexOf(draggedId);

  if (fromIndex === -1) return [...ids];

  const next = ids.filter((id) => id !== draggedId);
  // Removing the dragged column shifts every gap after it one position to the left.
  const insertAt = gapIndex > fromIndex ? gapIndex - 1 : gapIndex;

  next.splice(insertAt, 0, draggedId);

  return next;
};
