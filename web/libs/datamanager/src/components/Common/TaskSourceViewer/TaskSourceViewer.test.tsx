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
  JsonViewer: ({ data, toolbarExtra }: any) => (
    <div data-testid="json-viewer">
      {toolbarExtra && <div data-testid="json-viewer-toolbar-extra">{toolbarExtra}</div>}
      <div data-testid="json-viewer-content">{JSON.stringify(data)}</div>
    </div>
  ),
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
    <label data-testid="resolve-uri-toggle-container">
      <input
        type="checkbox"
        data-testid="resolve-uri-toggle"
        checked={checked}
        onChange={onChange}
        aria-label={label}
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
  viewToggleContainer: "viewToggleContainer",
  viewContent: "viewContent",
  loadingContainer: "loadingContainer",
  resolveUriToggle: "resolveUriToggle",
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

  describe("Resolve URIs Toggle", () => {
    it("should NOT show resolve URI toggle in code view", async () => {
      render(<TaskSourceViewer {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByTestId("code-view")).toBeInTheDocument();
      });

      // Toggle should not be visible in code view
      expect(screen.queryByTestId("resolve-uri-toggle")).not.toBeInTheDocument();
    });

    it("should show resolve URI toggle in JsonViewer toolbar for interactive view", async () => {
      localStorage.setItem("test:tasksource:view", "interactive");

      render(<TaskSourceViewer {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByTestId("json-viewer")).toBeInTheDocument();
        expect(screen.getByTestId("json-viewer-toolbar-extra")).toBeInTheDocument();
        expect(screen.getByTestId("resolve-uri-toggle")).toBeInTheDocument();
      });
    });

    it("should reload task data when resolve URIs toggle changes", async () => {
      localStorage.setItem("test:tasksource:view", "interactive");
      const user = userEvent.setup();
      const mockOnTaskLoad = jest.fn().mockResolvedValue(mockTaskData);

      render(<TaskSourceViewer {...defaultProps} onTaskLoad={mockOnTaskLoad} />);

      // Wait for initial load
      await waitFor(() => {
        expect(mockOnTaskLoad).toHaveBeenCalledWith({ resolveUri: false });
      });

      // Click the toggle to enable URI resolution
      await user.click(screen.getByTestId("resolve-uri-toggle"));

      // Should reload with resolveUri: true
      await waitFor(() => {
        expect(mockOnTaskLoad).toHaveBeenCalledWith({ resolveUri: true });
      });
    });

    it("should save resolve URIs preference to localStorage", async () => {
      localStorage.setItem("test:tasksource:view", "interactive");
      const user = userEvent.setup();

      render(<TaskSourceViewer {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByTestId("resolve-uri-toggle")).toBeInTheDocument();
      });

      await user.click(screen.getByTestId("resolve-uri-toggle"));

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

    it("should call renderToggle with ViewToggle component", async () => {
      const mockRenderToggle = jest.fn();

      render(<TaskSourceViewer {...defaultProps} renderToggle={mockRenderToggle} />);

      await waitFor(() => {
        expect(mockRenderToggle).toHaveBeenCalled();
      });

      // Should have been called with a ViewToggle element
      const toggleArg = mockRenderToggle.mock.calls[0][0];
      expect(toggleArg).toBeTruthy();
    });

    it("should update renderToggle when view changes via callback", async () => {
      const mockRenderToggle = jest.fn();
      let capturedOnViewChange: ((view: string) => void) | null = null;

      // Capture the onViewChange callback from the toggle
      mockRenderToggle.mockImplementation((toggle: any) => {
        if (toggle?.props?.onViewChange) {
          capturedOnViewChange = toggle.props.onViewChange;
        }
      });

      render(<TaskSourceViewer {...defaultProps} renderToggle={mockRenderToggle} />);

      await waitFor(() => {
        expect(capturedOnViewChange).toBeTruthy();
      });

      // Simulate view change via callback
      capturedOnViewChange!("interactive");

      await waitFor(() => {
        expect(localStorage.getItem("test:tasksource:view")).toBe("interactive");
        expect(screen.getByTestId("json-viewer")).toBeInTheDocument();
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

  describe("Loading State", () => {
    it("should show initial content while loading then update", async () => {
      // Create a promise that doesn't resolve immediately
      let resolvePromise: (value: any) => void;
      const mockOnTaskLoad = jest.fn().mockImplementation(
        () =>
          new Promise((resolve) => {
            resolvePromise = resolve;
          }),
      );

      render(<TaskSourceViewer {...defaultProps} onTaskLoad={mockOnTaskLoad} />);

      // Should show initial content from props
      expect(screen.getByTestId("code-view")).toBeInTheDocument();

      // Resolve the promise with new data
      resolvePromise!(mockTaskData);

      // Wait for content to be updated
      await waitFor(() => {
        expect(screen.getByTestId("code-view")).toHaveTextContent("s3://bucket/image.jpg");
      });
    });
  });
});
