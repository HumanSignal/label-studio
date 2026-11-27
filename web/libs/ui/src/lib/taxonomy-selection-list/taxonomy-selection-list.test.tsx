import { beforeEach, describe, expect, it, mock, spyOn } from "bun:test";
import { fireEvent, render, screen } from "@testing-library/react";

import { TaxonomySelectionList } from "./taxonomy-selection-list";

describe("TaxonomySelectionList", () => {
  beforeEach(() => {
    spyOn(HTMLElement.prototype, "getBoundingClientRect").mockReturnValue({
      x: 0,
      y: 0,
      top: 0,
      left: 0,
      bottom: 120,
      right: 320,
      width: 320,
      height: 120,
      toJSON: () => ({}),
    });
  });

  it("displays resolved labels and removes the stored value without activating the trigger", () => {
    const onRemove = mock();
    const onTriggerClick = mock();
    render(
      <div onClick={onTriggerClick}>
        <TaxonomySelectionList
          items={[{ value: "technology/os", label: "Technology / Operating System" }]}
          onRemove={onRemove}
        />
      </div>,
    );

    expect(screen.getByText("Technology / Operating System")).toBeInTheDocument();
    expect(screen.queryByText("technology/os")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Remove Technology / Operating System" }));
    expect(onRemove).toHaveBeenCalledWith("technology/os");
    expect(onTriggerClick).not.toHaveBeenCalled();
  });

  it("keeps readonly selections visible without removal controls", () => {
    render(<TaxonomySelectionList items={[{ value: "os", label: "Operating System", isUserAdded: true }]} />);

    expect(screen.getByText("Operating System")).toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("shows the resolved label in the shared Badge tooltip when clipped", () => {
    const offsetWidth = Object.getOwnPropertyDescriptor(HTMLElement.prototype, "offsetWidth");
    const scrollWidth = Object.getOwnPropertyDescriptor(HTMLElement.prototype, "scrollWidth");
    Object.defineProperty(HTMLElement.prototype, "offsetWidth", { configurable: true, get: () => 100 });
    Object.defineProperty(HTMLElement.prototype, "scrollWidth", { configurable: true, get: () => 300 });
    try {
      render(<TaxonomySelectionList items={[{ value: "os", label: "Technology / Operating System" }]} />);

      fireEvent.mouseEnter(screen.getByText("Technology / Operating System"));
      expect(screen.getByTestId("tooltip-body")).toHaveTextContent("Technology / Operating System");
    } finally {
      if (offsetWidth) Object.defineProperty(HTMLElement.prototype, "offsetWidth", offsetWidth);
      else Reflect.deleteProperty(HTMLElement.prototype, "offsetWidth");
      if (scrollWidth) Object.defineProperty(HTMLElement.prototype, "scrollWidth", scrollWidth);
      else Reflect.deleteProperty(HTMLElement.prototype, "scrollWidth");
    }
  });

  it("keeps a large collection bounded while preserving accessible removal", () => {
    const onRemove = mock();
    const items = Array.from({ length: 500 }, (_, index) => ({ value: `value-${index}`, label: `Label ${index}` }));
    render(<TaxonomySelectionList items={items} onRemove={onRemove} />);

    const removeButtons = screen.getAllByRole("button", { name: /^Remove Label/ });
    expect(removeButtons.length).toBeGreaterThan(0);
    expect(removeButtons.length).toBeLessThan(40);
    expect(screen.queryByText("Label 499")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Remove Label 0" }));
    expect(onRemove).toHaveBeenCalledWith("value-0");
  });
});
