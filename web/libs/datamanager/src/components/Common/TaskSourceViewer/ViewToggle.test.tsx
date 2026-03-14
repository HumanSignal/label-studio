import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom";
import { ViewToggle } from "./ViewToggle";

describe("ViewToggle Component", () => {
  const defaultProps = {
    view: "code" as const,
    onViewChange: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("View Mode Toggle", () => {
    it("should render code and interactive view tabs", () => {
      render(<ViewToggle {...defaultProps} />);

      expect(screen.getByRole("tab", { name: "Code" })).toBeInTheDocument();
      expect(screen.getByRole("tab", { name: "Interactive" })).toBeInTheDocument();
      expect(screen.getByRole("tab", { name: "Code" })).toHaveTextContent("Code");
      expect(screen.getByRole("tab", { name: "Interactive" })).toHaveTextContent("Interactive");
    });

    it("should call onViewChange when switching view modes", async () => {
      const user = userEvent.setup();
      const mockOnViewChange = jest.fn();

      render(<ViewToggle {...defaultProps} onViewChange={mockOnViewChange} />);

      await user.click(screen.getByRole("tab", { name: "Interactive" }));

      expect(mockOnViewChange).toHaveBeenCalledWith("interactive");
    });

    it("should reflect current view value in tabs", () => {
      render(<ViewToggle {...defaultProps} view="interactive" />);

      expect(screen.getByRole("tab", { name: "Interactive", selected: true })).toBeInTheDocument();
    });

    it("should switch from interactive to code view", async () => {
      const user = userEvent.setup();
      const mockOnViewChange = jest.fn();

      render(<ViewToggle view="interactive" onViewChange={mockOnViewChange} />);

      await user.click(screen.getByRole("tab", { name: "Code" }));

      expect(mockOnViewChange).toHaveBeenCalledWith("code");
    });
  });
});
