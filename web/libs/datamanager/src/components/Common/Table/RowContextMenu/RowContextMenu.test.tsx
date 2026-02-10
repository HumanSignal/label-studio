import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom";
import { RowContextMenu } from "./RowContextMenu";

// Mock mobx-state-tree
jest.mock("mobx-state-tree", () => ({
  getRoot: jest.fn(),
}));

// Mock Menu component from editor
jest.mock("@humansignal/editor", () => ({
  Menu: ({ children, className, closeDropdownOnItemClick, onClick }: any) => (
    <div
      data-testid="menu"
      className={className}
      data-close-on-click={closeDropdownOnItemClick}
      onClick={onClick}
    >
      {children}
    </div>
  ),
}));

// Add Menu.Item, Menu.Divider to the mock
const MenuMock = require("@humansignal/editor").Menu;
MenuMock.Item = ({ children, onClick, "data-testid": testId }: any) => (
  <button type="button" onClick={onClick} data-testid={testId}>
    {children}
  </button>
);
MenuMock.Divider = () => <hr data-testid="menu-divider" />;

// Mock UI components
const mockShowToast = jest.fn();
jest.mock("@humansignal/ui", () => ({
  modal: jest.fn(),
  useToast: () => ({
    show: mockShowToast,
  }),
}));

// Mock TaskSourceViewer
jest.mock("../../TaskSourceViewer", () => ({
  TaskSourceViewer: ({ content, onTaskLoad }: any) => (
    <div data-testid="task-source-viewer">
      <div data-testid="task-content">{JSON.stringify(content)}</div>
      <button
        type="button"
        onClick={() => onTaskLoad({ resolveUri: false })}
        data-testid="load-task-button"
      >
        Load Task
      </button>
    </div>
  ),
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
}));

// Mock styles
jest.mock("./RowContextMenu.module.scss", () => ({
  menu: "menu",
}));

describe("RowContextMenu Component", () => {
  const mockRow = {
    id: 123,
    task_id: 123,
    source: JSON.stringify({ data: { text: "Sample task" } }),
    annotators: [1, 2],
  };

  const mockColumn = {
    id: "data.text",
  };

  const mockView = {
    api: {
      task: jest.fn().mockResolvedValue({
        id: 123,
        data: { text: "Sample task" },
      }),
    },
    SDK: {
      type: "LS",
    },
  };

  const mockOnClose = jest.fn();
  const mockOnReviewTask = jest.fn();
  const mockOnViewAnalytics = jest.fn();

  const defaultProps = {
    row: mockRow,
    column: mockColumn,
    view: mockView,
    onClose: mockOnClose,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    // Setup clipboard mock
    Object.assign(navigator, {
      clipboard: {
        writeText: jest.fn().mockResolvedValue(undefined),
      },
    });
  });

  describe("Rendering", () => {
    it("should render all basic menu items", () => {
      render(<RowContextMenu {...defaultProps} />);

      expect(screen.getByTestId("menu-item-label-task")).toBeInTheDocument();
      expect(screen.getByTestId("menu-item-compare-annotations")).toBeInTheDocument();
      expect(screen.getByTestId("menu-item-copy-cell")).toBeInTheDocument();
      expect(screen.getByTestId("menu-item-copy-task-id")).toBeInTheDocument();
      expect(screen.getByTestId("menu-item-view-source")).toBeInTheDocument();
    });

    it("should render review task item when onReviewTask is provided", () => {
      render(<RowContextMenu {...defaultProps} onReviewTask={mockOnReviewTask} />);

      expect(screen.getByTestId("menu-item-review-task")).toBeInTheDocument();
    });

    it("should not render review task item when onReviewTask is not provided", () => {
      render(<RowContextMenu {...defaultProps} />);

      expect(screen.queryByTestId("menu-item-review-task")).not.toBeInTheDocument();
    });

    it("should render view analytics item when onViewAnalytics is provided and annotators exist", () => {
      render(<RowContextMenu {...defaultProps} onViewAnalytics={mockOnViewAnalytics} />);

      expect(screen.getByTestId("menu-item-view-analytics")).toBeInTheDocument();
    });

    it("should not render view analytics item when annotators are missing", () => {
      const rowWithoutAnnotators = { ...mockRow, annotators: [] };

      render(
        <RowContextMenu
          {...defaultProps}
          row={rowWithoutAnnotators}
          onViewAnalytics={mockOnViewAnalytics}
        />,
      );

      expect(screen.queryByTestId("menu-item-view-analytics")).not.toBeInTheDocument();
    });

    it("should not render copy cell content when column is not provided", () => {
      render(<RowContextMenu {...defaultProps} column={undefined} />);

      expect(screen.queryByTestId("menu-item-copy-cell")).not.toBeInTheDocument();
    });

    it("should not render copy cell content when cell value is not a string", () => {
      const { getProperty } = require("../utils");
      getProperty.mockReturnValue(123); // Return a number

      render(<RowContextMenu {...defaultProps} />);

      expect(screen.queryByTestId("menu-item-copy-cell")).not.toBeInTheDocument();
    });

    it("should render menu dividers", () => {
      render(<RowContextMenu {...defaultProps} />);

      const dividers = screen.getAllByTestId("menu-divider");
      expect(dividers.length).toBeGreaterThan(0);
    });
  });

  describe("Label Task Action", () => {
    it("should call startLabelStream when label task is clicked", async () => {
      const mockStartLabelStream = jest.fn();
      const { getRoot } = require("mobx-state-tree");
      getRoot.mockReturnValue({ startLabelStream: mockStartLabelStream });

      const user = userEvent.setup();
      render(<RowContextMenu {...defaultProps} />);

      await user.click(screen.getByTestId("menu-item-label-task"));

      expect(mockStartLabelStream).toHaveBeenCalledTimes(1);
      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });
  });

  describe("Review Task Action", () => {
    it("should call onReviewTask callback when review task is clicked", async () => {
      const user = userEvent.setup();
      render(<RowContextMenu {...defaultProps} onReviewTask={mockOnReviewTask} />);

      await user.click(screen.getByTestId("menu-item-review-task"));

      expect(mockOnReviewTask).toHaveBeenCalledWith(mockRow);
      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });
  });

  describe("Compare Annotations Action", () => {
    it("should call startLabeling with correct parameters when compare annotations is clicked", async () => {
      const mockStartLabeling = jest.fn();
      const { getRoot } = require("mobx-state-tree");
      getRoot.mockReturnValue({ startLabeling: mockStartLabeling });

      const user = userEvent.setup();
      render(<RowContextMenu {...defaultProps} />);

      await user.click(screen.getByTestId("menu-item-compare-annotations"));

      expect(mockStartLabeling).toHaveBeenCalledWith(mockRow, {
        interface: "annotations:view-all",
      });
      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });
  });

  describe("Copy Cell Content Action", () => {
    it("should copy cell content to clipboard successfully", async () => {
      const { getProperty } = require("../utils");
      getProperty.mockReturnValue("Sample text");

      const user = userEvent.setup();
      render(<RowContextMenu {...defaultProps} />);

      await user.click(screen.getByTestId("menu-item-copy-cell"));

      await waitFor(() => {
        expect(navigator.clipboard.writeText).toHaveBeenCalledWith("Sample text");
        expect(mockShowToast).toHaveBeenCalledWith({
          message: "Cell content copied to clipboard",
          type: "info",
          duration: 2000,
        });
        expect(mockOnClose).toHaveBeenCalledTimes(1);
      });
    });

    it("should not render copy cell button when cell value is not a string", () => {
      const { getProperty } = require("../utils");
      getProperty.mockReturnValue(123);

      render(<RowContextMenu {...defaultProps} />);

      // Since the button won't render for non-string values, we test the logic directly
      // by checking that the button doesn't exist
      expect(screen.queryByTestId("menu-item-copy-cell")).not.toBeInTheDocument();
    });

    it("should show error toast when clipboard write fails", async () => {
      const { getProperty } = require("../utils");
      getProperty.mockReturnValue("Sample text");
      (navigator.clipboard.writeText as jest.Mock).mockRejectedValue(new Error("Clipboard error"));

      const user = userEvent.setup();
      render(<RowContextMenu {...defaultProps} />);

      await user.click(screen.getByTestId("menu-item-copy-cell"));

      await waitFor(() => {
        expect(mockShowToast).toHaveBeenCalledWith({
          message: "Failed to copy to clipboard",
          type: "error",
          duration: 3000,
        });
        expect(mockOnClose).toHaveBeenCalledTimes(1);
      });
    });
  });

  describe("Copy Task ID Action", () => {
    it("should copy task ID to clipboard successfully", async () => {
      const user = userEvent.setup();
      render(<RowContextMenu {...defaultProps} />);

      await user.click(screen.getByTestId("menu-item-copy-task-id"));

      await waitFor(() => {
        expect(navigator.clipboard.writeText).toHaveBeenCalledWith("123");
        expect(mockShowToast).toHaveBeenCalledWith({
          message: "Task ID copied to clipboard",
          type: "info",
          duration: 2000,
        });
        expect(mockOnClose).toHaveBeenCalledTimes(1);
      });
    });

    it("should use task_id if id is not available", async () => {
      const rowWithoutId = { ...mockRow, id: undefined };
      const user = userEvent.setup();
      render(<RowContextMenu {...defaultProps} row={rowWithoutId} />);

      await user.click(screen.getByTestId("menu-item-copy-task-id"));

      await waitFor(() => {
        expect(navigator.clipboard.writeText).toHaveBeenCalledWith("123");
      });
    });

    it("should show error toast when task ID is not found", async () => {
      const rowWithoutTaskId = { ...mockRow, id: undefined, task_id: undefined };
      const user = userEvent.setup();
      render(<RowContextMenu {...defaultProps} row={rowWithoutTaskId} />);

      await user.click(screen.getByTestId("menu-item-copy-task-id"));

      await waitFor(() => {
        expect(mockShowToast).toHaveBeenCalledWith({
          message: "Task ID not found",
          type: "error",
          duration: 3000,
        });
        expect(mockOnClose).toHaveBeenCalledTimes(1);
      });
    });

    it("should show error toast when clipboard write fails", async () => {
      (navigator.clipboard.writeText as jest.Mock).mockRejectedValue(new Error("Clipboard error"));

      const user = userEvent.setup();
      render(<RowContextMenu {...defaultProps} />);

      await user.click(screen.getByTestId("menu-item-copy-task-id"));

      await waitFor(() => {
        expect(mockShowToast).toHaveBeenCalledWith({
          message: "Failed to copy to clipboard",
          type: "error",
          duration: 3000,
        });
        expect(mockOnClose).toHaveBeenCalledTimes(1);
      });
    });
  });

  describe("View Task Source Action", () => {
    it("should open modal with TaskSourceViewer when view source is clicked", async () => {
      const { modal } = require("@humansignal/ui");

      const user = userEvent.setup();
      render(<RowContextMenu {...defaultProps} />);

      await user.click(screen.getByTestId("menu-item-view-source"));

      expect(modal).toHaveBeenCalledWith(
        expect.objectContaining({
          title: "Source for task 123",
          style: { width: 900 },
          body: expect.anything(),
        }),
      );
      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    it("should parse source JSON if available", async () => {
      const { modal } = require("@humansignal/ui");

      const user = userEvent.setup();
      render(<RowContextMenu {...defaultProps} />);

      await user.click(screen.getByTestId("menu-item-view-source"));

      const modalCall = modal.mock.calls[0][0];
      expect(modalCall.body).toBeTruthy();
    });

    it("should use row directly if source is not available", async () => {
      const { modal } = require("@humansignal/ui");
      const rowWithoutSource = { ...mockRow, source: undefined };

      const user = userEvent.setup();
      render(<RowContextMenu {...defaultProps} row={rowWithoutSource} />);

      await user.click(screen.getByTestId("menu-item-view-source"));

      expect(modal).toHaveBeenCalled();
    });

    it("should call API task method when onTaskLoad is invoked", async () => {
      const { modal } = require("@humansignal/ui");

      const user = userEvent.setup();
      render(<RowContextMenu {...defaultProps} />);

      await user.click(screen.getByTestId("menu-item-view-source"));

      // Get the onTaskLoad callback from the modal
      const modalCall = modal.mock.calls[0][0];
      const taskSourceViewerProps = modalCall.body.props;

      // Call onTaskLoad
      await taskSourceViewerProps.onTaskLoad({ resolveUri: true });

      expect(mockView.api.task).toHaveBeenCalledWith({
        taskID: 123,
        resolve_uri: true,
      });
    });
  });

  describe("View Analytics Action", () => {
    it("should call onViewAnalytics callback when view analytics is clicked", async () => {
      const user = userEvent.setup();
      render(<RowContextMenu {...defaultProps} onViewAnalytics={mockOnViewAnalytics} />);

      await user.click(screen.getByTestId("menu-item-view-analytics"));

      expect(mockOnViewAnalytics).toHaveBeenCalledWith(mockRow);
      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });
  });

  describe("Menu Configuration", () => {
    it("should pass correct className to Menu", () => {
      render(<RowContextMenu {...defaultProps} />);

      const menu = screen.getByTestId("menu");
      expect(menu).toHaveClass("menu");
    });

    it("should set closeDropdownOnItemClick to true", () => {
      render(<RowContextMenu {...defaultProps} />);

      const menu = screen.getByTestId("menu");
      expect(menu).toHaveAttribute("data-close-on-click", "true");
    });
  });

  describe("Edge Cases", () => {
    it("should handle missing toast context gracefully", async () => {
      const { useToast } = require("@humansignal/ui");
      useToast.mockReturnValue(null);

      const user = userEvent.setup();
      render(<RowContextMenu {...defaultProps} />);

      await user.click(screen.getByTestId("menu-item-copy-task-id"));

      // Should still work without crashing
      await waitFor(() => {
        expect(navigator.clipboard.writeText).toHaveBeenCalledWith("123");
        expect(mockOnClose).toHaveBeenCalledTimes(1);
      });
    });

    it("should handle row without annotators array", () => {
      const rowWithoutAnnotators = { ...mockRow, annotators: undefined };

      render(
        <RowContextMenu
          {...defaultProps}
          row={rowWithoutAnnotators}
          onViewAnalytics={mockOnViewAnalytics}
        />,
      );

      expect(screen.queryByTestId("menu-item-view-analytics")).not.toBeInTheDocument();
    });

    it("should handle empty annotators array", () => {
      const rowWithEmptyAnnotators = { ...mockRow, annotators: [] };

      render(
        <RowContextMenu
          {...defaultProps}
          row={rowWithEmptyAnnotators}
          onViewAnalytics={mockOnViewAnalytics}
        />,
      );

      expect(screen.queryByTestId("menu-item-view-analytics")).not.toBeInTheDocument();
    });
  });
});
