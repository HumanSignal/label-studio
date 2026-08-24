import { describe, expect, it } from "bun:test";
import { buildDeepSearchExpansionPaths, findDeepSearchMatchPaths } from "./deep-search";

const FIT_2107_TASK_SOURCE = {
  id: 271216056,
  data: { text: "sample" },
  annotations: [
    {
      result: [
        {
          value: {
            reactcode: {
              fields: {
                review_dimensions: "moderate",
                review_comments: "Nested field should remain searchable",
              },
            },
          },
          from_name: "reactcode",
          to_name: "text",
          type: "reactcode",
        },
      ],
    },
  ],
};

const FIT_2107_REVIEW_DIMENSIONS_PATH = "$.annotations[0].result[0].value.reactcode.fields.review_dimensions";

describe("deep-search", () => {
  it("finds deeply nested keys for partial review_ query (FIT-2107)", () => {
    const matches = findDeepSearchMatchPaths(FIT_2107_TASK_SOURCE, "review_");

    expect(matches).toContain(FIT_2107_REVIEW_DIMENSIONS_PATH);
    expect(matches).toContain("$.annotations[0].result[0].value.reactcode.fields.review_comments");
  });

  it("includes ancestor paths for expansion", () => {
    const expansion = buildDeepSearchExpansionPaths(FIT_2107_TASK_SOURCE, "review_");

    expect(expansion.has("$")).toBe(true);
    expect(expansion.has("$.annotations[0].result[0].value.reactcode.fields")).toBe(true);
    expect(expansion.has(FIT_2107_REVIEW_DIMENSIONS_PATH)).toBe(true);
    expect(expansion.has("$.data")).toBe(false);
  });

  it("scopes matches to the active path filter prefix", () => {
    const matches = findDeepSearchMatchPaths(FIT_2107_TASK_SOURCE, "review_", {
      pathFilterPrefix: "$.annotations",
    });

    expect(matches.every((path) => path.startsWith("$.annotations"))).toBe(true);
    expect(matches).toContain(FIT_2107_REVIEW_DIMENSIONS_PATH);
  });

  it("returns no matches outside the path filter prefix", () => {
    const matches = findDeepSearchMatchPaths(FIT_2107_TASK_SOURCE, "sample", {
      pathFilterPrefix: "$.annotations",
    });

    expect(matches).toHaveLength(0);
  });

  it("stops collecting matches once maxMatches is reached", () => {
    const payload = {
      items: Array.from({ length: 20 }, (_, index) => ({ [`match_${index}`]: index })),
    };

    const matches = findDeepSearchMatchPaths(payload, "match_", { maxMatches: 5 });

    expect(matches).toHaveLength(5);
  });
});
