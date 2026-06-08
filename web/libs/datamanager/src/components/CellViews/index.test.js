import { normalizeCellAlias } from "./index";

describe("normalizeCellAlias", () => {
  it("uses the annotators cell view for skipped-by-annotator filters", () => {
    expect(normalizeCellAlias("skipped_by_annotator")).toBe("Annotators");
  });
});
