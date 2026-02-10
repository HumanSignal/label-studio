# Lodash → Vanilla JS Replacements

All replacement functions live in **@humansignal/core**. Prefer: `import { uniqBy, throttle, debounce, clamp, get, isMatch, camelCase, snakeCase, kebabCase, capitalize } from "@humansignal/core"`. Inline equivalents below are for reference only.

## uniqBy(arr, key)

**Behavior**: Keeps **first** occurrence per key (lodash semantics). Do NOT use Map-based dedupe (keeps last).

```javascript
function uniqBy(arr, key) {
  const seen = new Set();
  return arr.filter((item) => {
    const val = item[key];
    if (seen.has(val)) return false;
    seen.add(val);
    return true;
  });
}
```

## throttle(fn, wait)

Timestamp + requestAnimationFrame/setTimeout. Leading call, then at most one per `wait` ms.

```javascript
function throttle(fn, wait) {
  let last = 0;
  let timeout = null;
  return function (...args) {
    const now = Date.now();
    const remaining = wait - (now - last);
    if (remaining <= 0 || remaining > wait) {
      if (timeout) {
        clearTimeout(timeout);
        timeout = null;
      }
      last = now;
      fn.apply(this, args);
    } else if (!timeout) {
      timeout = setTimeout(() => {
        last = Date.now();
        timeout = null;
        fn.apply(this, args);
      }, remaining);
    }
  };
}
```

## debounce(fn, wait [, immediate])

**Prefer**: `import { debounce } from "../utils/debounce";` (or relative path to `libs/editor/src/utils/debounce.js`).

Otherwise inline:

```javascript
function debounce(func, wait, immediate = false) {
  let timeout;
  return function (...args) {
    const later = () => {
      timeout = null;
      if (!immediate) func.apply(this, args);
    };
    const callNow = immediate && !timeout;
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
    if (callNow) func.apply(this, args);
  };
}
```

## camelCase(str)

```javascript
function camelCase(str) {
  return String(str)
    .replace(/[-_\s]+(.)?/g, (_, c) => (c ? c.toUpperCase() : ""))
    .replace(/^[A-Z]/, (c) => c.toLowerCase());
}
```

## snakeCase(str)

```javascript
function snakeCase(str) {
  return String(str)
    .replace(/([A-Z])/g, (l) => "_" + l.toLowerCase())
    .replace(/[-\s]+/g, "_")
    .replace(/^_/, "");
}
```

## kebabCase(str)

```javascript
function kebabCase(str) {
  return String(str)
    .replace(/([A-Z])/g, (l) => "-" + l.toLowerCase())
    .replace(/[\s_]+/g, "-")
    .replace(/^-/, "");
}
```

## capitalize(str)

```javascript
function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}
```

## clamp(num, lower, upper)

**Prefer**: `import { clamp } from "../utils/utilities";` (libs/editor: `utils/utilities.ts`).

Otherwise inline:

```javascript
function clamp(x, min, max) {
  return Math.min(max, Math.max(min, x));
}
```

## get(obj, path, defaultVal)

For known paths use optional chaining: `obj?.a?.b?.c`. For dynamic path strings (e.g. `"a.b.c"`):

```javascript
function get(obj, path, defaultVal) {
  const keys = Array.isArray(path) ? path : String(path).split(".");
  let cur = obj;
  for (const k of keys) {
    if (cur == null) return defaultVal;
    cur = cur[k];
  }
  return cur === undefined ? defaultVal : cur;
}
```

## cloneDeep(obj)

Use native when available:

```javascript
structuredClone(obj);
```

(For very old environments without `structuredClone`, use a simple JSON round-trip only if the object is JSON-serializable; otherwise keep a small deep-clone helper.)

## isMatch(obj, source)

Shallow match: source keys must equal obj keys.

```javascript
function isMatch(obj, source) {
  return Object.entries(source).every(([k, v]) => obj[k] === v);
}
```
