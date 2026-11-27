import { buildSearchVisiblePaths } from "./virtualized-search-filter";

/** Cap deep-search matches so broad queries (e.g. `id`) do not expand thousands of subtrees. */
export const DEEP_SEARCH_MAX_MATCHES = 500;

/** Build a JSON path segment the same way react-json-virtualization does. */
export function buildChildJsonPath(parentPath: string, key: string | number): string {
  if (typeof key === "number") {
    return `${parentPath}[${key}]`;
  }

  if (/^[$A-Z_a-z][$\w]*$/.test(key)) {
    return `${parentPath}.${key}`;
  }

  const escaped = key.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
  return `${parentPath}["${escaped}"]`;
}

export function isPathUnderFilter(path: string, pathFilterPrefix: string | undefined): boolean {
  if (!pathFilterPrefix) {
    return true;
  }

  return (
    path === pathFilterPrefix || path.startsWith(`${pathFilterPrefix}.`) || path.startsWith(`${pathFilterPrefix}[`)
  );
}

function normalizeForSearch(value: string, caseSensitive: boolean): string {
  return caseSensitive ? value : value.toLowerCase();
}

function includesQuery(value: string, query: string, caseSensitive: boolean): boolean {
  return normalizeForSearch(value, caseSensitive).includes(normalizeForSearch(query, caseSensitive));
}

export type DeepSearchOptions = {
  pathFilterPrefix?: string;
  caseSensitive?: boolean;
  maxMatches?: number;
};

/**
 * Walk the full JSON value (not just expanded viewer rows) and return library-style
 * paths ($.annotations[0].field) for keys, values, and path strings that match the query.
 */
export function findDeepSearchMatchPaths(root: unknown, query: string, options: DeepSearchOptions = {}): string[] {
  const trimmed = query.trim();
  if (!trimmed) {
    return [];
  }

  const { pathFilterPrefix, caseSensitive = false, maxMatches = DEEP_SEARCH_MAX_MATCHES } = options;
  const matches = new Set<string>();

  const recordMatch = (path: string) => {
    if (path !== "$" && isPathUnderFilter(path, pathFilterPrefix)) {
      matches.add(path);
    }
  };

  const walk = (value: unknown, path: string) => {
    if (matches.size >= maxMatches) {
      return;
    }

    if (path !== "$" && pathFilterPrefix && !isPathUnderFilter(path, pathFilterPrefix)) {
      return;
    }

    if (path !== "$" && includesQuery(path, trimmed, caseSensitive)) {
      recordMatch(path);
    }

    if (value === null || typeof value !== "object") {
      if (path !== "$") {
        const primitive = value === null ? "null" : String(value);
        if (includesQuery(primitive, trimmed, caseSensitive)) {
          recordMatch(path);
        }
      }
      return;
    }

    if (Array.isArray(value)) {
      value.forEach((item, index) => {
        walk(item, buildChildJsonPath(path, index));
      });
      return;
    }

    for (const [key, child] of Object.entries(value)) {
      const childPath = buildChildJsonPath(path, key);

      if (includesQuery(key, trimmed, caseSensitive)) {
        recordMatch(childPath);
      }

      walk(child, childPath);
    }
  };

  walk(root, "$");
  return [...matches];
}

export function buildDeepSearchExpansionPaths(
  root: unknown,
  query: string,
  options: DeepSearchOptions = {},
): Set<string> {
  const matches = findDeepSearchMatchPaths(root, query, options);
  if (matches.length === 0) {
    return new Set<string>();
  }

  return buildSearchVisiblePaths(matches);
}

export function scheduleDeepSearchExpansionPaths(
  root: unknown,
  query: string,
  options: DeepSearchOptions = {},
): { promise: Promise<Set<string>>; cancel: () => void } {
  let cancelled = false;
  const promise = new Promise<Set<string>>((resolve) => {
    queueMicrotask(() => {
      if (!cancelled) {
        resolve(buildDeepSearchExpansionPaths(root, query, options));
      }
    });
  });

  return {
    promise,
    cancel: () => {
      cancelled = true;
    },
  };
}
