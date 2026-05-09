/**
 * Unit tests for HtxTextBox (components/HtxTextBox/HtxTextBox.jsx).
 * Covers view/edit modes, getDerivedStateFromProps, global click, keyboard (Enter/Escape/Tab),
 * startEditing, save, cancel, setValue, updateHeight, and button visibility.
 */
import React from "react";
import { render, screen, fireEvent, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { HtxTextBox } from "../HtxTextBox";

jest.mock("@humansignal/icons", () => {
  const React = require("react");
  return {
    IconPencil: () => React.createElement("span", { "data-testid": "icon-pencil" }),
    IconTrashAlt: () => React.createElement("span", { "data-testid": "icon-trash" }),
    IconCheck: () => React.createElement("span", { "data-testid": "icon-check" }),
  };
});

jest.mock("@humansignal/ui", () => {
  const React = require("react");
  return {
    Button: ({ children, onClick, "aria-label": ariaLabel, "data-testid": testId, ...props }) =>
      React.createElement(
        "button",
        { type: "button", onClick, "aria-label": ariaLabel, "data-testid": testId, ...props },
        children,
      ),
    Tooltip: ({ children, title }) => React.createElement("span", { "data-tooltip": title }, children),
    Typography: React.forwardRef(({ children, ...props }, ref) =>
      React.createElement("span", { ref, "data-testid": "typography", ...props }, children),
    ),
  };
});

const defaultProps = {
  text: "hello",
  onChange: jest.fn(),
  isEditable: true,
  isDeleteable: true,
  onDelete: jest.fn(),
};

describe("HtxTextBox", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe("view mode", () => {
    it("renders view with data-testid htx-textbox-view when not editing and isEditable", () => {
      render(<HtxTextBox {...defaultProps} />);
      expect(screen.getByTestId("htx-textbox-view")).toBeInTheDocument();
      expect(screen.getByTestId("htx-textbox-content")).toHaveTextContent("hello");
    });

    it("renders text with newlines as separate lines", () => {
      render(<HtxTextBox {...defaultProps} text="line1\nline2\nline3" />);
      const content = screen.getByTestId("htx-textbox-content");
      expect(content).toHaveTextContent("line1");
      expect(content).toHaveTextContent("line2");
      expect(content).toHaveTextContent("line3");
    });

    it("shows edit button when isEditable and onChange", () => {
      render(<HtxTextBox {...defaultProps} />);
      expect(screen.getByTestId("htx-textbox-edit-button")).toBeInTheDocument();
    });

    it("shows delete button when isDeleteable and onDelete", () => {
      render(<HtxTextBox {...defaultProps} />);
      expect(screen.getByTestId("htx-textbox-delete-button")).toBeInTheDocument();
    });

    it("hides edit button when isEditable is false", () => {
      render(<HtxTextBox {...defaultProps} isEditable={false} />);
      expect(screen.queryByTestId("htx-textbox-edit-button")).not.toBeInTheDocument();
    });

    it("hides edit button when onChange is missing", () => {
      const { onChange, ...rest } = defaultProps;
      render(<HtxTextBox {...rest} isEditable={true} />);
      expect(screen.queryByTestId("htx-textbox-edit-button")).not.toBeInTheDocument();
    });

    it("hides delete button when isDeleteable is false", () => {
      render(<HtxTextBox {...defaultProps} isDeleteable={false} />);
      expect(screen.queryByTestId("htx-textbox-delete-button")).not.toBeInTheDocument();
    });

    it("hides delete button when onDelete is missing", () => {
      const { onDelete, ...rest } = defaultProps;
      render(<HtxTextBox {...rest} isDeleteable={true} />);
      expect(screen.queryByTestId("htx-textbox-delete-button")).not.toBeInTheDocument();
    });

    it("calls onDelete when delete button is clicked", async () => {
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
      render(<HtxTextBox {...defaultProps} />);
      await user.click(screen.getByTestId("htx-textbox-delete-button"));
      expect(defaultProps.onDelete).toHaveBeenCalled();
    });

    it("passes id and name to view content div", () => {
      render(<HtxTextBox {...defaultProps} id="my-id" name="my-name" />);
      const content = screen.getByTestId("htx-textbox-content");
      expect(content).toHaveAttribute("id", "my-id");
      expect(content).toHaveAttribute("name", "my-name");
    });
  });

  describe("edit mode", () => {
    it("renders edit when onlyEdit and isEditable", () => {
      render(<HtxTextBox {...defaultProps} onlyEdit={true} />);
      expect(screen.getByTestId("htx-textbox-edit")).toBeInTheDocument();
      expect(screen.getByTestId("htx-textbox-input")).toBeInTheDocument();
    });

    it("renders input when rows is 1", () => {
      render(<HtxTextBox {...defaultProps} onlyEdit={true} rows={1} />);
      const input = screen.getByTestId("htx-textbox-input");
      expect(input.tagName).toBe("INPUT");
    });

    it("renders textarea when rows > 1", () => {
      render(<HtxTextBox {...defaultProps} onlyEdit={true} rows={3} />);
      const input = screen.getByTestId("htx-textbox-input");
      expect(input.tagName).toBe("TEXTAREA");
    });

    it("shows save button when not onlyEdit", () => {
      render(<HtxTextBox {...defaultProps} onlyEdit={false} />);
      fireEvent.click(screen.getByTestId("htx-textbox-edit-button"));
      expect(screen.getByTestId("htx-textbox-save")).toBeInTheDocument();
    });

    it("hides save button when onlyEdit", () => {
      render(<HtxTextBox {...defaultProps} onlyEdit={true} />);
      expect(screen.queryByTestId("htx-textbox-save")).not.toBeInTheDocument();
    });

    it("calls onStartEditing when entering edit mode", async () => {
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
      const onStartEditing = jest.fn();
      render(<HtxTextBox {...defaultProps} onStartEditing={onStartEditing} />);
      await user.click(screen.getByTestId("htx-textbox-edit-button"));
      expect(onStartEditing).toHaveBeenCalled();
    });

    it("save calls onChange with current value and exits edit mode", async () => {
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
      render(<HtxTextBox {...defaultProps} />);
      await user.click(screen.getByTestId("htx-textbox-edit-button"));
      const input = screen.getByTestId("htx-textbox-input");
      await user.clear(input);
      await user.type(input, "new value");
      await user.click(screen.getByTestId("htx-textbox-save"));
      expect(defaultProps.onChange).toHaveBeenCalledWith("new value");
      expect(screen.getByTestId("htx-textbox-view")).toBeInTheDocument();
    });

    it("onBlur calls onChange with current value", async () => {
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
      render(<HtxTextBox {...defaultProps} />);
      await user.click(screen.getByTestId("htx-textbox-edit-button"));
      const input = screen.getByTestId("htx-textbox-input");
      await user.clear(input);
      await user.type(input, "blur value");
      fireEvent.blur(input);
      expect(defaultProps.onChange).toHaveBeenCalledWith("blur value");
    });

    it("Escape cancels and restores original text", async () => {
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
      render(<HtxTextBox {...defaultProps} text="original" />);
      await user.click(screen.getByTestId("htx-textbox-edit-button"));
      const input = screen.getByTestId("htx-textbox-input");
      await user.clear(input);
      await user.type(input, "changed");
      fireEvent.keyDown(input, { key: "Escape" });
      expect(screen.getByTestId("htx-textbox-view")).toBeInTheDocument();
      await user.click(screen.getByTestId("htx-textbox-edit-button"));
      expect(screen.getByTestId("htx-textbox-input")).toHaveValue("original");
    });

    it("Enter saves when rows is 1", async () => {
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
      render(<HtxTextBox {...defaultProps} rows={1} />);
      await user.click(screen.getByTestId("htx-textbox-edit-button"));
      const input = screen.getByTestId("htx-textbox-input");
      await user.type(input, "x");
      fireEvent.keyDown(input, { key: "Enter" });
      expect(defaultProps.onChange).toHaveBeenCalledWith("hellox");
      expect(screen.getByTestId("htx-textbox-view")).toBeInTheDocument();
    });

    it("Shift+Enter saves when rows > 1", async () => {
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
      render(<HtxTextBox {...defaultProps} onlyEdit={true} rows={3} />);
      const input = screen.getByTestId("htx-textbox-input");
      await user.type(input, "a");
      fireEvent.keyDown(input, { key: "Enter", shiftKey: true });
      expect(defaultProps.onChange).toHaveBeenCalledWith("helloa");
    });

    it("Tab exits edit mode", async () => {
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
      render(<HtxTextBox {...defaultProps} />);
      await user.click(screen.getByTestId("htx-textbox-edit-button"));
      const input = screen.getByTestId("htx-textbox-input");
      fireEvent.keyDown(input, { key: "Tab" });
      expect(screen.getByTestId("htx-textbox-view")).toBeInTheDocument();
    });

    it("global click outside closes edit mode", async () => {
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
      render(
        <div>
          <HtxTextBox {...defaultProps} />
          <button type="button" data-testid="outside">
            Outside
          </button>
        </div>,
      );
      await user.click(screen.getByTestId("htx-textbox-edit-button"));
      expect(screen.getByTestId("htx-textbox-edit")).toBeInTheDocument();
      await user.click(screen.getByTestId("outside"));
      expect(screen.getByTestId("htx-textbox-view")).toBeInTheDocument();
    });

    it("global click on shortcut with ignoreShortcuts does not close edit", async () => {
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
      render(
        <div>
          <HtxTextBox {...defaultProps} ignoreShortcuts={true} />
          <span data-shortcut data-testid="shortcut">
            Shortcut
          </span>
        </div>,
      );
      await user.click(screen.getByTestId("htx-textbox-edit-button"));
      fireEvent.click(screen.getByTestId("shortcut"), { bubbles: true });
      expect(screen.getByTestId("htx-textbox-edit")).toBeInTheDocument();
    });

    it("global click on input does not close edit", async () => {
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
      render(<HtxTextBox {...defaultProps} />);
      await user.click(screen.getByTestId("htx-textbox-edit-button"));
      const input = screen.getByTestId("htx-textbox-input");
      fireEvent.click(input, { bubbles: true });
      expect(screen.getByTestId("htx-textbox-edit")).toBeInTheDocument();
    });

    it("getDerivedStateFromProps updates value when text prop changes", () => {
      const { rerender } = render(<HtxTextBox {...defaultProps} text="first" />);
      expect(screen.getByTestId("htx-textbox-content")).toHaveTextContent("first");
      rerender(<HtxTextBox {...defaultProps} text="second" />);
      expect(screen.getByTestId("htx-textbox-content")).toHaveTextContent("second");
    });

    it("focus sets selection to end of value", async () => {
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
      render(<HtxTextBox {...defaultProps} text="hello" />);
      await user.click(screen.getByTestId("htx-textbox-edit-button"));
      act(() => {
        jest.runAllTimers();
      });
      const input = screen.getByTestId("htx-textbox-input");
      expect(input.selectionStart).toBe(5);
    });

    it("input name is passed to edit input", () => {
      render(<HtxTextBox {...defaultProps} onlyEdit={true} name="field-name" />);
      expect(screen.getByTestId("htx-textbox-input")).toHaveAttribute("name", "field-name");
    });
  });

  describe("lifecycle", () => {
    it("adds and removes global click listener", () => {
      const addSpy = jest.spyOn(window, "addEventListener");
      const removeSpy = jest.spyOn(window, "removeEventListener");
      const { unmount } = render(<HtxTextBox {...defaultProps} />);
      expect(addSpy).toHaveBeenCalledWith("click", expect.any(Function), { capture: true });
      unmount();
      expect(removeSpy).toHaveBeenCalledWith("click", expect.any(Function), { capture: true });
      addSpy.mockRestore();
      removeSpy.mockRestore();
    });
  });
});
