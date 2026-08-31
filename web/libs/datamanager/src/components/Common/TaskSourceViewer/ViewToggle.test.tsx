import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ViewToggle } from "./ViewToggle";
import * as uiModule from "@humansignal/ui";

describe("ViewToggle Component", () => {
  const defaultProps = {
    view: "code" as const,
    onViewChange: mock(),
  };

  beforeEach(() => {
    mock.clearAllMocks();
    spyOn(uiModule, "Tabs").mockImplementation(({ children, value, onValueChange }: any) => (
      <div
        data-testid="tabs"
        data-value={value}
        onClick={(e: any) => {
          const target = e.target as HTMLElement;
          if (target.dataset.value) {
            onValueChange(target.dataset.value);
          }
        }}
      >
        {children}
      </div>
    ));
    spyOn(uiModule, "TabsList").mockImplementation(({ children, className }: any) => (
      <div data-testid="tabs-list" className={className}>
        {children}
      </div>
    ));
    spyOn(uiModule, "TabsTrigger").mockImplementation(({ children, value }: any) => (
      <button type="button" data-testid={`tab-${value}`} data-value={value}>
        {children}
      </button>
    ));
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
      const mockOnViewChange = mock();

      render(<ViewToggle {...defaultProps} onViewChange={mockOnViewChange} />);

      await user.click(screen.getByTestId("tab-interactive"));

      expect(mockOnViewChange).toHaveBeenCalledWith("interactive");
    });

    it("should reflect current view value in tabs", () => {
      render(<ViewToggle {...defaultProps} view="interactive" />);

      expect(screen.getByTestId("tabs")).toHaveAttribute("data-value", "interactive");
    });

    it("should switch from interactive to code view", async () => {
      const user = userEvent.setup();
      const mockOnViewChange = mock();

      render(<ViewToggle view="interactive" onViewChange={mockOnViewChange} />);

      await user.click(screen.getByTestId("tab-code"));

      expect(mockOnViewChange).toHaveBeenCalledWith("code");
    });
  });
});
