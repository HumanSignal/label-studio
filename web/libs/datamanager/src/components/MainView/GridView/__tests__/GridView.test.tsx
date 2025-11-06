import { render, screen, fireEvent } from "@testing-library/react";
import { GridView, GridCell, GridHeader, GridDataGroup } from "../GridView";
import { configure } from "mobx";
import "@testing-library/jest-dom";
import type React from "react";
import { cn } from "../../../../utils/bem";
import { GridViewProvider } from "../GridPreview";

// Configure mobx to work with jest
configure({ enforceActions: "never" });

interface MockDataItem {
  id: number;
  data: {
    text: string;
    image: string;
    unknown: string;
    array: string[];
  };
  loading: boolean;
  getProperty: (path: string) => any;
}

// Mock MST getRoot
jest.mock("mobx-state-tree", () => ({
  ...jest.requireActual("mobx-state-tree"),
  getRoot: jest.fn((node) => ({
    dataStore: {
      total: 100,
      hasNextPage: true,
      pageSize: 10,
    },
    taskStore: {
      loadTask: jest.fn(),
    },
    SDK: {
      invoke: jest.fn(),
    },
  })),
}));

// Mock the required dependencies
jest.mock("react-virtualized-auto-sizer", () => ({
  __esModule: true,
  default: ({
    children,
  }: {
    children: (size: { width: number; height: number }) => React.ReactNode;
  }) => children({ width: 1000, height: 800 }),
}));

jest.mock("react-window", () => {
  const React = require("react");
  return {
    FixedSizeGrid: React.forwardRef(
      (
        {
          children,
          width,
          height,
          rowHeight,
          columnWidth,
          rowCount,
          columnCount,
          overscanRowCount,
          onItemsRendered,
          className,
          style,
          ...props
        }: {
          children: (props: {
            rowIndex: number;
            columnIndex: number;
            style: React.CSSProperties;
          }) => React.ReactNode;
          width?: number;
          height?: number;
          rowHeight?: number;
          columnWidth?: number;
          rowCount?: number;
          columnCount?: number;
          overscanRowCount?: number;
          onItemsRendered?: () => void;
          className?: string;
          style?: React.CSSProperties;
        },
        ref: any,
      ) => (
        <div
          ref={ref}
          data-testid="fixed-size-grid"
          className={className}
          style={{ ...style, width, height }}
          data-column-count={columnCount}
          data-row-count={rowCount}
          data-row-height={rowHeight}
          data-column-width={columnWidth}
        >
          {children({ rowIndex: 0, columnIndex: 0, style: {} })}
        </div>
      ),
    ),
  };
});

jest.mock("react-window-infinite-loader", () => ({
  __esModule: true,
  default: ({
    children,
  }: {
    children: (props: {
      onItemsRendered: () => void;
      ref: React.RefObject<unknown>;
    }) => React.ReactNode;
  }) => children({ onItemsRendered: jest.fn(), ref: jest.fn() }),
}));

// Mock data for testing
const mockData: MockDataItem[] = [
  {
    id: 1,
    data: {
      text: "Test text",
      image: "test-image.jpg",
      unknown: "unknown data",
      array: ["item1", "item2"],
    },
    loading: false,
    getProperty: (path: string) => {
      const parts = path.split(".");
      let current: any = mockData[0];
      for (const part of parts) {
        current = current[part];
      }
      return current;
    },
  },
  {
    id: 2,
    data: {
      text: "Another test",
      image: "another-image.jpg",
      unknown: "more unknown data",
      array: ["item3", "item4"],
    },
    loading: false,
    getProperty: (path: string) => {
      const parts = path.split(".");
      let current: any = mockData[1];
      for (const part of parts) {
        current = current[part];
      }
      return current;
    },
  },
];

const mockFields = [
  {
    id: "data:text",
    currentType: "Text",
    parent: { alias: "data" },
  },
  {
    id: "data:image",
    currentType: "Image",
    parent: { alias: "data" },
  },
  {
    id: "data:unknown",
    currentType: "Unknown",
    parent: { alias: "data" },
  },
  {
    id: "data:array",
    currentType: "Text",
    parent: { alias: "data" },
  },
];

const mockView = {
  gridWidth: 2,
  selected: {
    isSelected: jest.fn(),
    list: [],
    all: false,
  },
  dataStore: {
    hasNextPage: true,
    pageSize: 10,
  },
  gridFitImagesToWidth: false,
};

// Wrap components with BEM context for testing
const renderWithBEM = (ui: React.ReactElement) => {
  return render(<div className={cn("grid-view").toClassName()}>{ui}</div>);
};

describe("GridView", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("Main GridView Component", () => {
    it("renders grid view with correct number of columns", () => {
      renderWithBEM(
        <GridView data={mockData} view={mockView} fields={mockFields} loadMore={() => {}} onChange={() => {}} />,
      );

      const grid = screen.getByTestId("fixed-size-grid");
      expect(grid).toBeInTheDocument();
    });

    it("handles infinite loading correctly", () => {
      const loadMore = jest.fn();

      renderWithBEM(
        <GridView data={mockData} view={mockView} fields={mockFields} loadMore={loadMore} onChange={() => {}} />,
      );

      expect(screen.getByTestId("fixed-size-grid")).toBeInTheDocument();
    });

    it("adjusts grid width based on view.gridWidth", () => {
      const customView = { ...mockView, gridWidth: 3 };

      renderWithBEM(
        <GridView data={mockData} view={customView} fields={mockFields} loadMore={() => {}} onChange={() => {}} />,
      );

      const grid = screen.getByTestId("fixed-size-grid");
      expect(grid).toHaveAttribute("data-column-count", "3");
    });
  });

  describe("GridHeader Component", () => {
    it("renders header with checkbox and ID", () => {
      const row = mockData[0];
      const selected = {
        isSelected: jest.fn().mockReturnValue(false),
        toggleSelected: jest.fn(),
      };

      renderWithBEM(<GridHeader row={row} selected={selected} onSelect={selected.toggleSelected} />);

      expect(screen.getByRole("checkbox")).toBeInTheDocument();
      expect(screen.getByText(row.id.toString())).toBeInTheDocument();
    });

    it("handles checkbox selection state", () => {
      const row = mockData[0];
      const selected = {
        isSelected: jest.fn().mockReturnValue(true),
        toggleSelected: jest.fn(),
      };

      renderWithBEM(<GridHeader row={row} selected={selected} onSelect={selected.toggleSelected} />);

      const checkbox = screen.getByRole("checkbox");
      expect(checkbox).toBeChecked();
    });

    it("handles row selection through checkbox", () => {
      const row = mockData[0];
      const selected = {
        isSelected: jest.fn().mockReturnValue(false),
        toggleSelected: jest.fn(),
      };

      renderWithBEM(<GridHeader row={row} selected={selected} onSelect={selected.toggleSelected} />);

      const checkbox = screen.getByRole("checkbox");
      fireEvent.click(checkbox);
      expect(selected.toggleSelected).toHaveBeenCalledWith(row.id);
    });
  });

  describe("GridCell Component", () => {
    it("renders cell with header and body", () => {
      const row = mockData[0];
      const selected = { isSelected: jest.fn().mockReturnValue(false) };

      renderWithBEM(
        <GridCell
          view={mockView}
          row={row}
          fields={mockFields}
          selected={selected}
          columnCount={2}
          onClick={() => {}}
        />,
      );

      expect(screen.getByText(row.id.toString())).toBeInTheDocument();
    });

    it("handles selection state correctly", () => {
      const row = mockData[0];
      const selected = { isSelected: jest.fn().mockReturnValue(true) };

      renderWithBEM(
        <GridCell
          view={mockView}
          row={row}
          fields={mockFields}
          selected={selected}
          columnCount={2}
          onClick={() => {}}
        />,
      );

      expect(selected.isSelected).toHaveBeenCalledWith(row.id);
    });

    it("calls onChange when cell is clicked", () => {
      const row = mockData[0];
      const onChange = jest.fn();
      const selected = { isSelected: jest.fn().mockReturnValue(false) };

      renderWithBEM(
        <GridCell
          view={mockView}
          row={row}
          fields={mockFields}
          selected={selected}
          columnCount={2}
          onClick={onChange}
        />,
      );

      const cell = screen.getByText(row.id.toString()).closest('[data-testid="cell"]');
      if (cell) {
        fireEvent.click(cell);
        expect(onChange).toHaveBeenCalledWith(row.id);
      }
    });
  });

  describe("GridDataGroup Component", () => {
    it("renders text data correctly", () => {
      const row = mockData[0];
      const field = mockFields[0];

      renderWithBEM(
        <GridDataGroup type="Text" value={row.data.text} field={field} row={row} columnCount={2} hasImage={false} />,
      );

      expect(screen.getByText(row.data.text)).toBeInTheDocument();
    });

    it("renders unknown data type as text", () => {
      const row = mockData[0];
      const field = mockFields[2];

      renderWithBEM(
        <GridDataGroup
          type="Unknown"
          value={row.data.unknown}
          field={field}
          row={row}
          columnCount={2}
          hasImage={false}
        />,
      );

      expect(screen.getByText(row.data.unknown)).toBeInTheDocument();
    });

    it("handles array data by showing first element", () => {
      const row = mockData[0];
      const field = mockFields[3];

      renderWithBEM(
        <GridDataGroup type="Text" value={row.data.array} field={field} row={row} columnCount={2} hasImage={false} />,
      );

      expect(screen.getByText(JSON.stringify(row.data.array))).toBeInTheDocument();
    });
  });

  describe("Grid Selection Interactions", () => {
    it("handles row selection through checkbox", () => {
      const row = mockData[0];
      const selected = { isSelected: jest.fn().mockReturnValue(false) };
      const onSelect = jest.fn();

      renderWithBEM(<GridHeader row={row} selected={selected} onSelect={onSelect} />);

      const checkbox = screen.getByRole("checkbox");
      fireEvent.click(checkbox);
      expect(onSelect).toHaveBeenCalled();
    });

    it("handles multiple row selection", () => {
      const selected = {
        isSelected: jest.fn().mockReturnValue(false),
        list: [],
        all: false,
      };

      renderWithBEM(
        <GridView
          data={mockData}
          view={{ ...mockView, selected }}
          fields={mockFields}
          loadMore={() => {}}
          onChange={() => {}}
        />,
      );

      const checkboxes = screen.getAllByRole("checkbox");
      checkboxes.forEach((checkbox) => {
        fireEvent.click(checkbox);
      });

      expect(selected.isSelected).toHaveBeenCalledTimes(mockData.length);
    });
  });

  describe("Grid Responsive Behavior", () => {
    it("adjusts cell height based on content type", () => {
      const row = mockData[0];
      const selected = { isSelected: jest.fn().mockReturnValue(false) };
      const view = { ...mockView, gridFitImagesToWidth: false };

      renderWithBEM(
        <GridViewProvider
          data={[row]}
          view={view}
          fields={mockFields.map((f) => ({ ...f, alias: f.id.split(":")[1] }))}
        >
          <GridCell view={view} row={row} fields={mockFields} selected={selected} columnCount={2} onClick={() => {}} />
        </GridViewProvider>,
      );

      const cellBody = screen
        .getByText(row.id.toString())
        .closest(".ls-grid-view__cell")
        ?.querySelector(".ls-grid-view__cell-body");

      expect(cellBody).toHaveClass("ls-grid-view__cell-body_responsive");
    });

    it("handles different column counts", () => {
      const columnCounts = [1, 2, 3, 4];

      columnCounts.forEach((count) => {
        const { unmount } = renderWithBEM(
          <GridView
            data={mockData}
            view={{ ...mockView, gridWidth: count }}
            fields={mockFields}
            loadMore={() => {}}
            onChange={() => {}}
          />,
        );

        const grid = screen.getByTestId("fixed-size-grid");
        expect(grid).toHaveAttribute("data-column-count", count.toString());
        unmount();
      });
    });
  });
});
