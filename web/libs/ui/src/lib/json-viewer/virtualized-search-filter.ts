/** Match legacy json-edit-react search debounce. */
export const VIRTUALIZED_SEARCH_DEBOUNCE_MS = 350;

/** Parent JSON path; mirrors react-json-virtualization `parentPath`. */
export function parentJsonPath(path: string): string | null {
  if (path === "$") {
    return null;
  }

  if (path.endsWith("]")) {
    const index = path.lastIndexOf("[");
    if (index <= 0) {
      return "$";
    }
    return path.slice(0, index);
  }

  const dotIndex = path.lastIndexOf(".");
  if (dotIndex <= 0) {
    return "$";
  }

  return path.slice(0, dotIndex);
}

/** Ancestor-inclusive visible paths for direct search matches (legacy filter-on-search parity). */
export function buildSearchVisiblePaths(matchedPaths: readonly string[]): Set<string> {
  const included = new Set<string>();

  for (const matchPath of matchedPaths) {
    let cursor: string | null = matchPath;
    while (cursor) {
      included.add(cursor);
      cursor = parentJsonPath(cursor);
    }
  }

  return included;
}

export function areSearchVisiblePathsEqual(left: ReadonlySet<string>, right: ReadonlySet<string>): boolean {
  if (left.size !== right.size) {
    return false;
  }

  for (const path of right) {
    if (!left.has(path)) {
      return false;
    }
  }

  return true;
}
