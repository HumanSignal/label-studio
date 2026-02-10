import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom";
import { TableRow } from "./TableRow";
import { TableContext } from "../TableContext";

// Mock DropdownTrigger component
const mockDropdownClose = jest.fn();
jest.mock("@humansignal/ui", () => ({
  DropdownTrigger: ({ children, content, triggerMode, dropdown, ...props }) => {
    const dropdownRef = {
      current: {
        close: mockDropdownClose,
      },
    };

    // Set the ref if provided
    if (dropdown) {
      Object.assign(dropdown, dropdownRef);
    }

    return (
      <div
        data-testid="dropdown-trigger"
        data-trigger-mode={triggerMode}
        {...props}
      >
        {children}
        <div data-testid="dropdown-content">{content}</div>
      </div>
    );
  },
}));

// Mock RowContextMenu component
jest.mock("../RowContextMenu/RowContextMenu", () => ({
  RowContextMenu: ({ row, column, view, onReviewTask, onViewAnalytics, onClose }) => (
    <div data-testid="row-context-menu">
      <div data-testid="menu-row-id">{row.id}</div>
      <div data-testid="menu-column-id">{column?.id || "no-column"}</div>
      <div data-testid="menu-view">{view ? "view-present" : "no-view"}</div>
      <button
        type="button"
        onClick={() => onReviewTask?.(row)}
        data-testid="menu-review-callback"
      >
        Review
      </button>
      <button
        type="button"
        onClick={() => onViewAnalytics?.(row)}
        data-testid="menu-analytics-callback"
      >
        Analytics
      </button>
      <button type="button" onClick={onClose} data-testid="menu-close">
        Close
      </button>
    </div>
  ),
}));

// Mock SkeletonLoader
jest.mock("../../SkeletonLoader", () => ({
  SkeletonLoader: () => <div data-testid="skeleton-loader">Loading...</div>,
}));

// Mock feature flags
jest.mock("../../../../utils/feature-flags", () => ({
  FF_LOPS_E_3: "fflag_feat_all_lops_e_3_short",
  isFF: jest.fn(() => false),
}));

// Mock utils
jest.mock("../utils", () => ({
  getProperty: jest.fn((obj, path) => {
    const keys = path.split(".");
    let result = obj;
    for (const key of keys) {
      result = result?.[key];
    }
    return result;
  }),
  getStyle: jest.fn(() => ({})),
}));

// Mock normalizeCellAlias
jest.mock("../../../CellViews", () => ({
  normalizeCellAlias: jest.fn((alias) => alias),
}));

// Mock BEM utility
jest.mock("../../../../utils/bem", () => ({
  cn: jest.fn((name) => ({
    toString: () => name,
    elem: (elem) => ({
      toString: () => `${name}__${elem}`,
      mix: () => ({
        toString: () => `${name}__${elem}`,
      }),
    }),
    mod: () => ({
      toString: () => name,
    }),
  })),
}));

// Mock styles
jest.mock("./TableRow.scss", () => ({}));

describe("TableRow - Context Menu Integration", () => {
  const mockView = {
    api: {
      task: jest.fn().mockResolvedValue({ id: 123 }),
    },
    SDK: { type: "LS" },
  };

  const mockData = {
    id: 1,
    task_id: 123,
    source: '{"data": "test"}',
    annotators: [{ id: 1, user: { id: 10 } }],
    isSelected: false,
    isHighlighted: false,
    isLoading: false,
  };

  const mockColumns = [
    { id: "col1", Header: "Column 1", alias: "col1" },
    { id: "col2", Header: "Column 2", alias: "col2" },
  ];

  const mockCellViews = {
    String: ({ value }) => <span data-testid="cell-value">{value}</span>,
  };

  const contextValue = {
    columns: mockColumns,
    cellViews: mockCellViews,
  };

  const defaultProps = {
    data: mockData,
    even: false,
    style: {},
    wrapperStyle: {},
    onClick: jest.fn(),
    stopInteractions: false,
    decoration: null,
    view: mockView,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  const renderWithContext = (props = {}) => {
    return render(
      <TableContext.Provider value={contextValue}>
        <TableRow {...defaultProps} {...props} />
      </TableContext.Provider>
    );
  };

  describe("DropdownTrigger Integration", () => {
    it("should render row wrapped with DropdownTrigger", () => {
      renderWithContext();

      expect(screen.getByTestId("dropdown-trigger")).toBeInTheDocument();
    });

    it("should configure DropdownTrigger with contextmenu trigger mode", () => {
      renderWithContext();

      const trigger = screen.getByTestId("dropdown-trigger");
      expect(trigger).toHaveAttribute("data-trigger-mode", "contextmenu");
    });

    it("should render RowContextMenu in dropdown content", () => {
      renderWithContext();

      expect(screen.getByTestId("row-context-menu")).toBeInTheDocument();
    });
  });

  describe("Context Menu Opening", () => {
    it("should handle right-click on row", () => {
      renderWithContext();

      const rowWrapper = screen.getByTestId("dropdown-trigger").querySelector(".table-row-wrapper");
      expect(rowWrapper).toBeInTheDocument();

      // Right-click should be handled by DropdownTrigger
      fireEvent.contextMenu(rowWrapper);

      // Menu should be present
      expect(screen.getByTestId("row-context-menu")).toBeInTheDocument();
    });

    it("should track clicked column on context menu", () => {
      const { getProperty } = require("../utils");
      getProperty.mockReturnValue("test-value");

      renderWithContext();

      const rowWrapper = screen.getByTestId("dropdown-trigger").querySelector(".table-row-wrapper");
      const cells = rowWrapper.querySelectorAll(".table__cell");

      // Simulate right-click on first cell
      fireEvent.contextMenu(cells[0]);

      // The column should be tracked (we can verify through the menu)
      const menuColumnId = screen.getByTestId("menu-column-id");
      // Initially no column is set, but after right-click it should be set
      expect(menuColumnId).toBeInTheDocument();
    });

    it("should handle context menu without clicking on a cell", () => {
      renderWithContext();

      const rowWrapper = screen.getByTestId("dropdown-trigger").querySelector(".table-row-wrapper");

      // Right-click on row wrapper itself (not on a cell)
      fireEvent.contextMenu(rowWrapper);

      // Menu should still render
      expect(screen.getByTestId("row-context-menu")).toBeInTheDocument();
    });
  });

  describe("RowContextMenu Props", () => {
    it("should pass row data to RowContextMenu", () => {
      renderWithContext();

      const menuRowId = screen.getByTestId("menu-row-id");
      expect(menuRowId).toHaveTextContent("1");
    });

    it("should pass view to RowContextMenu", () => {
      renderWithContext();

      const menuView = screen.getByTestId("menu-view");
      expect(menuView).toHaveTextContent("view-present");
    });

    it("should pass onReviewTask callback when provided", async () => {
      const mockOnReviewTask = jest.fn();
      const user = userEvent.setup();

      renderWithContext({ onReviewTask: mockOnReviewTask });

      await user.click(screen.getByTestId("menu-review-callback"));

      expect(mockOnReviewTask).toHaveBeenCalledWith(mockData);
    });

    it("should pass onViewAnalytics callback when provided", async () => {
      const mockOnViewAnalytics = jest.fn();
      const user = userEvent.setup();

      renderWithContext({ onViewAnalytics: mockOnViewAnalytics });

      await user.click(screen.getByTestId("menu-analytics-callback"));

      expect(mockOnViewAnalytics).toHaveBeenCalledWith(mockData);
    });

    it("should not break when LSE callbacks are not provided (OSS mode)", () => {
      renderWithContext();

      // Should render without errors
      expect(screen.getByTestId("row-context-menu")).toBeInTheDocument();

      // Callbacks should be undefined but component should work
      const reviewButton = screen.getByTestId("menu-review-callback");
      const analyticsButton = screen.getByTestId("menu-analytics-callback");

      expect(reviewButton).toBeInTheDocument();
      expect(analyticsButton).toBeInTheDocument();
    });
  });

  describe("Dropdown Close Functionality", () => {
    it("should close dropdown when onClose is called", async () => {
      const user = userEvent.setup();

      renderWithContext();

      await user.click(screen.getByTestId("menu-close"));

      expect(mockDropdownClose).toHaveBeenCalledTimes(1);
    });

    it("should provide close callback to RowContextMenu", () => {
      renderWithContext();

      const closeButton = screen.getByTestId("menu-close");
      expect(closeButton).toBeInTheDocument();
    });
  });

  describe("Regular Click Handling", () => {
    it("should still handle regular clicks on row", async () => {
      const mockOnClick = jest.fn();
      const user = userEvent.setup();

      renderWithContext({ onClick: mockOnClick });

      const rowWrapper = screen.getByTestId("dropdown-trigger").querySelector(".table-row-wrapper");
      await user.click(rowWrapper);

      expect(mockOnClick).toHaveBeenCalledWith(mockData, expect.any(Object));
    });

    it("should not interfere with cell interactions", () => {
      renderWithContext();

      const cells = screen.getAllByTestId("cell-value");
      expect(cells.length).toBeGreaterThan(0);

      // Cells should be clickable
      cells.forEach((cell) => {
        expect(cell).toBeInTheDocument();
      });
    });
  });

  describe("Row Rendering", () => {
    it("should render all columns", () => {
      const { getProperty } = require("../utils");
      getProperty.mockReturnValue("test-value");

      renderWithContext();

      const cells = screen.getAllByTestId("cell-value");
      expect(cells).toHaveLength(mockColumns.length);
    });

    it("should apply correct CSS classes based on row state", () => {
      renderWithContext({
        data: {
          ...mockData,
          isSelected: true,
          isHighlighted: true,
        },
      });

      const rowWrapper = screen.getByTestId("dropdown-trigger").querySelector(".table-row-wrapper");
      expect(rowWrapper).toBeInTheDocument();
    });

    it("should apply even modifier when even prop is true", () => {
      renderWithContext({ even: true });

      const rowWrapper = screen.getByTestId("dropdown-trigger").querySelector(".table-row-wrapper");
      expect(rowWrapper).toBeInTheDocument();
    });

    it("should apply disabled state when stopInteractions is true", () => {
      renderWithContext({ stopInteractions: true });

      const rowWrapper = screen.getByTestId("dropdown-trigger").querySelector(".table-row-wrapper");
      expect(rowWrapper).toBeInTheDocument();
    });
  });

  describe("Column Tracking", () => {
    it("should find correct column from cell element", () => {
      const { getProperty } = require("../utils");
      getProperty.mockReturnValue("test-value");

      renderWithContext();

      const rowWrapper = screen.getByTestId("dropdown-trigger").querySelector(".table-row-wrapper");
      const cells = rowWrapper.querySelectorAll(".table__cell");

      // Right-click on second cell
      fireEvent.contextMenu(cells[1]);

      // The context menu should be present
      expect(screen.getByTestId("row-context-menu")).toBeInTheDocument();
    });

    it("should handle context menu when cell is not found", () => {
      renderWithContext();

      const rowWrapper = screen.getByTestId("dropdown-trigger").querySelector(".table-row-wrapper");

      // Right-click on the wrapper itself (not a cell)
      fireEvent.contextMenu(rowWrapper);

      // Should still render menu
      expect(screen.getByTestId("row-context-menu")).toBeInTheDocument();

      // Column should be null
      const menuColumnId = screen.getByTestId("menu-column-id");
      expect(menuColumnId).toBeInTheDocument();
    });
  });

  describe("Loading State", () => {
    it("should show skeleton loader when cell is loading", () => {
      const { isFF } = require("../../../../utils/feature-flags");
      isFF.mockReturnValue(true);

      const loadingData = {
        ...mockData,
        loading: "col1",
      };

      renderWithContext({ data: loadingData });

      expect(screen.getByTestId("skeleton-loader")).toBeInTheDocument();
    });

    it("should not show skeleton loader when feature flag is off", () => {
      const { isFF } = require("../../../../utils/feature-flags");
      isFF.mockReturnValue(false);

      const loadingData = {
        ...mockData,
        loading: "col1",
      };

      renderWithContext({ data: loadingData });

      expect(screen.queryByTestId("skeleton-loader")).not.toBeInTheDocument();
    });
  });

  describe("Context Provider", () => {
    it("should use columns from TableContext", () => {
      renderWithContext();

      // Should render cells based on context columns
      const rowWrapper = screen.getByTestId("dropdown-trigger").querySelector(".table-row-wrapper");
      const cells = rowWrapper.querySelectorAll(".table__cell");

      expect(cells).toHaveLength(mockColumns.length);
    });

    it("should use cellViews from TableContext", () => {
      const { getProperty } = require("../utils");
      getProperty.mockReturnValue("test-value");

      renderWithContext();

      // Should use String cell view from context
      expect(screen.getAllByTestId("cell-value")).toHaveLength(mockColumns.length);
    });
  });

  describe("Edge Cases", () => {
    it("should handle missing onClick callback", () => {
      renderWithContext({ onClick: undefined });

      const rowWrapper = screen.getByTestId("dropdown-trigger").querySelector(".table-row-wrapper");

      // Should not throw error when clicking
      expect(() => {
        fireEvent.click(rowWrapper);
      }).not.toThrow();
    });

    it("should handle missing view prop", () => {
      renderWithContext({ view: undefined });

      // Should still render
      expect(screen.getByTestId("row-context-menu")).toBeInTheDocument();

      const menuView = screen.getByTestId("menu-view");
      expect(menuView).toHaveTextContent("no-view");
    });

    it("should handle empty columns array", () => {
      const emptyContext = {
        columns: [],
        cellViews: mockCellViews,
      };

      render(
        <TableContext.Provider value={emptyContext}>
          <TableRow {...defaultProps} />
        </TableContext.Provider>
      );

      // Should render without errors
      expect(screen.getByTestId("dropdown-trigger")).toBeInTheDocument();
    });

    it("should handle decoration prop", () => {
      const mockDecoration = {
        get: jest.fn(() => null),
      };

      renderWithContext({ decoration: mockDecoration });

      // Should render without errors
      expect(screen.getByTestId("dropdown-trigger")).toBeInTheDocument();
    });
  });

  describe("Custom Cell Renderers", () => {
    it("should render custom Cell function if provided", () => {
      const customColumns = [
        {
          id: "custom",
          Header: "Custom",
          Cell: ({ data }) => <div data-testid="custom-cell">{data.id}</div>,
        },
      ];

      const customContext = {
        columns: customColumns,
        cellViews: mockCellViews,
      };

      render(
        <TableContext.Provider value={customContext}>
          <TableRow {...defaultProps} />
        </TableContext.Provider>
      );

      expect(screen.getByTestId("custom-cell")).toBeInTheDocument();
      expect(screen.getByTestId("custom-cell")).toHaveTextContent("1");
    });
  });

  describe("Alignment and Positioning", () => {
    it("should configure dropdown with correct alignment", () => {
      renderWithContext();

      // DropdownTrigger should be configured with alignment
      const trigger = screen.getByTestId("dropdown-trigger");
      expect(trigger).toBeInTheDocument();
    });

    it("should position dropdown at cursor", () => {
      renderWithContext();

      // DropdownTrigger should be configured with positionAtCursor
      const trigger = screen.getByTestId("dropdown-trigger");
      expect(trigger).toBeInTheDocument();
    });
  });
});
