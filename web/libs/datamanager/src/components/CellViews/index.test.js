import {
  normalizeCellAlias,
  SkippedByAnnotator,
  Annotators,
  Reviewers,
  UpdatedBy,
  CommentAuthors,
  GroundTruth,
} from "./index";
import { BooleanFilter } from "../Filters/types/Boolean";

describe("normalizeCellAlias", () => {
  it("maps skipped-by-annotator to its dedicated cell view (FIT-2435)", () => {
    expect(normalizeCellAlias("skipped_by_annotator")).toBe("SkippedByAnnotator");
  });

  it("maps ground_truth to its dedicated cell view (FIT-2525)", () => {
    expect(normalizeCellAlias("ground_truth")).toBe("GroundTruth");
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

describe("GroundTruth filter operators (FIT-2525)", () => {
  it("offers only is yes/no — no is empty", () => {
    const keys = GroundTruth.customOperators.map((op) => op.key);
    expect(keys).toEqual(["equal"]);
    expect(keys).not.toContain("empty");
    expect(GroundTruth.customOperators).toBe(BooleanFilter);
  });
});
