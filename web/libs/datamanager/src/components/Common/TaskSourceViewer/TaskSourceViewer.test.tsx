import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom";
import { TaskSourceViewer } from "./TaskSourceViewer";

// Mock feature flags
jest.mock("../../../utils/feature-flags", () => ({
  FF_LOPS_E_3: "ff_lops_e_3",
  FF_INTERACTIVE_JSON_VIEWER: "ff_interactive_json_viewer",
  isFF: (flag: string) => flag === "ff_interactive_json_viewer",
}));

// Mock UI components
jest.mock("@humansignal/ui", () => ({
  JsonViewer: ({ data }: any) => <div data-testid="json-viewer">{JSON.stringify(data)}</div>,
  Tabs: ({ children, value, onValueChange }: any) => (
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
  ),
  TabsList: ({ children }: any) => <div data-testid="tabs-list">{children}</div>,
  TabsTrigger: ({ children, value }: any) => (
    <button type="button" data-testid={`tab-${value}`} data-value={value}>
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
        aria-label="Resolve URLs"
      />
      <span>{label}</span>
    </label>
  ),
}));

// Mock CodeView component
jest.mock("./CodeView", () => ({
  CodeView: ({ data }: any) => <pre data-testid="code-view">{JSON.stringify(data, null, 2)}</pre>,
}));

// Mock styles
jest.mock("./TaskSourceViewer.module.scss", () => ({
  taskSourceView: "taskSourceView",
  viewContent: "viewContent",
}));

describe("TaskSourceViewer Component", () => {
  const mockTaskData = {
    id: 123,
    data: {
      image: "s3://bucket/image.jpg",
      text: "Sample text",
    },
    annotations: [],
    predictions: [],
  };

  const defaultProps = {
    content: { id: 123, data: {} },
    onTaskLoad: jest.fn().mockResolvedValue(mockTaskData),
    storageKey: "test:tasksource",
  };

  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
  });

  describe("Initial Load", () => {
    it("should load task data on mount with default resolveUri=false", async () => {
      const mockOnTaskLoad = jest.fn().mockResolvedValue(mockTaskData);

      render(<TaskSourceViewer {...defaultProps} onTaskLoad={mockOnTaskLoad} />);

      await waitFor(() => {
        expect(mockOnTaskLoad).toHaveBeenCalledTimes(1);
        expect(mockOnTaskLoad).toHaveBeenCalledWith({ resolveUri: false });
      });
    });

    it("should display task data after loading", async () => {
      render(<TaskSourceViewer {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByTestId("code-view")).toHaveTextContent("s3://bucket/image.jpg");
      });
    });

    it("should respect stored resolveUrls preference from localStorage", async () => {
      localStorage.setItem("test:tasksource:resolveUrls", "true");
      const mockOnTaskLoad = jest.fn().mockResolvedValue(mockTaskData);

      render(<TaskSourceViewer {...defaultProps} onTaskLoad={mockOnTaskLoad} />);

      await waitFor(() => {
        expect(mockOnTaskLoad).toHaveBeenCalledWith({ resolveUri: true });
      });
    });
  });

  describe("Resolve URLs Toggle", () => {
    it("should reload task data when resolve URLs toggle changes", async () => {
      const user = userEvent.setup();
      const mockOnTaskLoad = jest.fn().mockResolvedValue(mockTaskData);
      const mockRenderToggle = jest.fn();

      render(<TaskSourceViewer {...defaultProps} onTaskLoad={mockOnTaskLoad} renderToggle={mockRenderToggle} />);

      // Wait for initial load
      await waitFor(() => {
        expect(mockOnTaskLoad).toHaveBeenCalledWith({ resolveUri: false });
      });

      // The ViewToggle should be rendered via renderToggle callback
      await waitFor(() => {
        expect(mockRenderToggle).toHaveBeenCalled();
      });

      // Get the toggle from the last call to renderToggle
      const lastCall = mockRenderToggle.mock.calls[mockRenderToggle.mock.calls.length - 1];
      const toggleComponent = lastCall[0];

      // Render the toggle to interact with it
      const { getByTestId } = render(toggleComponent);
      const toggle = getByTestId("resolve-urls-toggle");

      // Click the toggle to enable URL resolution
      await user.click(toggle);

      // Should reload with resolveUri: true
      await waitFor(() => {
        expect(mockOnTaskLoad).toHaveBeenCalledWith({ resolveUri: true });
      });
    });

    it("should save resolve URLs preference to localStorage", async () => {
      const user = userEvent.setup();
      const mockRenderToggle = jest.fn();

      render(<TaskSourceViewer {...defaultProps} renderToggle={mockRenderToggle} />);

      await waitFor(() => {
        expect(mockRenderToggle).toHaveBeenCalled();
      });

      // Get and render the toggle
      const lastCall = mockRenderToggle.mock.calls[mockRenderToggle.mock.calls.length - 1];
      const { getByTestId } = render(lastCall[0]);

      await user.click(getByTestId("resolve-urls-toggle"));

      await waitFor(() => {
        expect(localStorage.getItem("test:tasksource:resolveUrls")).toBe("true");
      });
    });
  });

  describe("View Mode Toggle", () => {
    it("should default to code view", async () => {
      render(<TaskSourceViewer {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByTestId("code-view")).toBeInTheDocument();
      });
    });

    it("should respect stored view preference from localStorage", async () => {
      localStorage.setItem("test:tasksource:view", "interactive");

      render(<TaskSourceViewer {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByTestId("json-viewer")).toBeInTheDocument();
      });
    });

    it("should save view preference to localStorage when changed", async () => {
      const user = userEvent.setup();
      const mockRenderToggle = jest.fn();

      render(<TaskSourceViewer {...defaultProps} renderToggle={mockRenderToggle} />);

      await waitFor(() => {
        expect(mockRenderToggle).toHaveBeenCalled();
      });

      // Get and render the toggle
      const lastCall = mockRenderToggle.mock.calls[mockRenderToggle.mock.calls.length - 1];
      const { getByTestId } = render(lastCall[0]);

      await user.click(getByTestId("tab-interactive"));

      await waitFor(() => {
        expect(localStorage.getItem("test:tasksource:view")).toBe("interactive");
      });
    });
  });

  describe("Data Explorer Mode", () => {
    it("should not include annotations/predictions for Data Explorer", async () => {
      const mockOnTaskLoad = jest.fn().mockResolvedValue({
        ...mockTaskData,
        annotations: [{ id: 1 }],
        predictions: [{ id: 2 }],
      });

      render(<TaskSourceViewer {...defaultProps} onTaskLoad={mockOnTaskLoad} sdkType="DE" />);

      await waitFor(() => {
        const codeView = screen.getByTestId("code-view");
        expect(codeView).not.toHaveTextContent("annotations");
        expect(codeView).not.toHaveTextContent("predictions");
      });
    });
  });

  describe("Error Handling", () => {
    it("should handle API errors gracefully", async () => {
      const mockOnTaskLoad = jest.fn().mockRejectedValue(new Error("API Error"));

      // Should not throw
      expect(() => {
        render(<TaskSourceViewer {...defaultProps} onTaskLoad={mockOnTaskLoad} />);
      }).not.toThrow();
    });
  });

  describe("renderToggle Callback", () => {
    it("should call renderToggle with ViewToggle component when interactive viewer is enabled", async () => {
      const mockRenderToggle = jest.fn();

      render(<TaskSourceViewer {...defaultProps} renderToggle={mockRenderToggle} />);

      await waitFor(() => {
        expect(mockRenderToggle).toHaveBeenCalled();
        // The argument should be a React element (ViewToggle)
        const toggleElement = mockRenderToggle.mock.calls[0][0];
        expect(toggleElement).toBeTruthy();
      });
    });

    it("should not call renderToggle when not provided", async () => {
      // This test verifies no errors occur when renderToggle is undefined
      expect(() => {
        render(<TaskSourceViewer {...defaultProps} />);
      }).not.toThrow();
    });
  });
});
