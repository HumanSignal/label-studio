/**
 * debounce(fn, wait, immediate) - Vanilla replacement for lodash/debounce.
 * Supports .cancel() and .flush() like lodash.
 * Reusable across the application.
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number,
  immediate = false,
): ((...args: Parameters<T>) => void) & { cancel: () => void; flush: () => void } {
  let timeout: ReturnType<typeof setTimeout> | undefined;
  let lastArgs: Parameters<T> | undefined;
  let lastThis: unknown;

  function debounced(this: unknown, ...args: Parameters<T>) {
    lastArgs = args;
    lastThis = this;
    const callNow = immediate && !timeout;

    clearTimeout(timeout);
    timeout = setTimeout(() => {
      timeout = undefined;
      if (!immediate) {
        const a = lastArgs;
        const ctx = lastThis;
        lastArgs = undefined;
        lastThis = undefined;
        if (a) func.apply(ctx, a);
      }
    }, wait);
    if (callNow) {
      lastArgs = undefined;
      lastThis = undefined;
      func.apply(this, args);
    }
  }

  debounced.cancel = (): void => {
    clearTimeout(timeout);
    timeout = undefined;
    lastArgs = undefined;
    lastThis = undefined;
  };

  debounced.flush = (): void => {
    if (timeout) {
      clearTimeout(timeout);
      timeout = undefined;
      const a = lastArgs;
      const ctx = lastThis;
      lastArgs = undefined;
      lastThis = undefined;
      if (a) func.apply(ctx, a);
    }
  };

  return debounced as ((...args: Parameters<T>) => void) & { cancel: () => void; flush: () => void };
}
