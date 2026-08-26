import { fireEvent, render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import { useRef } from "react";
import { DropdownTrigger } from "../dropdown/dropdown-trigger";
import type { DropdownRef } from "../dropdown/dropdown";
import * as dropdownModule from "../dropdown/dropdown";
import { TaxonomySelectionChip } from "./taxonomy-selection-chip";
import { isTaxonomyChipOutsideClickTarget } from "./taxonomy-multi-tree-utils";

const createMockDropdownElement = () => {
  const mockElement = {
    contains: mock(() => false),
    addEventListener: mock(),
    removeEventListener: mock(),
  };
  return mockElement as any;
};

describe("TaxonomySelectionChip", () => {
  const levelOptions = [
    { value: "high", label: "High" },
    { value: "low", label: "Low" },
  ];

  beforeEach(() => {
    Object.defineProperty(HTMLElement.prototype, "scrollIntoView", {
      value: mock(),
      writable: true,
      configurable: true,
    });
  });

  afterEach(() => {
    // Delete instead of restoring JSDOM's undefined — leaving undefined on
    // HTMLElement.prototype shadows Element.prototype.scrollIntoView and breaks
    // later Select/cmdk tests in the shared Bun process.
    delete (HTMLElement.prototype as any).scrollIntoView;
  });

  it("marks chip selects as interactive and does not toggle parent dropdown", () => {
    const toggleSpy = mock();

    spyOn(dropdownModule, "Dropdown").mockImplementation(({ children, ref }: any) => {
      if (ref) {
        const mockRef: any = {
          dropdown: createMockDropdownElement(),
          visible: false,
          toggle: toggleSpy,
          open: mock(),
          close: mock(),
        };
        if (typeof ref === "function") {
          ref(mockRef);
        } else {
          ref.current = mockRef;
        }
      }
      return <div data-testid="dropdown-content">{children}</div>;
    });

    const TestComponent = () => {
      const dropdownRef = useRef<DropdownRef>(null);

      return (
        <DropdownTrigger
          content={<div>Tree menu</div>}
          dropdown={dropdownRef}
          isChildValid={isTaxonomyChipOutsideClickTarget}
        >
          <div data-testid="multi-tree-trigger">
            <TaxonomySelectionChip
              selection={{ code: "cat-1", label: "Category", level: "high" }}
              displayLabel="Category"
              withLevel
              levelOptions={levelOptions}
            />
          </div>
        </DropdownTrigger>
      );
    };

    render(<TestComponent />);

    expect(document.querySelector("[data-taxonomy-chip-interactive]")).toBeInTheDocument();

    const levelSelect = screen.getByRole("button", { name: "Level for Category" });
    fireEvent.click(levelSelect);

    expect(toggleSpy).not.toHaveBeenCalled();
    expect(screen.getByTestId("select-popup")).toBeInTheDocument();
  });

  it("shows Select level and unfilled state when no level is chosen", () => {
    const { container } = render(
      <TaxonomySelectionChip
        selection={{ code: "cat-1", label: "Category" }}
        displayLabel="Category"
        chipLayout="stacked"
        withLevel
        levelOptions={levelOptions}
      />,
    );

    expect(container.querySelector('[data-taxonomy-chip-state="unfilled"]')).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Level for Category, required" })).toHaveTextContent("Select level");
    expect(screen.getByRole("button", { name: "Level for Category, required" })).not.toHaveAttribute("aria-invalid");
  });

  it("uses filled primary state when a level is chosen", () => {
    const { container } = render(
      <TaxonomySelectionChip
        selection={{ code: "cat-1", label: "Category", level: "high" }}
        displayLabel="Category"
        chipLayout="stacked"
        withLevel
        levelOptions={levelOptions}
      />,
    );

    expect(container.querySelector('[data-taxonomy-chip-state="filled"]')).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Level for Category" })).toHaveTextContent("High");
  });

  it("escalates to invalid state when highlightIncomplete is set", () => {
    const { container } = render(
      <TaxonomySelectionChip
        selection={{ code: "cat-1", label: "Category" }}
        displayLabel="Category"
        chipLayout="stacked"
        withLevel
        levelOptions={levelOptions}
        highlightIncomplete
      />,
    );

    expect(container.querySelector('[data-taxonomy-chip-state="invalid"]')).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Level for Category, required" })).toHaveAttribute(
      "aria-invalid",
      "true",
    );
  });

  it("caps a plain chip's label by available width rather than a fixed pixel width", () => {
    render(<TaxonomySelectionChip selection={{ code: "cat-1", label: "Category" }} displayLabel="A very long label" />);

    // A fixed cap truncated chips even when the container had room to spare, which is unusable at
    // narrow viewports.
    expect(screen.getByText("A very long label")).toHaveStyle({ maxWidth: "100%" });
  });

  it("calls onRemove when the badge close button is clicked", () => {
    const onRemove = mock();

    render(
      <TaxonomySelectionChip
        selection={{ code: "cat-1", label: "Category", level: "high" }}
        displayLabel="Category"
        withLevel
        levelOptions={levelOptions}
        onRemove={onRemove}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Remove Category" }));
    expect(onRemove).toHaveBeenCalledWith("cat-1");
  });
});
