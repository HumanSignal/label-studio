/**
 * Header alignment contract for DataTable.
 *
 * Numeric columns are right-aligned in their cells, so their headers have to reach the same edge. That
 * used to be impossible through the public API, and a consumer (the payments Programs list) got there by
 * targeting the header's private CSS-module class name from its own stylesheet — which a rename inside
 * this component would have silently broken. The `align` column property is the supported way.
 */

import { fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import type { SortingState } from "@tanstack/react-table";

import { DataTable, type ExtendedDataTableColumnDef } from "./data-table";

type Row = { id: number; name: string; total: number };

const ROWS: Row[] = [
  { id: 1, name: "Wren", total: 1200 },
  { id: 2, name: "Meadow", total: 34 },
];

/** The element that lays out a header's label group — the thing `align` has to act on. */
function headerLabelGroup(columnId: string): HTMLElement {
  const cell = screen.getByTestId(`data-table-header-${columnId}`);
  const group = cell.querySelector<HTMLElement>("[class*='headerContent'] > div");
  if (!group) throw new Error(`No header label group for "${columnId}"`);
  return group;
}

function renderTable(columns: ExtendedDataTableColumnDef<Row>[]) {
  render(<DataTable data={ROWS} columns={columns} dataTestId="table" />);
}

describe("DataTable header align", () => {
  it("pushes a right-aligned header label to the cell's far edge", () => {
    renderTable([
      { id: "total", header: "Total", align: "right", cell: ({ row }) => <span>{row.original.total}</span> },
    ]);

    const group = headerLabelGroup("total");
    expect(group.className).toContain("ml-auto");
  });

  it("does not let a right-aligned label shrink, so a long one keeps its first words", () => {
    // Overflow on a right-aligned string is clipped from its START, so stretching the label group to fill
    // the cell turned "Need to pay (est.)" into "ed to pay (est.)" in a narrow column. An auto margin
    // pushes the label over at its content width instead.
    renderTable([
      {
        id: "total",
        header: "Need to pay (est.)",
        align: "right",
        cell: ({ row }) => <span>{row.original.total}</span>,
      },
    ]);

    const group = headerLabelGroup("total");
    expect(group.className).not.toContain("flex-1");
    expect(group.className).not.toContain("min-w-0");
  });

  it("leaves headers left-aligned by default, so existing tables are untouched", () => {
    renderTable([{ id: "name", header: "Name", cell: ({ row }) => <span>{row.original.name}</span> }]);

    const group = headerLabelGroup("name");
    expect(group.className).not.toContain("ml-auto");
  });

  it("still renders the label and the help icon when aligned right", () => {
    renderTable([
      {
        id: "total",
        header: "Total",
        align: "right",
        help: "What the run will pay",
        cell: ({ row }) => <span>{row.original.total}</span>,
      },
    ]);

    expect(screen.getByText("Total")).toBeInTheDocument();
    // `help` renders behind an info icon; alignment must not drop it.
    expect(screen.getByTestId("data-table-header-total").querySelector("svg")).toBeTruthy();
  });
});

function clickHeader(columnId: string) {
  const content = screen.getByTestId(`data-table-header-${columnId}`).firstElementChild;
  if (!content) throw new Error(`No clickable content for header "${columnId}"`);
  fireEvent.click(content);
}

function rowNames(): string[] {
  return Array.from(document.querySelectorAll<HTMLElement>('[data-testid^="data-table-row-"]')).map(
    (row) => row.textContent ?? "",
  );
}

function SortProbe({ enableSortingRemoval }: { enableSortingRemoval?: boolean }) {
  const [sorting, setSorting] = useState<SortingState>([]);
  return (
    <div>
      <div data-testid="sort-state">
        {sorting.length > 0 ? `${sorting[0].id}:${sorting[0].desc ? "desc" : "asc"}` : "none"}
      </div>
      <DataTable
        data={ROWS}
        columns={[
          { id: "name", accessorKey: "name", header: "Name", enableSorting: true },
          { id: "total", accessorKey: "total", header: "Total", enableSorting: true },
        ]}
        enableSorting
        enableSortingRemoval={enableSortingRemoval}
        sorting={sorting}
        onSortingChange={setSorting}
        dataTestId="table"
      />
    </div>
  );
}

describe("DataTable header sorting cycle", () => {
  it("keeps the historic two-state cycle (asc ↔ desc) when enableSortingRemoval is off", () => {
    render(<SortProbe />);

    clickHeader("name");
    expect(screen.getByTestId("sort-state").textContent).toBe("name:asc");
    clickHeader("name");
    expect(screen.getByTestId("sort-state").textContent).toBe("name:desc");
    clickHeader("name");
    expect(screen.getByTestId("sort-state").textContent).toBe("name:asc");
  });

  it("cycles asc → desc → unsorted when enableSortingRemoval is set", () => {
    render(<SortProbe enableSortingRemoval />);

    clickHeader("name");
    expect(screen.getByTestId("sort-state").textContent).toBe("name:asc");
    expect(rowNames()[0]).toContain("Meadow");
    clickHeader("name");
    expect(screen.getByTestId("sort-state").textContent).toBe("name:desc");
    expect(rowNames()[0]).toContain("Wren");
    clickHeader("name");
    expect(screen.getByTestId("sort-state").textContent).toBe("none");
  });
});
