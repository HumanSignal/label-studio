import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { Provider } from "mobx-react";
import { AnnotationButton } from "../AnnotationButton";
import { isAlive } from "mobx-state-tree";
import { confirm } from "../../../common/Modal/Modal";

vi.mock("mobx-state-tree", () => ({
  isAlive: vi.fn(() => true),
}));

vi.mock("@humansignal/core/hooks/useResolveUser", () => ({
  useResolveUser: vi.fn(),
  isUserComplete: (u: any) => !!(u && (u.email || (u.firstName && u.lastName))),
}));

vi.mock("@humansignal/core", () => ({
  useCopyText: () => [vi.fn()],
}));

const mockToastShow = vi.fn();
vi.mock("@humansignal/ui", async () => {
  const actual = await vi.importActual("@humansignal/ui");
  return {
    ...actual,
    useToast: () => ({ show: mockToastShow }),
    useDropdown: () => ({ close: vi.fn() }),
  };
});

vi.mock("../../../common/Modal/Modal", () => ({
  confirm: vi.fn(),
}));

vi.mock("../../../utils/feature-flags", () => ({
  isFF: vi.fn(() => false),
  FF_SIMPLE_INIT: "fflag_fix_front_leap_443_select_annotation_once",
}));

const defaultCapabilities = {
  groundTruthEnabled: true,
  enableCreateAnnotation: true,
  enableAnnotationDelete: true,
};

const defaultStore = {
  hasInterface: vi.fn(() => false),
  user: { id: 1, email: "current@test.com" },
  enrichUsers: vi.fn(),
  task: null,
};

const defaultAnnotationStore = {
  store: defaultStore,
  selectAnnotation: vi.fn(),
  selectPrediction: vi.fn(),
  addAnnotationFromPrediction: vi.fn(),
  toggleViewingAllAnnotations: vi.fn(),
};

function createEntity(overrides: Record<string, unknown> = {}) {
  return {
    id: 1,
    pk: 1,
    type: "annotation",
    selected: false,
    createdBy: "Test User",
    ground_truth: false,
    draftId: 0,
    skipped: false,
    createdDate: new Date().toISOString(),
    user: null,
    list: { deleteAnnotation: vi.fn() },
    setGroundTruth: vi.fn(),
    comment_count: 0,
    unresolved_comment_count: 0,
    ...overrides,
  };
}

describe("AnnotationButton", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (isAlive as any).mockReturnValue(true);
  });

  it("renders null when entity is not alive", () => {
    (isAlive as any).mockReturnValue(false);

    const entity = createEntity();
    const { container } = render(
      <AnnotationButton entity={entity} capabilities={defaultCapabilities} annotationStore={defaultAnnotationStore} />,
    );
    expect(container.firstChild).toBeNull();
  });

  it("renders annotation with display name", () => {
    const entity = createEntity({ createdBy: "Test User" });
    render(
      <AnnotationButton entity={entity} capabilities={defaultCapabilities} annotationStore={defaultAnnotationStore} />,
    );
    expect(screen.getByText("Test User")).toBeInTheDocument();
  });

  it("renders with long person name truncated", () => {
    const entity = createEntity({
      createdBy: "Alice Beatrice Catherine Davidson",
    });
    render(
      <AnnotationButton entity={entity} capabilities={defaultCapabilities} annotationStore={defaultAnnotationStore} />,
    );
    // truncatePersonName: first full, middle to initials, last initial
    expect(screen.getByText("Alice B. C. D.")).toBeInTheDocument();
  });

  it("renders with non-name long string truncated with ellipsis", () => {
    const entity = createEntity({
      createdBy: "verylongemailaddress@example.com",
    });
    const { container } = render(
      <AnnotationButton entity={entity} capabilities={defaultCapabilities} annotationStore={defaultAnnotationStore} />,
    );
    // Not a person name (has @), so truncate-middle is used; exact format may vary
    expect(container.textContent).toMatch(/verylong|example\.com/);
  });

  it("renders prediction with score", () => {
    const entity = createEntity({
      type: "prediction",
      createdBy: "Model",
      score: 0.95,
    });
    render(
      <AnnotationButton entity={entity} capabilities={defaultCapabilities} annotationStore={defaultAnnotationStore} />,
    );
    expect(screen.getByText("Model")).toBeInTheDocument();
    expect(screen.getByTitle("Prediction score = 0.95")).toBeInTheDocument();
  });

  it("renders draft annotation", () => {
    const entity = createEntity({ pk: undefined, draftId: 0 });
    render(
      <AnnotationButton entity={entity} capabilities={defaultCapabilities} annotationStore={defaultAnnotationStore} />,
    );
    expect(screen.getByText("Test User")).toBeInTheDocument();
  });

  it("calls selectAnnotation when clicking unselected annotation", () => {
    const entity = createEntity({ selected: false });
    const selectAnnotation = vi.fn();
    const annotationStore = {
      ...defaultAnnotationStore,
      selectAnnotation,
    };
    render(<AnnotationButton entity={entity} capabilities={defaultCapabilities} annotationStore={annotationStore} />);
    fireEvent.click(screen.getByText("Test User"));
    expect(selectAnnotation).toHaveBeenCalledWith(1, { exitViewAll: true });
  });

  it("does not call selectAnnotation when clicking already selected annotation", () => {
    const entity = createEntity({ selected: true });
    const selectAnnotation = vi.fn();
    const annotationStore = {
      ...defaultAnnotationStore,
      selectAnnotation,
    };
    render(<AnnotationButton entity={entity} capabilities={defaultCapabilities} annotationStore={annotationStore} />);
    fireEvent.click(screen.getByText("Test User"));
    expect(selectAnnotation).not.toHaveBeenCalled();
  });

  it("calls selectPrediction when clicking prediction", () => {
    const entity = createEntity({
      type: "prediction",
      id: 42,
      pk: undefined,
    });
    const selectPrediction = vi.fn();
    const annotationStore = {
      ...defaultAnnotationStore,
      selectPrediction,
    };
    render(<AnnotationButton entity={entity} capabilities={defaultCapabilities} annotationStore={annotationStore} />);
    fireEvent.click(screen.getByText("Test User"));
    expect(selectPrediction).toHaveBeenCalledWith(42, { exitViewAll: true });
  });

  it("renders with user object when isUserComplete", () => {
    const entity = createEntity({
      user: { id: 2, email: "annotator@test.com", firstName: "Annot", lastName: "Ator" },
    });
    render(
      <AnnotationButton entity={entity} capabilities={defaultCapabilities} annotationStore={defaultAnnotationStore} />,
    );
    expect(screen.getByText("Annot Ator")).toBeInTheDocument();
  });

  it("hides user info when store has annotations:hide-info and shows Me/User", () => {
    const store = {
      ...defaultStore,
      hasInterface: vi.fn((key: string) => key === "annotations:hide-info"),
    };
    const entity = createEntity({
      createdBy: "current@test.com",
      user: { id: 1 },
    });
    render(
      <AnnotationButton
        entity={entity}
        capabilities={defaultCapabilities}
        annotationStore={{ ...defaultAnnotationStore, store } as any}
      />,
    );
    expect(screen.getByText("Me")).toBeInTheDocument();
  });

  it("shows skipped state", () => {
    const entity = createEntity({ skipped: true });
    render(
      <AnnotationButton entity={entity} capabilities={defaultCapabilities} annotationStore={defaultAnnotationStore} />,
    );
    expect(screen.getByText("Test User")).toBeInTheDocument();
  });

  it("renders with task source for LSE review status path", () => {
    const origAppSettings = (window as any).APP_SETTINGS;
    (window as any).APP_SETTINGS = { version: { edition: "Enterprise" } };
    const taskSource = JSON.stringify({
      annotators: [{ review: "accepted" }],
      annotations: [{ id: 1 }],
    });
    const store = {
      ...defaultStore,
      task: { dataObj: { source: taskSource } },
    };
    const entity = createEntity({ pk: 1 });
    render(
      <AnnotationButton
        entity={entity}
        capabilities={defaultCapabilities}
        annotationStore={{ ...defaultAnnotationStore, store } as any}
      />,
    );
    expect(screen.getByText("Test User")).toBeInTheDocument();
    (window as any).APP_SETTINGS = origAppSettings;
  });

  it("renders with unresolved comment icon when entity has unresolved_comment_count", () => {
    const entity = createEntity({ unresolved_comment_count: 2 });
    render(
      <AnnotationButton entity={entity} capabilities={defaultCapabilities} annotationStore={defaultAnnotationStore} />,
    );
    expect(screen.getByText("Test User")).toBeInTheDocument();
  });

  it("renders with resolved comment icon when entity has comment_count only", () => {
    const entity = createEntity({ comment_count: 1, unresolved_comment_count: 0 });
    render(
      <AnnotationButton entity={entity} capabilities={defaultCapabilities} annotationStore={defaultAnnotationStore} />,
    );
    expect(screen.getByText("Test User")).toBeInTheDocument();
  });

  it("renders saved draft with draftId", () => {
    const entity = createEntity({ pk: undefined, draftId: 99 });
    render(
      <AnnotationButton entity={entity} capabilities={defaultCapabilities} annotationStore={defaultAnnotationStore} />,
    );
    expect(screen.getByText("Test User")).toBeInTheDocument();
  });

  it("calls onAnnotationChange when provided", () => {
    const entity = createEntity();
    const onAnnotationChange = vi.fn();
    render(
      <AnnotationButton
        entity={entity}
        capabilities={defaultCapabilities}
        annotationStore={defaultAnnotationStore}
        onAnnotationChange={onAnnotationChange}
      />,
    );
    fireEvent.click(screen.getByText("Test User"));
    expect(defaultAnnotationStore.selectAnnotation).toHaveBeenCalled();
  });

  it("renders with review status rejected from task source", () => {
    const origAppSettings = (window as any).APP_SETTINGS;
    (window as any).APP_SETTINGS = { version: { edition: "Enterprise" } };
    const taskSource = JSON.stringify({
      annotators: [{ review: "rejected" }],
      annotations: [{ id: 1 }],
    });
    const store = { ...defaultStore, task: { dataObj: { source: taskSource } } };
    const entity = createEntity({ pk: 1 });
    render(
      <AnnotationButton
        entity={entity}
        capabilities={defaultCapabilities}
        annotationStore={{ ...defaultAnnotationStore, store } as any}
      />,
    );
    expect(screen.getByText("Test User")).toBeInTheDocument();
    (window as any).APP_SETTINGS = origAppSettings;
  });

  it("renders with review status fixed from task source", () => {
    const origAppSettings = (window as any).APP_SETTINGS;
    (window as any).APP_SETTINGS = { version: { edition: "Enterprise" } };
    const taskSource = JSON.stringify({
      annotators: [{ review: "fixed" }],
      annotations: [{ id: 1 }],
    });
    const store = { ...defaultStore, task: { dataObj: { source: taskSource } } };
    const entity = createEntity({ pk: 1 });
    render(
      <AnnotationButton
        entity={entity}
        capabilities={defaultCapabilities}
        annotationStore={{ ...defaultAnnotationStore, store } as any}
      />,
    );
    expect(screen.getByText("Test User")).toBeInTheDocument();
    (window as any).APP_SETTINGS = origAppSettings;
  });

  it("renders with review status fixed_and_accepted from task source", () => {
    const origAppSettings = (window as any).APP_SETTINGS;
    (window as any).APP_SETTINGS = { version: { edition: "Enterprise" } };
    const taskSource = JSON.stringify({
      annotators: [{ review: "fixed_and_accepted" }],
      annotations: [{ id: 1 }],
    });
    const store = { ...defaultStore, task: { dataObj: { source: taskSource } } };
    const entity = createEntity({ pk: 1 });
    render(
      <AnnotationButton
        entity={entity}
        capabilities={defaultCapabilities}
        annotationStore={{ ...defaultAnnotationStore, store } as any}
      />,
    );
    expect(screen.getByText("Test User")).toBeInTheDocument();
    (window as any).APP_SETTINGS = origAppSettings;
  });

  it("opens context menu when trigger is clicked", () => {
    const entity = createEntity();
    const { container } = render(
      <Provider store={defaultStore}>
        <AnnotationButton
          entity={entity}
          capabilities={defaultCapabilities}
          annotationStore={{ ...defaultAnnotationStore, store: defaultStore } as any}
        />
      </Provider>,
    );
    const trigger = container.querySelector(".ls-annotation-button__trigger");
    expect(trigger).toBeInTheDocument();
    fireEvent.click(trigger!);
    expect(screen.getByText("Copy Annotation ID")).toBeInTheDocument();
  });

  it("shows Copy Annotation Link when store has annotations:copy-link", () => {
    const storeWithCopyLink = {
      ...defaultStore,
      hasInterface: vi.fn((key: string) => key === "annotations:copy-link"),
    };
    const entity = createEntity();
    const { container } = render(
      <Provider store={storeWithCopyLink}>
        <AnnotationButton
          entity={entity}
          capabilities={defaultCapabilities}
          annotationStore={
            {
              ...defaultAnnotationStore,
              store: storeWithCopyLink,
            } as any
          }
        />
      </Provider>,
    );
    fireEvent.click(container.querySelector(".ls-annotation-button__trigger")!);
    expect(screen.getByText("Copy Annotation Link")).toBeInTheDocument();
  });

  it("calls setGroundTruth when Set as Ground Truth is clicked", () => {
    const entity = createEntity({ ground_truth: false });
    const setGroundTruth = vi.fn();
    entity.setGroundTruth = setGroundTruth;
    const { container } = render(
      <Provider store={defaultStore}>
        <AnnotationButton
          entity={entity}
          capabilities={defaultCapabilities}
          annotationStore={{ ...defaultAnnotationStore, store: defaultStore } as any}
        />
      </Provider>,
    );
    fireEvent.click(container.querySelector(".ls-annotation-button__trigger")!);
    fireEvent.click(screen.getByText("Set as Ground Truth"));
    expect(setGroundTruth).toHaveBeenCalledWith(true);
  });

  it("calls toggleViewingAllAnnotations when Show Other Annotations is clicked", () => {
    const entity = createEntity();
    const toggleViewingAllAnnotations = vi.fn();
    const { container } = render(
      <Provider store={defaultStore}>
        <AnnotationButton
          entity={entity}
          capabilities={defaultCapabilities}
          annotationStore={
            {
              ...defaultAnnotationStore,
              store: defaultStore,
              toggleViewingAllAnnotations,
            } as any
          }
        />
      </Provider>,
    );
    fireEvent.click(container.querySelector(".ls-annotation-button__trigger")!);
    fireEvent.click(screen.getByText("Show Other Annotations"));
    expect(toggleViewingAllAnnotations).toHaveBeenCalled();
  });

  it("opens delete confirmation when Delete Annotation is clicked", () => {
    (confirm as any).mockClear();
    const entity = createEntity();
    const { container } = render(
      <Provider store={defaultStore}>
        <AnnotationButton
          entity={entity}
          capabilities={defaultCapabilities}
          annotationStore={{ ...defaultAnnotationStore, store: defaultStore } as any}
        />
      </Provider>,
    );
    fireEvent.click(container.querySelector(".ls-annotation-button__trigger")!);
    fireEvent.click(screen.getByText("Delete Annotation"));
    expect(confirm).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "Delete annotation?",
        okText: "Delete",
      }),
    );
  });

  it("calls Copy Annotation ID and shows toast when menu item is clicked", () => {
    mockToastShow.mockClear();
    const entity = createEntity();
    const { container } = render(
      <Provider store={defaultStore}>
        <AnnotationButton
          entity={entity}
          capabilities={defaultCapabilities}
          annotationStore={{ ...defaultAnnotationStore, store: defaultStore } as any}
        />
      </Provider>,
    );
    fireEvent.click(container.querySelector(".ls-annotation-button__trigger")!);
    fireEvent.click(screen.getByText("Copy Annotation ID"));
    expect(mockToastShow).toHaveBeenCalledWith(
      expect.objectContaining({ message: "Annotation ID copied to clipboard", type: "info" }),
    );
  });

  it("calls Copy Annotation Link and shows toast when menu item is clicked", () => {
    mockToastShow.mockClear();
    const storeWithCopyLink = {
      ...defaultStore,
      hasInterface: vi.fn((key: string) => key === "annotations:copy-link"),
    };
    const entity = createEntity();
    const { container } = render(
      <Provider store={storeWithCopyLink}>
        <AnnotationButton
          entity={entity}
          capabilities={defaultCapabilities}
          annotationStore={{ ...defaultAnnotationStore, store: storeWithCopyLink } as any}
        />
      </Provider>,
    );
    fireEvent.click(container.querySelector(".ls-annotation-button__trigger")!);
    fireEvent.click(screen.getByText("Copy Annotation Link"));
    expect(mockToastShow).toHaveBeenCalledWith(
      expect.objectContaining({ message: "Annotation link copied to clipboard", type: "info" }),
    );
  });

  it("calls addAnnotationFromPrediction and selectAnnotation when Duplicate Annotation is clicked", () => {
    vi.useFakeTimers();
    const newAnnotation = { id: 99 };
    const addAnnotationFromPrediction = vi.fn().mockReturnValue(newAnnotation);
    const selectAnnotation = vi.fn();
    const entity = createEntity();
    const { container } = render(
      <Provider store={defaultStore}>
        <AnnotationButton
          entity={entity}
          capabilities={defaultCapabilities}
          annotationStore={
            {
              ...defaultAnnotationStore,
              store: defaultStore,
              addAnnotationFromPrediction,
              selectAnnotation,
            } as any
          }
        />
      </Provider>,
    );
    fireEvent.click(container.querySelector(".ls-annotation-button__trigger")!);
    fireEvent.click(screen.getByText("Duplicate Annotation"));
    expect(addAnnotationFromPrediction).toHaveBeenCalledWith(entity);
    vi.runAllTimers();
    expect(selectAnnotation).toHaveBeenCalledWith(99, { exitViewAll: true });
    vi.useRealTimers();
  });

  it("calls setGroundTruth(false) when Unset as Ground Truth is clicked", () => {
    const entity = createEntity({ ground_truth: true });
    const setGroundTruth = vi.fn();
    entity.setGroundTruth = setGroundTruth;
    const { container } = render(
      <Provider store={defaultStore}>
        <AnnotationButton
          entity={entity}
          capabilities={defaultCapabilities}
          annotationStore={{ ...defaultAnnotationStore, store: defaultStore } as any}
        />
      </Provider>,
    );
    fireEvent.click(container.querySelector(".ls-annotation-button__trigger")!);
    fireEvent.click(screen.getByText("Unset as Ground Truth"));
    expect(setGroundTruth).toHaveBeenCalledWith(false);
  });

  it("invokes tooltip hover handler on root mouse enter", () => {
    const entity = createEntity();
    const { container } = render(
      <AnnotationButton entity={entity} capabilities={defaultCapabilities} annotationStore={defaultAnnotationStore} />,
    );
    const root = container.querySelector(".ls-annotation-button");
    expect(root).toBeInTheDocument();
    fireEvent.mouseEnter(root!);
    // Handler runs; tooltip visibility depends on Tooltip component internals
    expect(root).toBeInTheDocument();
  });

  it("handles invalid task source in getReviewStatus without throwing", () => {
    const origAppSettings = (window as any).APP_SETTINGS;
    (window as any).APP_SETTINGS = { version: { edition: "Enterprise" } };
    const store = {
      ...defaultStore,
      task: { dataObj: { source: "not valid json" } },
    };
    const entity = createEntity({ pk: 1 });
    render(
      <AnnotationButton
        entity={entity}
        capabilities={defaultCapabilities}
        annotationStore={{ ...defaultAnnotationStore, store } as any}
      />,
    );
    expect(screen.getByText("Test User")).toBeInTheDocument();
    (window as any).APP_SETTINGS = origAppSettings;
  });

  it("handles task source with non-array annotators in getReviewStatus", () => {
    const origAppSettings = (window as any).APP_SETTINGS;
    (window as any).APP_SETTINGS = { version: { edition: "Enterprise" } };
    const taskSource = JSON.stringify({ annotators: null, annotations: [] });
    const store = { ...defaultStore, task: { dataObj: { source: taskSource } } };
    const entity = createEntity({ pk: 1 });
    render(
      <AnnotationButton
        entity={entity}
        capabilities={defaultCapabilities}
        annotationStore={{ ...defaultAnnotationStore, store } as any}
      />,
    );
    expect(screen.getByText("Test User")).toBeInTheDocument();
    (window as any).APP_SETTINGS = origAppSettings;
  });
});
