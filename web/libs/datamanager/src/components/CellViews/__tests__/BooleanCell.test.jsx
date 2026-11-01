import { describe, expect, it } from "bun:test";
import { render } from "@testing-library/react";
import { BooleanCell, GroundTruth } from "../BooleanCell";

describe("BooleanCell", () => {
  it.each([
    [true, "True"],
    [1, "True"],
    ["true", "True"],
    [false, "False"],
    [0, "False"],
    [null, "False"],
  ])("renders %p as the plain text %s", (value, label) => {
    const { container } = render(<>{BooleanCell({ value })}</>);
    expect(container.textContent).toBe(label);
  });

  it("renders a yes/no value as text, not as a state badge", () => {
    const { container } = render(<>{BooleanCell({ value: true })}</>);
    expect(container.querySelector("[class*='badge']")).toBeNull();
  });

  it("renders Ground Truth the same way", () => {
    const { container } = render(<>{GroundTruth({ value: false })}</>);
    expect(container.textContent).toBe("False");
    expect(container.querySelector("[class*='badge']")).toBeNull();
  });
});
