import { render } from "@testing-library/react";
import { getColumnIconByAlias } from "../columnIcons";

describe("getColumnIconByAlias", () => {
  it.each([
    "total_annotations",
    "cancelled_annotations",
    "total_predictions",
    "reviews_accepted",
    "reviews_rejected",
    "ground_truth",
    "comment_count",
    "unresolved_comment_count",
  ] as const)("returns an icon for %s", (alias) => {
    const { container } = render(<>{getColumnIconByAlias(alias)}</>);
    expect(container.querySelector("svg")).toBeTruthy();
  });

  it("returns null for columns without a header icon", () => {
    expect(getColumnIconByAlias("id")).toBeNull();
    expect(getColumnIconByAlias(undefined)).toBeNull();
  });
});
