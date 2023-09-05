/**
 *
 * @param {HTMLElement} element
 * @param {string} selector
 */
export const matchesSelector = (element, selector) => {
  const matched = element?.matches?.(selector);
  if (matched) return element;

  const closest = element?.closest?.(selector);
  if (closest) return closest;

  return null;
};
