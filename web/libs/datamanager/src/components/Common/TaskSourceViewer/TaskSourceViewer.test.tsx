import { render, screen, waitFor, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TaskSourceViewer } from "./TaskSourceViewer";
import * as uiModule from "@humansignal/ui";
import * as codeViewModule from "./CodeView";

beforeEach(() => {
  spyOn(uiModule, "JsonViewer").mockImplementation(({ data, toolbarExtra }: any) => (
    <div data-testid="json-viewer">
      {toolbarExtra && <div data-testid="json-viewer-toolbar-extra">{toolbarExtra}</div>}
      <div data-testid="json-viewer-content">{JSON.stringify(data)}</div>
    </div>
  ));
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
  spyOn(uiModule, "TabsList").mockImplementation(({ children }: any) => <div data-testid="tabs-list">{children}</div>);
  spyOn(uiModule, "TabsTrigger").mockImplementation(({ children, value }: any) => (
    <button type="button" data-testid={`tab-${value}`} data-value={value}>
      {children}
    </button>
  ));

  spyOn(codeViewModule, "CodeView").mockImplementation(({ data }: any) => (
    <pre data-testid="code-view">{JSON.stringify(data, null, 2)}</pre>
  ));
});

describe("TaskSourceViewer Component", () => {
  // View uses global key; resolveUrls and JSON viewer use project-scoped key (storageKey prop)
  const GLOBAL_STORAGE_KEY = "dm:tasksource";
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
    onTaskLoad: mock().mockResolvedValue(mockTaskData),
    storageKey: "test:tasksource",
  };

  beforeEach(() => {
    mock.clearAllMocks();
    localStorage.clear();
  });

  describe("Initial Load", () => {
    it("should load task data on mount with default resolveUri=false", async () => {
      const mockOnTaskLoad = mock().mockResolvedValue(mockTaskData);

      render(<TaskSourceViewer {...defaultProps} onTaskLoad={mockOnTaskLoad} />);

      await waitFor(() => {
        expect(mockOnTaskLoad).toHaveBeenCalledTimes(1);
        expect(mockOnTaskLoad).toHaveBeenCalledWith({ resolveUri: false });
      });
    });

    it("should display task data after loading", async () => {
      render(<TaskSourceViewer {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByTestId("json-viewer-content")).toHaveTextContent("s3://bucket/image.jpg");
      });
    });

    it("should respect stored resolveUrls preference from localStorage", async () => {
      localStorage.setItem("test:tasksource:resolveUrls", "true");
      const mockOnTaskLoad = mock().mockResolvedValue(mockTaskData);

      render(<TaskSourceViewer {...defaultProps} onTaskLoad={mockOnTaskLoad} />);

      await waitFor(() => {
        expect(mockOnTaskLoad).toHaveBeenCalledWith({ resolveUri: true });
      });
    });
  });

  describe("Resolve URIs Toggle", () => {
    it("should NOT show resolve URI toggle in code view", async () => {
      localStorage.setItem(`${GLOBAL_STORAGE_KEY}:view`, "code");
      render(<TaskSourceViewer {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByTestId("code-view")).toBeInTheDocument();
      });

      // Toggle should not be visible in code view
      expect(screen.queryByText("Resolve URIs")).not.toBeInTheDocument();
    });

    it("should show resolve URI toggle in JsonViewer toolbar for interactive view", async () => {
      render(<TaskSourceViewer {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByTestId("json-viewer")).toBeInTheDocument();
        expect(screen.getByTestId("json-viewer-toolbar-extra")).toBeInTheDocument();
        expect(screen.getByText("Resolve URIs")).toBeInTheDocument();
      });
    });

    it("should reload task data when resolve URIs toggle changes", async () => {
      const user = userEvent.setup();
      const mockOnTaskLoad = mock().mockResolvedValue(mockTaskData);

      render(<TaskSourceViewer {...defaultProps} onTaskLoad={mockOnTaskLoad} />);

      // Wait for initial load
      await waitFor(() => {
        expect(mockOnTaskLoad).toHaveBeenCalledWith({ resolveUri: false });
      });

      // Click the toggle to enable URI resolution
      await user.click(screen.getByText("Resolve URIs"));

      // Should reload with resolveUri: true
      await waitFor(() => {
        expect(mockOnTaskLoad).toHaveBeenCalledWith({ resolveUri: true });
      });
    });

    it("should save resolve URIs preference to localStorage", async () => {
      const user = userEvent.setup();

      render(<TaskSourceViewer {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText("Resolve URIs")).toBeInTheDocument();
      });

      await user.click(screen.getByText("Resolve URIs"));

      await waitFor(() => {
        expect(localStorage.getItem("test:tasksource:resolveUrls")).toBe("true");
      });
    });
  });

  describe("View Mode Toggle", () => {
    it("should default to interactive view", async () => {
      render(<TaskSourceViewer {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByTestId("json-viewer")).toBeInTheDocument();
      });
    });

    it("should respect stored code view preference from localStorage", async () => {
      localStorage.setItem(`${GLOBAL_STORAGE_KEY}:view`, "code");

      render(<TaskSourceViewer {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByTestId("code-view")).toBeInTheDocument();
      });
    });

    it("should call renderToggle with ViewToggle component", async () => {
      const mockRenderToggle = mock();

      render(<TaskSourceViewer {...defaultProps} renderToggle={mockRenderToggle} />);

      await waitFor(() => {
        expect(mockRenderToggle).toHaveBeenCalled();
      });

      // Should have been called with a ViewToggle element
      const toggleArg = mockRenderToggle.mock.calls[0][0];
      expect(toggleArg).toBeTruthy();
    });

    it("should update renderToggle when view changes via callback", async () => {
      const mockRenderToggle = mock();
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

      // Simulate switching to code view via callback
      capturedOnViewChange!("code");

      await waitFor(() => {
        expect(localStorage.getItem(`${GLOBAL_STORAGE_KEY}:view`)).toBe("code");
        expect(screen.getByTestId("code-view")).toBeInTheDocument();
      });
    });

    it("should keep interactive view mounted after switching to code", async () => {
      const mockRenderToggle = mock();
      let capturedOnViewChange: ((view: string) => void) | null = null;

      mockRenderToggle.mockImplementation((toggle: any) => {
        if (toggle?.props?.onViewChange) {
          capturedOnViewChange = toggle.props.onViewChange;
        }
      });

      render(<TaskSourceViewer {...defaultProps} renderToggle={mockRenderToggle} />);

      await waitFor(() => {
        expect(screen.getByTestId("json-viewer")).toBeInTheDocument();
      });

      capturedOnViewChange!("code");

      await waitFor(() => {
        expect(screen.getByTestId("code-view")).toBeInTheDocument();
      });

      // Interactive view stays mounted (hidden) so switching back avoids re-parsing.
      expect(screen.getByTestId("json-viewer")).toBeInTheDocument();
    });
  });

  describe("Data Explorer Mode", () => {
    it("should not include annotations/predictions for Data Explorer", async () => {
      localStorage.setItem(`${GLOBAL_STORAGE_KEY}:view`, "code");
      const mockOnTaskLoad = mock().mockResolvedValue({
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
    it("should show skeleton while loading then update to interactive view", async () => {
      // Create a promise that doesn't resolve immediately
      let resolvePromise: (value: any) => void;
      const mockOnTaskLoad = mock().mockImplementation(
        () =>
          new Promise((resolve) => {
            resolvePromise = resolve;
          }),
      );

      render(<TaskSourceViewer {...defaultProps} onTaskLoad={mockOnTaskLoad} />);

      // While loading, json-viewer is not shown (skeleton is shown instead)
      expect(screen.queryByTestId("json-viewer")).not.toBeInTheDocument();

      // Resolve the promise with new data (wrap in act to avoid state-update warning)
      await act(async () => {
        resolvePromise!(mockTaskData);
      });

      // Wait for content to be updated and interactive view to appear
      await waitFor(() => {
        expect(screen.getByTestId("json-viewer-content")).toHaveTextContent("s3://bucket/image.jpg");
      });
    });
  });
});
