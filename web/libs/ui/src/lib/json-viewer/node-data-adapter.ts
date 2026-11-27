import type { JSONViewerRowContext } from "react-json-virtualization";

export type JsonViewerNodeData = {
  key: string | number;
  value: unknown;
  path: (string | number)[];
};

export function jsonPathToSegments(jsonPath: string): (string | number)[] {
  if (!jsonPath || jsonPath === "$") {
    return [];
  }

  const trimmed = jsonPath.startsWith("$.") ? jsonPath.slice(2) : jsonPath.replace(/^\$\.?/, "");
  if (!trimmed) {
    return [];
  }

  const segments: (string | number)[] = [];
  const pattern = /([^.[\]]+)|\[(\d+)\]/g;
  let match = pattern.exec(trimmed);

  while (match) {
    if (match[1] !== undefined) {
      segments.push(match[1]);
    }
    if (match[2] !== undefined) {
      segments.push(Number(match[2]));
    }
    match = pattern.exec(trimmed);
  }

  return segments;
}

export function rowContextToNodeData(context: JSONViewerRowContext): JsonViewerNodeData | null {
  if (context.mode !== "tree") {
    return null;
  }

  return {
    key: context.row.key ?? "",
    value: context.row.rawValue,
    path: jsonPathToSegments(context.path),
  };
}
