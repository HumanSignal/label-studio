/**
 * Vanilla JS replacements for lodash. Reusable across the application.
 * Use these instead of adding lodash.
 */

/**
 * uniqBy(arr, key) - Keeps first occurrence per key (lodash semantics).
 */
export function uniqBy<T>(arr: T[], key: keyof T | string): T[] {
  const seen = new Set<unknown>();
  return arr.filter((item) => {
    const val = item[key as keyof T];
    if (seen.has(val)) return false;
    seen.add(val);
    return true;
  });
}

/**
 * throttle(fn, wait, options) - Invokes fn at most once per wait ms.
 * Supports leading/trailing and .cancel() like lodash.
 */
export function throttle<T extends (...args: any[]) => any>(
  fn: T,
  wait: number,
  options: { leading?: boolean; trailing?: boolean } = {},
): T & { cancel: () => void } {
  const { leading = true, trailing = true } = options;
  let last = 0;
  let timeout: ReturnType<typeof setTimeout> | null = null;
  let lastArgs: Parameters<T> | null = null;
  let lastThis: unknown = null;

  function invoke(): void {
    last = Date.now();
    timeout = null;
    const args = lastArgs;
    const ctx = lastThis;
    lastArgs = null;
    lastThis = null;
    if (args) fn.apply(ctx, args);
  }

  function throttled(this: unknown, ...args: Parameters<T>): void {
    const now = Date.now();
    const remaining = wait - (now - last);
    lastArgs = args;
    lastThis = this;

    if (remaining <= 0 || remaining > wait) {
      if (timeout) {
        clearTimeout(timeout);
        timeout = null;
      }
      if (leading) {
        invoke();
      } else {
        last = now;
        if (trailing) {
          timeout = setTimeout(invoke, wait);
        }
      }
    } else if (trailing && !timeout) {
      timeout = setTimeout(invoke, remaining);
    }
  }

  throttled.cancel = (): void => {
    if (timeout) {
      clearTimeout(timeout);
      timeout = null;
    }
    lastArgs = null;
    lastThis = null;
  };

  return throttled as T & { cancel: () => void };
}

/**
 * clamp(num, lower, upper) - Clamp number to range.
 */
export function clamp(x: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, x));
}

/**
 * get(obj, path, defaultVal) - Get value at path (e.g. "a.b.c" or ["a","b","c"]).
 */
export function get(obj: unknown, path: string | string[], defaultVal?: unknown): unknown {
  const keys = Array.isArray(path) ? path : String(path).split(".");
  let cur: unknown = obj;
  for (const k of keys) {
    if (cur == null) return defaultVal;
    cur = (cur as Record<string, unknown>)[k];
  }
  return cur === undefined ? defaultVal : cur;
}

/**
 * isMatch(obj, source) - Shallow match: source keys must equal obj values.
 */
export function isMatch(obj: Record<string, unknown>, source: Record<string, unknown>): boolean {
  return Object.entries(source).every(([k, v]) => (obj as Record<string, unknown>)[k] === v);
}
