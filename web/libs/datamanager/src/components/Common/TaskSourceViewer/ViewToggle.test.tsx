import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom";
import { ViewToggle } from "./ViewToggle";

// Mock the UI components
jest.mock("@humansignal/ui", () => ({
  Tabs: ({ children, value, onValueChange }: any) => (
    <div data-testid="tabs" data-value={value} onClick={(e: any) => {
      const target = e.target as HTMLElement;
      if (target.dataset.value) {
        onValueChange(target.dataset.value);
      }
    }}>
      {children}
    </div>
  ),
  TabsList: ({ children, className }: any) => (
    <div data-testid="tabs-list" className={className}>
      {children}
    </div>
  ),
  TabsTrigger: ({ children, value }: any) => (
    <button data-testid={`tab-${value}`} data-value={value}>
      {children}
    </button>
  ),
  Toggle: ({ label, checked, onChange }: any) => (
    <label data-testid="toggle-container">
      <input
        type="checkbox"
        data-testid="resolve-urls-toggle"
        checked={checked}
        onChange={onChange}
      />
      <span>{label}</span>
    </label>
  ),
}));

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

      expect(screen.getByTestId("tab-code")).toBeInTheDocument();
      expect(screen.getByTestId("tab-interactive")).toBeInTheDocument();
      expect(screen.getByTestId("tab-code")).toHaveTextContent("Code");
      expect(screen.getByTestId("tab-interactive")).toHaveTextContent("Interactive");
    });

    it("should call onViewChange when switching view modes", async () => {
      const user = userEvent.setup();
      const mockOnViewChange = jest.fn();

      render(<ViewToggle {...defaultProps} onViewChange={mockOnViewChange} />);

      await user.click(screen.getByTestId("tab-interactive"));

      expect(mockOnViewChange).toHaveBeenCalledWith("interactive");
    });

    it("should reflect current view value in tabs", () => {
      render(<ViewToggle {...defaultProps} view="interactive" />);

      expect(screen.getByTestId("tabs")).toHaveAttribute("data-value", "interactive");
    });
  });

  describe("Resolve URLs Toggle", () => {
    it("should not render resolve URLs toggle when onResolveUrlsChange is not provided", () => {
      render(<ViewToggle {...defaultProps} />);

      expect(screen.queryByTestId("resolve-urls-toggle")).not.toBeInTheDocument();
    });

    it("should render resolve URLs toggle when onResolveUrlsChange is provided", () => {
      render(
        <ViewToggle
          {...defaultProps}
          resolveUrls={false}
          onResolveUrlsChange={jest.fn()}
        />
      );

      expect(screen.getByTestId("resolve-urls-toggle")).toBeInTheDocument();
      expect(screen.getByText("Resolve URLs")).toBeInTheDocument();
    });

    it("should reflect resolveUrls state in toggle", () => {
      render(
        <ViewToggle
          {...defaultProps}
          resolveUrls={true}
          onResolveUrlsChange={jest.fn()}
        />
      );

      expect(screen.getByTestId("resolve-urls-toggle")).toBeChecked();
    });

    it("should call onResolveUrlsChange when toggle is clicked", async () => {
      const user = userEvent.setup();
      const mockOnResolveUrlsChange = jest.fn();

      render(
        <ViewToggle
          {...defaultProps}
          resolveUrls={false}
          onResolveUrlsChange={mockOnResolveUrlsChange}
        />
      );

      await user.click(screen.getByTestId("resolve-urls-toggle"));

      expect(mockOnResolveUrlsChange).toHaveBeenCalledWith(true);
    });

    it("should call onResolveUrlsChange with false when toggle is unchecked", async () => {
      const user = userEvent.setup();
      const mockOnResolveUrlsChange = jest.fn();

      render(
        <ViewToggle
          {...defaultProps}
          resolveUrls={true}
          onResolveUrlsChange={mockOnResolveUrlsChange}
        />
      );

      await user.click(screen.getByTestId("resolve-urls-toggle"));

      expect(mockOnResolveUrlsChange).toHaveBeenCalledWith(false);
    });
  });

  describe("Layout", () => {
    it("should render both toggles when all props are provided", () => {
      render(
        <ViewToggle
          {...defaultProps}
          resolveUrls={false}
          onResolveUrlsChange={jest.fn()}
        />
      );

      // View mode tabs should be present
      expect(screen.getByTestId("tabs")).toBeInTheDocument();
      // Resolve URLs toggle should be present
      expect(screen.getByTestId("resolve-urls-toggle")).toBeInTheDocument();
    });
  });
});
