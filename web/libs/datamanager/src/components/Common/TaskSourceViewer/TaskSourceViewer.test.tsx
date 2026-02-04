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

    it("should show view toggle inside component", async () => {
      render(<TaskSourceViewer {...defaultProps} />);

      await waitFor(() => {
        // View toggle tabs should be visible inside the component
        expect(screen.getByTestId("tab-code")).toBeInTheDocument();
        expect(screen.getByTestId("tab-interactive")).toBeInTheDocument();
      });
    });

    it("should save view preference to localStorage when changed", async () => {
      const user = userEvent.setup();

      render(<TaskSourceViewer {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByTestId("tab-interactive")).toBeInTheDocument();
      });

      await user.click(screen.getByTestId("tab-interactive"));

      await waitFor(() => {
        expect(localStorage.getItem("test:tasksource:view")).toBe("interactive");
      });
    });

    it("should switch between code and interactive views", async () => {
      const user = userEvent.setup();

      render(<TaskSourceViewer {...defaultProps} />);

      // Initially in code view
      await waitFor(() => {
        expect(screen.getByTestId("code-view")).toBeInTheDocument();
      });

      // Switch to interactive
      await user.click(screen.getByTestId("tab-interactive"));

      await waitFor(() => {
        expect(screen.getByTestId("json-viewer")).toBeInTheDocument();
        expect(screen.queryByTestId("code-view")).not.toBeInTheDocument();
      });

      // Switch back to code
      await user.click(screen.getByTestId("tab-code"));

      await waitFor(() => {
        expect(screen.getByTestId("code-view")).toBeInTheDocument();
        expect(screen.queryByTestId("json-viewer")).not.toBeInTheDocument();
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

  describe("Loading State", () => {
    it("should show spinner while loading", async () => {
      // Create a promise that doesn't resolve immediately
      let resolvePromise: (value: any) => void;
      const mockOnTaskLoad = jest.fn().mockImplementation(
        () =>
          new Promise((resolve) => {
            resolvePromise = resolve;
          }),
      );

      render(<TaskSourceViewer {...defaultProps} onTaskLoad={mockOnTaskLoad} />);

      // Spinner should be visible while loading
      expect(screen.getByTestId("spinner")).toBeInTheDocument();

      // Resolve the promise
      resolvePromise!(mockTaskData);

      // Wait for content to appear
      await waitFor(() => {
        expect(screen.queryByTestId("spinner")).not.toBeInTheDocument();
        expect(screen.getByTestId("code-view")).toBeInTheDocument();
      });
    });
  });
});
