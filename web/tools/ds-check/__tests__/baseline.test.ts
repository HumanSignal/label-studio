import { describe, expect, test } from "bun:test";
import { compareToBaseline, countFindings } from "../baseline";

const finding = (file: string, rule: string) => ({ file, rule, line: 1, message: "" });

describe("ds-check baseline", () => {
  test("counts findings per file and rule, sorted", () => {
    const counts = countFindings([
      finding("b.tsx", "raw-control"),
      finding("a.tsx", "raw-control"),
      finding("a.tsx", "raw-control"),
    ]);
    expect(counts).toEqual({ "a.tsx": { "raw-control": 2 }, "b.tsx": { "raw-control": 1 } });
    expect(Object.keys(counts)).toEqual(["a.tsx", "b.tsx"]);
  });

  test("a rising count is a regression", () => {
    const result = compareToBaseline({ "a.tsx": { "raw-control": 1 } }, { "a.tsx": { "raw-control": 2 } });
    expect(result.regressions).toEqual([{ file: "a.tsx", rule: "raw-control", was: 1, now: 2 }]);
  });

  test("a new file or a new rule with a violation is a regression", () => {
    const result = compareToBaseline(
      { "a.tsx": { "raw-control": 1 } },
      { "a.tsx": { "raw-control": 1, "color-literal": 1 }, "n.tsx": { "raw-control": 1 } },
    );
    expect(result.regressions).toEqual([
      { file: "a.tsx", rule: "color-literal", was: 0, now: 1 },
      { file: "n.tsx", rule: "raw-control", was: 0, now: 1 },
    ]);
  });

  test("a falling count passes and is reported", () => {
    const result = compareToBaseline(
      { "a.tsx": { "raw-control": 3 }, "gone.tsx": { "raw-control": 1 } },
      { "a.tsx": { "raw-control": 1 } },
    );
    expect(result.regressions).toEqual([]);
    expect(result.improvements).toEqual([
      { file: "a.tsx", rule: "raw-control", was: 3, now: 1 },
      { file: "gone.tsx", rule: "raw-control", was: 1, now: 0 },
    ]);
  });

  test("scoped to some files, other baseline entries are ignored", () => {
    const result = compareToBaseline(
      { "a.tsx": { "raw-control": 3 }, "b.tsx": { "raw-control": 1 } },
      { "a.tsx": { "raw-control": 3 } },
      ["a.tsx"],
    );
    expect(result).toEqual({ regressions: [], improvements: [] });
  });
});
