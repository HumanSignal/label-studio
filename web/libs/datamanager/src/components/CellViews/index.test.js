import { normalizeCellAlias, SkippedByAnnotator, Annotators, Reviewers, UpdatedBy, CommentAuthors } from "./index";

describe("normalizeCellAlias", () => {
  it("maps skipped-by-annotator to its dedicated cell view (FIT-2435)", () => {
    expect(normalizeCellAlias("skipped_by_annotator")).toBe("SkippedByAnnotator");
  });
});

describe("SkippedByAnnotator filter operators (FIT-2435)", () => {
  it("offers user-list operators without is empty", () => {
    const keys = SkippedByAnnotator.customOperators.map((op) => op.key);
    expect(keys).toEqual(["contains", "not_contains"]);
    expect(keys).not.toContain("empty");
  });

  it.each([
    ["Annotators", Annotators],
    ["Reviewers", Reviewers],
    ["UpdatedBy", UpdatedBy],
    ["CommentAuthors", CommentAuthors],
  ])("keeps is empty available for %s", (_name, cellView) => {
    const keys = cellView.customOperators.map((op) => op.key);
    expect(keys).toEqual(expect.arrayContaining(["contains", "not_contains", "empty"]));
  });
});
