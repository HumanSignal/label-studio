import { fireEvent, render } from "@testing-library/react";
import { ViewAllToggle } from "../ViewAllToggle";

describe("shared ViewAllToggle", () => {
  it("reflects isActive via aria-pressed and exposes the compare-all data-testid", () => {
    const { getByTestId, rerender } = render(<ViewAllToggle isActive={false} onClick={() => {}} />);
    const button = getByTestId("compare-all-toggle");
    expect(button.getAttribute("aria-pressed")).toBe("false");
    expect(button.getAttribute("aria-label")).toBe("Compare all annotations");

    rerender(<ViewAllToggle isActive={true} onClick={() => {}} />);
    expect(getByTestId("compare-all-toggle").getAttribute("aria-pressed")).toBe("true");
  });

  it("invokes onClick when the toggle is clicked", () => {
    const onClick = mock();
    const { getByTestId } = render(<ViewAllToggle isActive={false} onClick={onClick} />);
    fireEvent.click(getByTestId("compare-all-toggle"));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("renders the BEM block class so PostCSS prefixes it as lsf-view-all-toggle", () => {
    const { getByTestId } = render(<ViewAllToggle isActive={true} onClick={() => {}} />);
    const button = getByTestId("compare-all-toggle");
    // In test runtime CSS_PREFIX defaults to "ls-"; in production PostCSS rewrites to "lsf-".
    expect(button.className).toMatch(/(?:^|\s)ls-view-all-toggle(?:\s|$)/);
    expect(button.className).toMatch(/ls-view-all-toggle_selected/);
  });
});
