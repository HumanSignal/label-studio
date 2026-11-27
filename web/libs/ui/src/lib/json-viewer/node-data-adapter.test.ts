import { describe, expect, it } from "bun:test";
import { jsonPathToSegments, rowContextToNodeData } from "./node-data-adapter";

describe("node-data-adapter", () => {
  it("converts JSON paths to legacy nodeData path segments", () => {
    expect(jsonPathToSegments("$.annotations[0].id")).toEqual(["annotations", 0, "id"]);
    expect(jsonPathToSegments("$.data.image")).toEqual(["data", "image"]);
  });

  it("maps virtualized row context to json-edit-react nodeData shape", () => {
    const nodeData = rowContextToNodeData({
      mode: "tree",
      id: "row-1",
      path: "$.data.image",
      text: '"a.png"',
      sourceFormat: "json",
      row: {
        id: "row-1",
        path: "$.data.image",
        depth: 2,
        key: "image",
        valueType: "string",
        rawValue: "a.png",
        preview: '"a.png"',
        isExpandable: false,
        isExpanded: false,
      },
    });

    expect(nodeData).toEqual({
      key: "image",
      value: "a.png",
      path: ["data", "image"],
    });
  });
});
