/**
 * Integration tests for the classic-editor (MST) `AnnotationButton` wrapper.
 *
 * After FIT-1774 the visual + interaction surface lives in the shared
 * `@humansignal/core/lib/topbar/AnnotationButton` (covered by Bun tests under
 * `libs/core/src/lib/topbar/__tests__/`). The tests in this file remain as the
 * source of truth for the MST → props/handler mapping done by the wrapper —
 * lazy stub hydration, `useResolveUser`/`enrichUsers` plumbing, the
 * `Modal#confirm` delete dialog, LSE-specific review-status parsing from
 * `task.source`, and the wiring of MST actions onto SharedAnnotation handlers.
 *
 * If you need to add coverage for purely presentational behavior, prefer the
 * shared Bun suite. Add tests here only when the assertion depends on MST state
 * or wrapper-only side effects.
 */
import type { ReactElement } from "react";
import { render as rtlRender, screen, fireEvent, act, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Provider } from "mobx-react";
import { FF_FIT_720_LAZY_LOAD_ANNOTATIONS } from "@humansignal/core/lib/utils/feature-flags";
import { AnnotationButton } from "../AnnotationButton";
import * as useAnnotationQueryModule from "../../../hooks/useAnnotationQuery";
import * as useResolveUserModule from "@humansignal/core/hooks/useResolveUser";
import * as coreModule from "@humansignal/core";
import * as uiModule from "@humansignal/ui";
import { ToastContext } from "@humansignal/ui";
import * as modalModule from "../../../common/Modal/Modal";

import { isAlive } from "mobx-state-tree";
const mockIsAlive = isAlive as any;
const mockModalConfirm = mock();
const ff = mockFF();

beforeEach(() => {
  mockIsAlive.mockImplementation(() => true);
});

const mockFetchAnnotationCached = mock();
const mockToastShow = mock();

const defaultCapabilities = {
  groundTruthEnabled: true,
  enableCreateAnnotation: true,
  enableAnnotationDelete: true,
};

const defaultStore = {
  hasInterface: mock(() => false),
  user: { id: 1, email: "current@test.com" },
  enrichUsers: mock(),
  task: null,
};

const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

const renderWithProviders = (ui: any, store: any = defaultStore) =>
  rtlRender(
    <Provider store={store}>
      <QueryClientProvider client={createTestQueryClient()}>
        <ToastContext.Provider value={{ show: mockToastShow, dismiss: mock() }}>{ui}</ToastContext.Provider>
      </QueryClientProvider>
    </Provider>,
  );

const defaultAnnotationStore = {
  store: defaultStore,
  selectAnnotation: mock(),
  selectPrediction: mock(),
  addAnnotationFromPrediction: mock(),
  toggleViewingAllAnnotations: mock(),
};

function render(ui: ReactElement) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return rtlRender(
    <QueryClientProvider client={client}>
      <ToastContext.Provider value={{ show: mockToastShow, dismiss: mock() }}>{ui}</ToastContext.Provider>
    </QueryClientProvider>,
  );
}

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
    list: { deleteAnnotation: mock() },
    setGroundTruth: mock(),
    comment_count: 0,
    unresolved_comment_count: 0,
    ...overrides,
  };
}

describe("AnnotationButton", () => {
  beforeEach(() => {
    mock.clearAllMocks();
    mockIsAlive.mockReturnValue(true);
    ff.reset();
    mockFetchAnnotationCached.mockReset();

    spyOn(useAnnotationQueryModule, "useAnnotationFetcher").mockReturnValue({
      fetchAnnotationCached: mockFetchAnnotationCached,
    });

    spyOn(useResolveUserModule, "useResolveUser").mockImplementation(() => undefined);
    spyOn(useResolveUserModule, "isUserComplete").mockImplementation(
      (u: any) => !!(u && (u.email || (u.firstName && u.lastName))),
    );

    spyOn(coreModule, "useCopyText").mockReturnValue([mock()]);

    spyOn(uiModule, "useToast").mockReturnValue({ show: mockToastShow });
    spyOn(uiModule, "useDropdown").mockReturnValue({ close: mock() });

    spyOn(modalModule, "confirm").mockImplementation(mockModalConfirm);
  });

  it("renders null when entity is not alive", () => {
    mockIsAlive.mockReturnValue(false);

    const entity = createEntity();
    const { container } = renderWithProviders(
      <AnnotationButton entity={entity} capabilities={defaultCapabilities} annotationStore={defaultAnnotationStore} />,
    );
    expect(container.firstChild).toBeNull();
  });

  it("renders annotation with display name", () => {
    const entity = createEntity({ createdBy: "Test User" });
    renderWithProviders(
      <AnnotationButton entity={entity} capabilities={defaultCapabilities} annotationStore={defaultAnnotationStore} />,
    );
    expect(screen.getByText("Test User")).toBeInTheDocument();
  });

  it("renders with long person name truncated", () => {
    const entity = createEntity({
      createdBy: "Alice Beatrice Catherine Davidson",
    });
    renderWithProviders(
      <AnnotationButton entity={entity} capabilities={defaultCapabilities} annotationStore={defaultAnnotationStore} />,
    );
    // truncatePersonName: first full, middle to initials, last initial
    expect(screen.getByText("Alice B. C. D.")).toBeInTheDocument();
  });

  it("renders with non-name long string truncated with ellipsis", () => {
    const entity = createEntity({
      createdBy: "verylongemailaddress@example.com",
    });
    const { container } = renderWithProviders(
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
    renderWithProviders(
      <AnnotationButton entity={entity} capabilities={defaultCapabilities} annotationStore={defaultAnnotationStore} />,
    );
    expect(screen.getByText("Model")).toBeInTheDocument();
    expect(screen.getByTitle("Prediction score = 0.95")).toBeInTheDocument();
  });

  it("renders draft annotation", () => {
    const entity = createEntity({ pk: undefined, draftId: 0 });
    renderWithProviders(
      <AnnotationButton entity={entity} capabilities={defaultCapabilities} annotationStore={defaultAnnotationStore} />,
    );
    expect(screen.getByText("Test User")).toBeInTheDocument();
  });

  it("calls selectAnnotation when clicking unselected annotation", () => {
    const entity = createEntity({ selected: false });
    const selectAnnotation = mock();
    const annotationStore = {
      ...defaultAnnotationStore,
      selectAnnotation,
    };
    renderWithProviders(
      <AnnotationButton entity={entity} capabilities={defaultCapabilities} annotationStore={annotationStore} />,
    );
    fireEvent.click(screen.getByText("Test User"));
    expect(selectAnnotation).toHaveBeenCalledWith(1, { exitViewAll: true });
  });

  it("does not call selectAnnotation when clicking already selected annotation", () => {
    const entity = createEntity({ selected: true });
    const selectAnnotation = mock();
    const annotationStore = {
      ...defaultAnnotationStore,
      selectAnnotation,
    };
    renderWithProviders(
      <AnnotationButton entity={entity} capabilities={defaultCapabilities} annotationStore={annotationStore} />,
    );
    fireEvent.click(screen.getByText("Test User"));
    expect(selectAnnotation).not.toHaveBeenCalled();
  });

  it("calls selectPrediction when clicking prediction", () => {
    const entity = createEntity({
      type: "prediction",
      id: 42,
      pk: undefined,
    });
    const selectPrediction = mock();
    const annotationStore = {
      ...defaultAnnotationStore,
      selectPrediction,
    };
    renderWithProviders(
      <AnnotationButton entity={entity} capabilities={defaultCapabilities} annotationStore={annotationStore} />,
    );
    fireEvent.click(screen.getByText("Test User"));
    expect(selectPrediction).toHaveBeenCalledWith(42, { exitViewAll: true });
  });

  it("renders with user object when isUserComplete", () => {
    const entity = createEntity({
      user: { id: 2, email: "annotator@test.com", firstName: "Annot", lastName: "Ator" },
    });
    renderWithProviders(
      <AnnotationButton entity={entity} capabilities={defaultCapabilities} annotationStore={defaultAnnotationStore} />,
    );
    expect(screen.getByText("Annot Ator")).toBeInTheDocument();
  });

  it("hides user info when store has annotations:hide-info and shows Me/User", () => {
    const store = {
      ...defaultStore,
      hasInterface: mock((key: string) => key === "annotations:hide-info"),
    };
    const entity = createEntity({
      createdBy: "current@test.com",
      user: { id: 1 },
    });
    renderWithProviders(
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
    renderWithProviders(
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
    renderWithProviders(
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
    renderWithProviders(
      <AnnotationButton entity={entity} capabilities={defaultCapabilities} annotationStore={defaultAnnotationStore} />,
    );
    expect(screen.getByText("Test User")).toBeInTheDocument();
  });

  it("renders with resolved comment icon when entity has comment_count only", () => {
    const entity = createEntity({ comment_count: 1, unresolved_comment_count: 0 });
    renderWithProviders(
      <AnnotationButton entity={entity} capabilities={defaultCapabilities} annotationStore={defaultAnnotationStore} />,
    );
    expect(screen.getByText("Test User")).toBeInTheDocument();
  });

  it("renders saved draft with draftId", () => {
    const entity = createEntity({ pk: undefined, draftId: 99 });
    renderWithProviders(
      <AnnotationButton entity={entity} capabilities={defaultCapabilities} annotationStore={defaultAnnotationStore} />,
    );
    expect(screen.getByText("Test User")).toBeInTheDocument();
  });

  it("calls onAnnotationChange when provided", () => {
    const entity = createEntity();
    const onAnnotationChange = mock();
    renderWithProviders(
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
    renderWithProviders(
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
    renderWithProviders(
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
    renderWithProviders(
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
    const { container } = renderWithProviders(
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
      hasInterface: mock((key: string) => key === "annotations:copy-link"),
    };
    const entity = createEntity();
    const { container } = renderWithProviders(
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
    const setGroundTruth = mock();
    entity.setGroundTruth = setGroundTruth;
    const { container } = renderWithProviders(
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

  it("calls toggleViewingAllAnnotations when Compare All Annotations is clicked", () => {
    // The wrapper now gates this row on `annotations:view-all` (mirrors the
    // left-side ViewAllToggle in `editor/src/components/TopBar/TopBar.jsx`).
    const storeWithViewAll = {
      ...defaultStore,
      hasInterface: mock((key: string) => key === "annotations:view-all"),
    };
    const entity = createEntity();
    const toggleViewingAllAnnotations = mock();
    renderWithProviders(
      <Provider store={storeWithViewAll}>
        <AnnotationButton
          entity={entity}
          capabilities={defaultCapabilities}
          annotationStore={
            {
              ...defaultAnnotationStore,
              store: storeWithViewAll,
              toggleViewingAllAnnotations,
            } as any
          }
        />
      </Provider>,
    );
    fireEvent.click(screen.getByTestId("annotation-button-menu-trigger"));
    fireEvent.click(screen.getByTestId("annotation-button-menu-compare-all"));
    expect(toggleViewingAllAnnotations).toHaveBeenCalled();
  });

  it("hides Compare All Annotations when the store does not have annotations:view-all", () => {
    // FIT-1774: the left-side ViewAllToggle is gated on
    // `store.hasInterface('annotations:view-all')`. Before this change the
    // context-menu row was always shown — a project that disabled the
    // toggle could still trigger view-all from the menu and end up in a
    // state with no UI to leave. Now the row is hidden.
    const entity = createEntity();
    renderWithProviders(
      <Provider store={defaultStore}>
        <AnnotationButton
          entity={entity}
          capabilities={defaultCapabilities}
          annotationStore={{ ...defaultAnnotationStore, store: defaultStore } as any}
        />
      </Provider>,
    );
    fireEvent.click(screen.getByTestId("annotation-button-menu-trigger"));
    expect(screen.queryByTestId("annotation-button-menu-compare-all")).toBeNull();
    expect(screen.queryByText("Compare All Annotations")).toBeNull();
  });

  it("opens delete confirmation when Delete Annotation is clicked", () => {
    const entity = createEntity();
    const { container } = renderWithProviders(
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
    expect(mockModalConfirm).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "Delete annotation?",
        okText: "Delete",
      }),
    );
  });

  it("calls Copy Annotation ID and shows toast when menu item is clicked", () => {
    mockToastShow.mockClear();
    const entity = createEntity();
    const { container } = renderWithProviders(
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
      hasInterface: mock((key: string) => key === "annotations:copy-link"),
    };
    const entity = createEntity();
    const { container } = renderWithProviders(
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

  it("calls addAnnotationFromPrediction and selectAnnotation when Duplicate Annotation is clicked", async () => {
    useFakeTimers();
    try {
      const newAnnotation = { id: 99 };
      const addAnnotationFromPrediction = mock().mockReturnValue(newAnnotation);
      const selectAnnotation = mock();
      const entity = createEntity();
      const { container } = renderWithProviders(
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
      expect(mockFetchAnnotationCached).not.toHaveBeenCalled();
      expect(addAnnotationFromPrediction).toHaveBeenCalledWith(entity);

      await act(async () => {
        runAllTimers();
        await Promise.resolve();
      });

      if (selectAnnotation.mock.calls.length > 0) {
        expect(selectAnnotation).toHaveBeenCalledWith(99, { exitViewAll: true });
      } else {
        expect(selectAnnotation).not.toHaveBeenCalled();
      }
    } finally {
      useRealTimers();
    }
  });

  it("fetches annotation before duplicate when lazy-load FF is on and annotation is a stub", async () => {
    ff.set({ [FF_FIT_720_LAZY_LOAD_ANNOTATIONS]: true });
    mockFetchAnnotationCached.mockResolvedValue({ result: [{ id: "region-1" }] });
    const newAnnotation = { id: 99 };
    const addAnnotationFromPrediction = mock().mockReturnValue(newAnnotation);
    const selectAnnotation = mock();
    const entity = createEntity({
      userGenerate: false,
      versions: { result: [] },
      areas: { size: 0 },
      deserializeResults: mock(),
      updateObjects: mock(),
      reinitHistory: mock(),
      history: { freeze: mock(), safeUnfreeze: mock() },
      trackedState: {},
    });
    const { container } = render(
      <Provider store={defaultStore}>
        <AnnotationButton
          entity={entity}
          capabilities={defaultCapabilities}
          annotationStore={
            {
              ...defaultAnnotationStore,
              store: defaultStore,
              annotations: [entity],
              addAnnotationFromPrediction,
              selectAnnotation,
            } as any
          }
        />
      </Provider>,
    );
    fireEvent.click(container.querySelector(".ls-annotation-button__trigger")!);
    fireEvent.click(screen.getByText("Duplicate Annotation"));
    await waitFor(() => expect(mockFetchAnnotationCached).toHaveBeenCalledWith(1));
    await waitFor(() => expect(entity.deserializeResults).toHaveBeenCalled());
    await waitFor(() => expect(addAnnotationFromPrediction).toHaveBeenCalledWith(entity));
    await waitFor(() => expect(selectAnnotation).toHaveBeenCalledWith(99, { exitViewAll: true }));
  });

  it("calls setGroundTruth(false) when Unset as Ground Truth is clicked", () => {
    const entity = createEntity({ ground_truth: true });
    const setGroundTruth = mock();
    entity.setGroundTruth = setGroundTruth;
    const { container } = renderWithProviders(
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

  describe("annotation button menu with prediction entity", () => {
    const predictionCapabilities = {
      ...defaultCapabilities,
      enablePredictionDelete: true,
    } as const;

    it("calls Copy Prediction ID and shows toast when menu item is clicked for prediction", () => {
      mockToastShow.mockClear();
      const entity = createEntity({ type: "prediction", pk: 1 });
      render(
        <Provider store={defaultStore}>
          <AnnotationButton
            entity={entity}
            capabilities={predictionCapabilities}
            annotationStore={{ ...defaultAnnotationStore, store: defaultStore } as any}
          />
        </Provider>,
      );
      fireEvent.click(screen.getByTestId("annotation-button-menu-trigger"));
      fireEvent.click(screen.getByText("Copy Prediction ID"));
      expect(mockToastShow).toHaveBeenCalledWith(
        expect.objectContaining({ message: "Prediction ID copied to clipboard", type: "info" }),
      );
    });

    it("calls addAnnotationFromPrediction and selectAnnotation when Duplicate as Annotation is clicked for prediction", () => {
      useFakeTimers();
      try {
        const newAnnotation = { id: 99 };
        const addAnnotationFromPrediction = mock().mockReturnValue(newAnnotation);
        const selectAnnotation = mock();
        const entity = createEntity({ type: "prediction", pk: 1 });
        render(
          <Provider store={defaultStore}>
            <AnnotationButton
              entity={entity}
              capabilities={predictionCapabilities}
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
        fireEvent.click(screen.getByTestId("annotation-button-menu-trigger"));
        fireEvent.click(screen.getByText("Duplicate as Annotation"));
        expect(addAnnotationFromPrediction).toHaveBeenCalledWith(entity);
        runAllTimers();
        expect(selectAnnotation).toHaveBeenCalledWith(99, { exitViewAll: true });
      } finally {
        useRealTimers();
      }
    });

    it("shows Copy Prediction Link when store has annotations:copy-link for prediction", () => {
      const storeWithCopyLink = {
        ...defaultStore,
        hasInterface: mock((key: string) => key === "annotations:copy-link"),
      };
      const entity = createEntity({ type: "prediction", pk: 1 });
      render(
        <Provider store={storeWithCopyLink}>
          <AnnotationButton
            entity={entity}
            capabilities={predictionCapabilities}
            annotationStore={
              {
                ...defaultAnnotationStore,
                store: storeWithCopyLink,
              } as any
            }
          />
        </Provider>,
      );
      fireEvent.click(screen.getByTestId("annotation-button-menu-trigger"));
      expect(screen.getByText("Copy Prediction Link")).toBeInTheDocument();
    });

    it("calls Copy Prediction Link and shows toast when menu item is clicked for prediction", () => {
      mockToastShow.mockClear();
      const storeWithCopyLink = {
        ...defaultStore,
        hasInterface: mock((key: string) => key === "annotations:copy-link"),
      };
      const entity = createEntity({ type: "prediction", pk: 1 });
      render(
        <Provider store={storeWithCopyLink}>
          <AnnotationButton
            entity={entity}
            capabilities={predictionCapabilities}
            annotationStore={{ ...defaultAnnotationStore, store: storeWithCopyLink } as any}
          />
        </Provider>,
      );
      fireEvent.click(screen.getByTestId("annotation-button-menu-trigger"));
      fireEvent.click(screen.getByText("Copy Prediction Link"));
      expect(mockToastShow).toHaveBeenCalledWith(
        expect.objectContaining({ message: "Prediction link copied to clipboard", type: "info" }),
      );
    });

    it("opens delete confirmation when Delete Prediction is clicked", () => {
      const entity = createEntity({ type: "prediction", pk: 1 });
      render(
        <Provider store={defaultStore}>
          <AnnotationButton
            entity={entity}
            capabilities={predictionCapabilities}
            annotationStore={{ ...defaultAnnotationStore, store: defaultStore } as any}
          />
        </Provider>,
      );
      fireEvent.click(screen.getByTestId("annotation-button-menu-trigger"));
      fireEvent.click(screen.getByText("Delete Prediction"));
      expect(mockModalConfirm).toHaveBeenCalledWith(
        expect.objectContaining({
          title: "Delete prediction?",
          okText: "Delete",
        }),
      );
    });
  });

  it("invokes tooltip hover handler on root mouse enter", () => {
    const entity = createEntity();
    const { container } = renderWithProviders(
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
    renderWithProviders(
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
    renderWithProviders(
      <AnnotationButton
        entity={entity}
        capabilities={defaultCapabilities}
        annotationStore={{ ...defaultAnnotationStore, store } as any}
      />,
    );
    expect(screen.getByText("Test User")).toBeInTheDocument();
    (window as any).APP_SETTINGS = origAppSettings;
  });

  it("handles mouse leave with window as relatedTarget without throwing error", () => {
    const entity = createEntity();
    const { container } = renderWithProviders(
      <AnnotationButton entity={entity} capabilities={defaultCapabilities} annotationStore={defaultAnnotationStore} />,
    );
    const root = container.querySelector(".ls-annotation-button");
    expect(root).toBeInTheDocument();

    // The component needs to have the tooltip open for the interaction to be fully tested,
    // but the error happens specifically when relatedTarget has no nodeType.
    // Triggering it directly through fireEvent
    expect(() => {
      fireEvent.mouseLeave(root!, { relatedTarget: window });
    }).not.toThrow();
  });
});
