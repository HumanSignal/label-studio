import { render, screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";
import { TableRow } from "./TableRow";
import { TableContext } from "../TableContext";

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
  cn: jest.fn((name) => {
    const createCN = (fullName, mods = {}) => {
      const modClasses = Object.entries(mods)
        .filter(([_, value]) => value)
        .map(([key, value]) => {
          if (value === true) return `${fullName}_${key}`;
          return `${fullName}_${key}_${value}`;
        })
        .join(" ");

      const finalClass = modClasses ? `${fullName} ${modClasses}` : fullName;

      return {
        toString: () => finalClass,
        toClassName: () => finalClass,
        elem: (elem) => createCN(`${name}__${elem}`),
        mod: (newMods) => createCN(fullName, { ...mods, ...newMods }),
        mix: (..._mixins) => createCN(fullName, mods),
      };
    };
    return createCN(name);
  }),
}));

// Mock styles
jest.mock("./TableRow.scss", () => ({}));

describe("TableRow", () => {
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
    { id: "col1", Header: "Column 1", alias: "col1", original: { currentType: "String" } },
    { id: "col2", Header: "Column 2", alias: "col2", original: { currentType: "String" } },
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
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  const renderWithContext = (props = {}, contextOverrides = {}) => {
    return render(
      <TableContext.Provider value={{ ...contextValue, ...contextOverrides }}>
        <TableRow {...defaultProps} {...props} />
      </TableContext.Provider>,
    );
  };

  describe("Basic Rendering", () => {
    it("should render row with correct structure", () => {
      const { getProperty } = require("../utils");
      getProperty.mockReturnValue("test-value");

      renderWithContext();

      // Check for row wrapper
      expect(screen.getByTestId("table-row-wrapper")).toBeInTheDocument();

      // Check for table row
      expect(screen.getByTestId("table-row")).toBeInTheDocument();
    });

    it("should render cells for each column", () => {
      const { getProperty } = require("../utils");
      getProperty.mockReturnValue("test-value");

      const { container } = renderWithContext();

      const cells = container.querySelectorAll('[class*="table__cell"]');
      expect(cells.length).toBeGreaterThanOrEqual(2);
    });

    it("should apply even modifier when even prop is true", () => {
      renderWithContext({ even: true });

      expect(screen.getByTestId("table-row-wrapper")).toBeInTheDocument();
    });

    it("should apply selected modifier when data is selected", () => {
      const selectedData = { ...mockData, isSelected: true };
      renderWithContext({ data: selectedData });

      expect(screen.getByTestId("table-row-wrapper")).toBeInTheDocument();
    });

    it("should apply highlighted modifier when data is highlighted", () => {
      const highlightedData = { ...mockData, isHighlighted: true };
      renderWithContext({ data: highlightedData });

      expect(screen.getByTestId("table-row-wrapper")).toBeInTheDocument();
    });

    it("should apply loading modifier when data is loading", () => {
      const loadingData = { ...mockData, isLoading: true };
      renderWithContext({ data: loadingData });

      expect(screen.getByTestId("table-row-wrapper")).toBeInTheDocument();
    });

    it("should apply disabled modifier when stopInteractions is true", () => {
      renderWithContext({ stopInteractions: true });

      expect(screen.getByTestId("table-row-wrapper")).toBeInTheDocument();
    });
  });

  describe("Click Handling", () => {
    it("should call onClick when row is clicked", () => {
      const mockOnClick = jest.fn();
      renderWithContext({ onClick: mockOnClick });

      const rowWrapper = screen.getByTestId("table-row-wrapper");
      fireEvent.click(rowWrapper);

      expect(mockOnClick).toHaveBeenCalledWith(mockData, expect.any(Object));
    });

    it("should not call onClick when stopInteractions is true", () => {
      const mockOnClick = jest.fn();
      renderWithContext({ onClick: mockOnClick, stopInteractions: true });

      const rowWrapper = screen.getByTestId("table-row-wrapper");
      fireEvent.click(rowWrapper);

      // onClick is still called, but the parent component should handle stopInteractions
      expect(mockOnClick).toHaveBeenCalled();
    });
  });

  describe("Context Menu Integration", () => {
    it("should call onContextMenu when right-clicked", () => {
      const mockOnContextMenu = jest.fn();
      renderWithContext({ onContextMenu: mockOnContextMenu });

      const rowWrapper = screen.getByTestId("table-row-wrapper");
      fireEvent.contextMenu(rowWrapper);

      expect(mockOnContextMenu).toHaveBeenCalledWith(expect.any(Object), mockData);
    });

    it("should apply context-menu-open modifier when contextMenuRowId matches", () => {
      renderWithContext({}, { contextMenuRowId: mockData.id });

      expect(screen.getByTestId("table-row-wrapper")).toBeInTheDocument();
    });

    it("should not apply context-menu-open modifier when contextMenuRowId does not match", () => {
      renderWithContext({}, { contextMenuRowId: 999 });

      expect(screen.getByTestId("table-row-wrapper")).toBeInTheDocument();
    });

    it("should pass event and data to onContextMenu callback", () => {
      const mockOnContextMenu = jest.fn();
      renderWithContext({ onContextMenu: mockOnContextMenu });

      const rowWrapper = screen.getByTestId("table-row-wrapper");
      const event = new MouseEvent("contextmenu", { bubbles: true });
      fireEvent(rowWrapper, event);

      expect(mockOnContextMenu).toHaveBeenCalledTimes(1);
      const [eventArg, dataArg] = mockOnContextMenu.mock.calls[0];
      expect(eventArg).toBeDefined();
      expect(dataArg).toEqual(mockData);
    });
  });

  describe("Cell Rendering", () => {
    it("should render cell values using getProperty", () => {
      const { getProperty } = require("../utils");
      getProperty.mockReturnValue("test-value");

      renderWithContext();

      const cellValues = screen.getAllByTestId("cell-value");
      expect(cellValues).toHaveLength(2);
      expect(cellValues[0]).toHaveTextContent("test-value");
    });

    it("should render custom Cell component when provided", () => {
      const CustomCell = ({ data }) => <div data-testid="custom-cell">{data.id}</div>;
      const columnsWithCustomCell = [
        {
          id: "custom",
          Header: "Custom",
          Cell: CustomCell,
          alias: "custom",
          original: { currentType: "String" },
        },
      ];

      renderWithContext({}, { columns: columnsWithCustomCell });

      expect(screen.getByTestId("custom-cell")).toBeInTheDocument();
      expect(screen.getByTestId("custom-cell")).toHaveTextContent("1");
    });

    it("should show skeleton loader when cell is loading", () => {
      const { isFF } = require("../../../../utils/feature-flags");
      isFF.mockReturnValue(true);

      const loadingData = { ...mockData, loading: "col1" };
      renderWithContext({ data: loadingData });

      expect(screen.getByTestId("skeleton-loader")).toBeInTheDocument();
    });
  });

  describe("Decoration", () => {
    it("should apply decoration styles to cells", () => {
      const mockDecoration = {
        get: jest.fn(() => ({ style: { color: "red" } })),
      };

      renderWithContext({ decoration: mockDecoration });

      expect(mockDecoration.get).toHaveBeenCalled();
    });
  });

  describe("Wrapper Styles", () => {
    it("should apply wrapperStyle to row wrapper", () => {
      const wrapperStyle = { backgroundColor: "blue" };
      renderWithContext({ wrapperStyle });

      const rowWrapper = screen.getByTestId("table-row-wrapper");
      expect(rowWrapper).toHaveStyle(wrapperStyle);
    });

    it("should apply style to table row", () => {
      const style = { padding: "10px" };
      renderWithContext({ style });

      const tableRow = screen.getByTestId("table-row");
      expect(tableRow).toHaveStyle(style);
    });
  });
});
