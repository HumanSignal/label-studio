import { render, screen } from "@testing-library/react";
import { ColumnPicker } from "../agreement-dashboard/column-picker";
import type { DimensionInfo } from "../agreement-dashboard/types";

// Mock global APP_SETTINGS — required for any code that calls feature flag helpers
// transitively while rendering @humansignal/ui components.
Object.defineProperty(window, "APP_SETTINGS", {
  value: {
    user: { id: 1 },
    feature_flags: {},
    feature_flags_default_value: false,
  },
  writable: true,
});

const buildDim = (id: number, name: string, isCategorical = true): DimensionInfo =>
  ({
    dimensionId: id,
    name,
    controlTag: "Choices",
    isCategorical,
    // Other fields aren't read by ColumnPicker; cast loosely.
  }) as unknown as DimensionInfo;

describe("ColumnPicker legend", () => {
  const baseProps = {
    totalDimensionCount: 2,
    shownCount: 2,
    allDimensions: [buildDim(1, "sentiment"), buildDim(2, "category")],
    visibleColumnIds: [1, 2],
    onVisibleColumnsChange: () => {},
    conflictingDimensionIds: [1],
  };

  it("renders the submitted-annotations note", () => {
    render(<ColumnPicker {...baseProps} hasExistingGt={false} />);
    expect(screen.getByText("Agreement is only calculated for submitted annotations, not drafts")).toBeInTheDocument();
  });

  it("renders the 'common answer' conflict legend without a red circle when no GT exists", () => {
    const { container } = render(<ColumnPicker {...baseProps} hasExistingGt={false} />);
    expect(screen.getByText("Items marked red show conflicts with most common answer")).toBeInTheDocument();
    // Old-style red-circle marker should not be present.
    expect(container.querySelector(".border-negative-content")).toBeNull();
  });

  it("renders the 'ground truth' conflict legend when a saved GT annotation exists", () => {
    const { container } = render(<ColumnPicker {...baseProps} hasExistingGt={true} />);
    expect(screen.getByText("Items marked red show conflicts with ground truth")).toBeInTheDocument();
    expect(container.querySelector(".border-negative-content")).toBeNull();
  });
});
