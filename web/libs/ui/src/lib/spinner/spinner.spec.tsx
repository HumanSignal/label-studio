import { render } from "@testing-library/react";
import { Spinner } from "./spinner";

const diameter = (container: HTMLElement) =>
  (container.firstElementChild as HTMLElement).style.getPropertyValue("--spinner-size");

describe("Spinner", () => {
  it("is medium, 32 px, by default", () => {
    expect(diameter(render(<Spinner />).container)).toBe("32px");
  });

  it.each([
    ["smallest", "12px"],
    ["smaller", "16px"],
    ["small", "24px"],
    ["large", "48px"],
    ["larger", "64px"],
    ["largest", "96px"],
  ] as const)("draws %s at %s", (size, px) => {
    expect(diameter(render(<Spinner size={size} />).container)).toBe(px);
  });
});
