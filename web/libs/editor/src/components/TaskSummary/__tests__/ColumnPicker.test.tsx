import { describe, expect, it, mock } from "bun:test";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { useState } from "react";
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

// cmdk / Radix Select rely on these browser APIs in jsdom.
global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};
Element.prototype.scrollIntoView = mock(() => {});

const buildDim = (id: number, name: string, isCategorical = true): DimensionInfo =>
  ({
    dimensionId: id,
    name,
    controlTag: "Choices",
    isCategorical,
    // Other fields aren't read by ColumnPicker; cast loosely.
  }) as unknown as DimensionInfo;

const ALL_DIMS = [
  buildDim(1, "sentiment"),
  buildDim(2, "category"),
  buildDim(3, "regions", false),
  buildDim(4, "boxes", false),
];

async function openColumnsDropdown() {
  fireEvent.click(screen.getByText(/Columns \(/));
  await waitFor(() => expect(screen.getByText("All Columns")).toBeInTheDocument());
}

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

describe("ColumnPicker All Columns (FIT-2761)", () => {
  it("selects every dimension in a single onVisibleColumnsChange call", async () => {
    const onVisibleColumnsChange = mock(() => {});
    render(
      <ColumnPicker
        totalDimensionCount={ALL_DIMS.length}
        shownCount={2}
        allDimensions={ALL_DIMS}
        visibleColumnIds={[1, 2]}
        onVisibleColumnsChange={onVisibleColumnsChange}
        conflictingDimensionIds={[1]}
      />,
    );

    await openColumnsDropdown();
    fireEvent.click(screen.getByText("All Columns"));

    expect(onVisibleColumnsChange).toHaveBeenCalledTimes(1);
    expect(onVisibleColumnsChange).toHaveBeenCalledWith([1, 2, 3, 4]);
  });

  it("selects every dimension when clicking the checkbox input directly", async () => {
    const onVisibleColumnsChange = mock(() => {});
    render(
      <ColumnPicker
        totalDimensionCount={ALL_DIMS.length}
        shownCount={2}
        allDimensions={ALL_DIMS}
        visibleColumnIds={[1, 2]}
        onVisibleColumnsChange={onVisibleColumnsChange}
        conflictingDimensionIds={[1]}
      />,
    );

    await openColumnsDropdown();
    const checkbox = screen.getByRole("checkbox", { name: "All Columns" });
    fireEvent.click(checkbox);

    expect(onVisibleColumnsChange).toHaveBeenCalledTimes(1);
    expect(onVisibleColumnsChange).toHaveBeenCalledWith([1, 2, 3, 4]);
  });

  it("clears every dimension in a single onVisibleColumnsChange call when all are selected", async () => {
    const onVisibleColumnsChange = mock(() => {});
    render(
      <ColumnPicker
        totalDimensionCount={ALL_DIMS.length}
        shownCount={ALL_DIMS.length}
        allDimensions={ALL_DIMS}
        visibleColumnIds={[1, 2, 3, 4]}
        onVisibleColumnsChange={onVisibleColumnsChange}
        conflictingDimensionIds={[1]}
      />,
    );

    await openColumnsDropdown();
    fireEvent.click(screen.getByText("All Columns"));

    expect(onVisibleColumnsChange).toHaveBeenCalledTimes(1);
    expect(onVisibleColumnsChange).toHaveBeenCalledWith([]);
  });

  it("stays responsive when toggling All Columns under controlled state (no update thrash)", async () => {
    let renderCount = 0;
    const Harness = () => {
      renderCount += 1;
      const [visibleColumnIds, setVisibleColumnIds] = useState<number[]>([1, 2]);
      return (
        <ColumnPicker
          totalDimensionCount={ALL_DIMS.length}
          shownCount={visibleColumnIds.length}
          allDimensions={ALL_DIMS}
          visibleColumnIds={visibleColumnIds}
          onVisibleColumnsChange={setVisibleColumnIds}
          conflictingDimensionIds={[1]}
        />
      );
    };

    render(<Harness />);
    const rendersBefore = renderCount;

    await openColumnsDropdown();
    fireEvent.click(screen.getByText("All Columns"));

    await waitFor(() => expect(screen.getByText(/Columns \(4 of 4\)/)).toBeInTheDocument());

    // One React commit for the bulk selection is enough; a cmdk/Select feedback loop
    // would climb far past this bound and eventually hang the page (FIT-2761).
    expect(renderCount - rendersBefore).toBeLessThan(25);

    fireEvent.click(screen.getByText("All Columns"));
    await waitFor(() => expect(screen.getByText(/Columns \(0 of 4\)/)).toBeInTheDocument());
    expect(renderCount - rendersBefore).toBeLessThan(40);
  });

  it("toggles All Columns with many dimensions without hanging", async () => {
    const many = Array.from({ length: 80 }, (_, i) => buildDim(i + 1, `dim-${i + 1}`, i % 3 !== 0));
    let renderCount = 0;
    const Harness = () => {
      renderCount += 1;
      const [visibleColumnIds, setVisibleColumnIds] = useState<number[]>(many.slice(0, 5).map((d) => d.dimensionId));
      return (
        <ColumnPicker
          totalDimensionCount={many.length}
          shownCount={visibleColumnIds.length}
          allDimensions={many}
          visibleColumnIds={visibleColumnIds}
          onVisibleColumnsChange={setVisibleColumnIds}
          conflictingDimensionIds={[1]}
        />
      );
    };

    render(<Harness />);
    const before = renderCount;
    await openColumnsDropdown();
    fireEvent.click(screen.getByText("All Columns"));
    await waitFor(() => expect(screen.getByText(/Columns \(80 of 80\)/)).toBeInTheDocument());
    expect(renderCount - before).toBeLessThan(30);
  });
});
