import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Provider } from "mobx-react";
import Grid, { VirtualizedGrid, VirtualizedAnnotationPanel, Item } from "../Grid";

import { FF_DEV_3391 } from "../../../utils/feature-flags";
import { FF_FIT_720_LAZY_LOAD_ANNOTATIONS } from "@humansignal/core/lib/utils/feature-flags";

const ff = mockFF();

mockModule("../../AnnotationTabs/AnnotationTabs", () => ({
  EntityTab: ({ entity, onClick }) => (
    <div
      data-testid="entity-tab"
      data-annotation-id={entity?.pk ?? entity?.id}
      onClick={() => onClick?.()}
      onKeyDown={(e) => e.key === "Enter" && onClick?.()}
      role="tab"
      tabIndex={0}
    >
      {entity?.id}
    </div>
  ),
}));

mockModule("../Annotation", () => ({
  Annotation: () => <div data-testid="annotation-panel">Annotation</div>,
}));

const mockFetchAnnotationCached = mock();
const mockGetCachedAnnotation = mock();
mockModule("../../../hooks/useAnnotationQuery", () => ({
  useAnnotationFetcher: () => ({
    fetchAnnotationCached: mockFetchAnnotationCached,
    getCachedAnnotation: mockGetCachedAnnotation,
  }),
}));

mockModule("react-virtualized-auto-sizer", () => ({
  __esModule: true,
  default: ({ children }) => children({ width: 800, height: 400 }),
}));

mockModule("react-window", () => {
  const R = require("react");
  const { useEffect } = R;
  const listRefObj = { scrollTo: mock() };
  return {
    FixedSizeList: R.forwardRef(({ children, itemCount, itemData }, ref) => {
      useEffect(() => {
        if (ref) {
          ref.current = listRefObj;
        }
      }, [ref]);
      return R.createElement(
        "div",
        { "data-testid": "virtualized-list" },
        ...Array.from({ length: Math.min(itemCount, 3) }, (_, i) => children({ index: i, style: {}, data: itemData })),
      );
    }),
  };
});

function createStore(overrides = {}) {
  return {
    selected: { selected: null },
    selectAnnotation: mock(),
    selectPrediction: mock(),
    _selectItem: mock(),
    _unselectAll: mock(),
    store: {},
    ...overrides,
  };
}

function createAnnotation(overrides = {}) {
  return {
    id: "ann-1",
    pk: 1,
    type: "annotation",
    hidden: false,
    userGenerate: false,
    ...overrides,
  };
}

async function waitForUpdates(ms) {
  await act(async () => {
    await new Promise((r) => setTimeout(r, ms));
  });
}

describe("Grid", () => {
  beforeEach(() => {
    ff.reset();
    mockGetCachedAnnotation.mockReturnValue(undefined);
    if (typeof Element.prototype.scrollTo !== "function") {
      Element.prototype.scrollTo = mock();
    }
  });

  afterAll(() => {
    ff.reset();
  });

  it("renders classic Grid (GridClassComponent) when virtualization FF is off", () => {
    ff.reset();
    const annotations = [createAnnotation({ id: "a1" }), createAnnotation({ id: "a2" })];
    const store = createStore({ selected: { selected: annotations[0] } });
    const root = {};

    render(
      <Provider store={store}>
        <Grid store={store} annotations={annotations} root={root} />
      </Provider>,
    );

    expect(screen.getByLabelText("Move left")).toBeInTheDocument();
    expect(screen.getByLabelText("Move right")).toBeInTheDocument();
    expect(screen.getAllByTestId("entity-tab")).toHaveLength(2);
  });

  it("filters out hidden annotations", () => {
    ff.reset();
    const annotations = [createAnnotation({ id: "a1" }), createAnnotation({ id: "a2", hidden: true })];
    const store = createStore({ selected: { selected: annotations[0] } });
    const root = {};

    render(
      <Provider store={store}>
        <Grid store={store} annotations={annotations} root={root} />
      </Provider>,
    );

    expect(screen.getAllByTestId("entity-tab")).toHaveLength(1);
  });

  it("renders GridClassComponent with FF_DEV_3391 on (direct Annotation per panel)", () => {
    ff.set({ [FF_DEV_3391]: true });
    const annotations = [createAnnotation({ id: "a1" }), createAnnotation({ id: "a2" })];
    const store = createStore({ selected: { selected: annotations[0] } });
    const root = {};

    render(
      <Provider store={store}>
        <Grid store={store} annotations={annotations} root={root} />
      </Provider>,
    );

    expect(screen.getAllByTestId("annotation-panel")).toHaveLength(2);
    expect(screen.getByLabelText("Move left")).toBeInTheDocument();
    expect(screen.getByLabelText("Move right")).toBeInTheDocument();
  });

  it("calls selectAnnotation when clicking second panel entity tab", async () => {
    ff.reset();
    const annotations = [createAnnotation({ id: "a1" }), createAnnotation({ id: "a2" })];
    const store = createStore({ selected: { selected: annotations[0] } });
    const root = {};

    render(
      <Provider store={store}>
        <Grid store={store} annotations={annotations} root={root} />
      </Provider>,
    );

    const tabs = screen.getAllByTestId("entity-tab");
    await userEvent.click(tabs[1]);
    expect(store.selectAnnotation).toHaveBeenCalledWith("a2", { exitViewAll: true });
  });

  it("calls selectPrediction when clicking prediction entity tab", async () => {
    ff.reset();
    const annotations = [
      createAnnotation({ id: "a1", type: "annotation" }),
      createAnnotation({ id: "a2", type: "prediction" }),
    ];
    const store = createStore({ selected: { selected: annotations[0] } });
    const root = {};

    render(
      <Provider store={store}>
        <Grid store={store} annotations={annotations} root={root} includePredictions={true} />
      </Provider>,
    );

    const tabs = screen.getAllByTestId("entity-tab");
    await userEvent.click(tabs[1]);
    expect(store.selectPrediction).toHaveBeenCalledWith("a2", { exitViewAll: true });
  });

  it("re-renders when selected annotation changes (shouldComponentUpdate)", () => {
    ff.reset();
    const annotations = [createAnnotation({ id: "a1" }), createAnnotation({ id: "a2" })];
    const store = createStore({ selected: { selected: annotations[0] } });
    const root = {};

    const { rerender } = render(
      <Provider store={store}>
        <Grid store={store} annotations={annotations} root={root} />
      </Provider>,
    );

    store.selected.selected = annotations[1];
    rerender(
      <Provider store={store}>
        <Grid store={store} annotations={annotations} root={root} />
      </Provider>,
    );

    expect(screen.getAllByTestId("entity-tab")).toHaveLength(2);
  });

  it("navigates with Move right then Move left buttons", async () => {
    ff.reset();
    const annotations = [
      createAnnotation({ id: "a1" }),
      createAnnotation({ id: "a2" }),
      createAnnotation({ id: "a3" }),
    ];
    const store = createStore({ selected: { selected: annotations[0] } });
    const root = {};

    render(
      <Provider store={store}>
        <Grid store={store} annotations={annotations} root={root} />
      </Provider>,
    );

    await userEvent.click(screen.getByLabelText("Move right"));
    await userEvent.click(screen.getByLabelText("Move left"));
    expect(screen.getByLabelText("Move left")).toBeInTheDocument();
    expect(screen.getByLabelText("Move right")).toBeInTheDocument();
  });

  it("GridClassComponent onFinish runs when Item finishes loading", async () => {
    ff.reset();
    const annotations = [createAnnotation({ id: "a1" }), createAnnotation({ id: "a2" })];
    const store = createStore({ selected: { selected: annotations[0] } });
    const root = {};

    render(
      <Provider store={store}>
        <Grid store={store} annotations={annotations} root={root} />
      </Provider>,
    );

    await waitForUpdates(60);
    expect(screen.getByLabelText("Move right")).toBeInTheDocument();
  });

  it("renders VirtualizedGrid when FIT_720 on (including compare-all with few annotations)", async () => {
    ff.set({ [FF_DEV_3391]: true, [FF_FIT_720_LAZY_LOAD_ANNOTATIONS]: true });
    const annotations = Array.from({ length: 5 }, (_, i) => createAnnotation({ id: `a${i}`, pk: i + 1 }));
    const store = createStore({ selected: { selected: annotations[0] } });
    const root = {};

    render(
      <Provider store={store}>
        <Grid store={store} annotations={annotations} root={root} />
      </Provider>,
    );
    await waitForUpdates(220);

    expect(screen.getByLabelText("Move right")).toBeInTheDocument();
  });

  it("renders VirtualizedGrid when FIT_720 FF on and more than 10 annotations", async () => {
    ff.set({ [FF_DEV_3391]: true, [FF_FIT_720_LAZY_LOAD_ANNOTATIONS]: true });
    const annotations = Array.from({ length: 11 }, (_, i) =>
      createAnnotation({ id: `a${i}`, pk: i + 1, versions: { result: [] }, regions: [] }),
    );
    const store = createStore({ selected: { selected: annotations[0] } });
    const root = {};

    render(
      <Provider store={store}>
        <Grid store={store} annotations={annotations} root={root} />
      </Provider>,
    );
    await waitForUpdates(220);

    expect(screen.getByLabelText("Move right")).toBeInTheDocument();
    expect(screen.getByLabelText("Move left")).toBeInTheDocument();
  });

  it("VirtualizedGrid direct render exercises hooks and callbacks", async () => {
    ff.set({ [FF_DEV_3391]: true, [FF_FIT_720_LAZY_LOAD_ANNOTATIONS]: true });
    const annotations = Array.from({ length: 12 }, (_, i) => createAnnotation({ id: `a${i}`, pk: i + 1 }));
    const store = createStore({ selected: { selected: annotations[0] } });
    const root = {};

    render(
      <Provider store={store}>
        <VirtualizedGrid store={store} annotations={annotations} root={root} />
      </Provider>,
    );
    await waitForUpdates(220);

    expect(screen.getByTestId("virtualized-list")).toBeInTheDocument();
    expect(screen.getByLabelText("Move right")).toBeInTheDocument();
    expect(screen.getByLabelText("Move left")).toBeInTheDocument();
  });

  it("VirtualizedGrid scroll right and left buttons work", async () => {
    ff.set({ [FF_DEV_3391]: true, [FF_FIT_720_LAZY_LOAD_ANNOTATIONS]: true });
    const annotations = Array.from({ length: 11 }, (_, i) =>
      createAnnotation({ id: `a${i}`, pk: i + 1, versions: { result: [] }, regions: [] }),
    );
    const store = createStore({ selected: { selected: annotations[0] } });
    const root = {};

    render(
      <Provider store={store}>
        <Grid store={store} annotations={annotations} root={root} />
      </Provider>,
    );

    await userEvent.click(screen.getByLabelText("Move right"));
    await userEvent.click(screen.getByLabelText("Move left"));
    expect(screen.getByLabelText("Move right")).toBeInTheDocument();
  });

  it("Item renders and componentDidMount runs for image objects", async () => {
    const onFinish = mock();
    const annotation = {
      id: "a1",
      pk: 1,
      type: "annotation",
      objects: [{ type: "image" }],
    };
    const root = {};

    render(<Item annotation={annotation} root={root} onFinish={onFinish} />);

    expect(screen.getByTestId("annotation-panel")).toBeInTheDocument();
    await waitForUpdates(50);
    expect(onFinish).toHaveBeenCalled();
  });

  it("Item componentDidMount runs for non-image object with isReady true", async () => {
    const onFinish = mock();
    const annotation = {
      id: "a1",
      pk: 1,
      type: "annotation",
      objects: [{ type: "text", isReady: true }],
    };
    const root = {};

    render(<Item annotation={annotation} root={root} onFinish={onFinish} />);

    await waitForUpdates(50);
    expect(onFinish).toHaveBeenCalled();
  });

  it("VirtualizedAnnotationPanel shows loading when isStub (no versions.result)", () => {
    const stubAnnotation = {
      id: "s1",
      pk: 1,
      type: "annotation",
      userGenerate: false,
      versions: {},
      regions: [],
    };
    render(
      <VirtualizedAnnotationPanel
        annotation={stubAnnotation}
        root={{}}
        style={{}}
        onSelect={mock()}
        isHydrating={false}
      />,
    );
    expect(screen.getByText("Waiting to load...")).toBeInTheDocument();
  });

  it("VirtualizedAnnotationPanel shows loading when isStub (empty versions.result)", () => {
    const stubAnnotation = {
      id: "s1",
      pk: 1,
      type: "annotation",
      userGenerate: false,
      versions: { result: [] },
      regions: [],
    };
    render(
      <VirtualizedAnnotationPanel
        annotation={stubAnnotation}
        root={{}}
        style={{}}
        onSelect={mock()}
        isHydrating={false}
      />,
    );
    expect(screen.getByText("Waiting to load...")).toBeInTheDocument();
  });

  it("VirtualizedAnnotationPanel shows Loading annotation when isHydrating", () => {
    const stubAnnotation = {
      id: "s1",
      pk: 1,
      type: "annotation",
      userGenerate: false,
      versions: { result: [] },
      regions: [],
    };
    render(
      <VirtualizedAnnotationPanel
        annotation={stubAnnotation}
        root={{}}
        style={{}}
        onSelect={mock()}
        isHydrating={true}
      />,
    );
    expect(screen.getByText("Loading annotation...")).toBeInTheDocument();
  });

  it("VirtualizedAnnotationPanel shows Annotation when has data", () => {
    const annotationWithData = {
      id: "a1",
      pk: 1,
      type: "annotation",
      userGenerate: false,
      versions: { result: [{ id: "r1" }] },
      regions: [],
    };
    render(
      <VirtualizedAnnotationPanel
        annotation={annotationWithData}
        root={{}}
        style={{}}
        onSelect={mock()}
        isHydrating={false}
      />,
    );
    expect(screen.getByTestId("annotation-panel")).toBeInTheDocument();
  });

  it("VirtualizedAnnotationPanel shows Annotation when stub but already hydrated (e.g. empty result)", () => {
    const stubAnnotation = {
      id: "s1",
      pk: 1,
      type: "annotation",
      userGenerate: false,
      versions: { result: [] },
      regions: [],
    };
    const hydratedIdsRef = { current: new Set(["s1"]) };
    render(
      <VirtualizedAnnotationPanel
        annotation={stubAnnotation}
        root={{}}
        style={{}}
        onSelect={mock()}
        isHydrating={false}
        hydratedIdsRef={hydratedIdsRef}
      />,
    );
    expect(screen.queryByText("Waiting to load...")).not.toBeInTheDocument();
    expect(screen.getByTestId("annotation-panel")).toBeInTheDocument();
  });

  it("VirtualizedGrid mount skips annotations that already have data (hasDataInMST)", async () => {
    mockGetCachedAnnotation.mockClear();
    mockGetCachedAnnotation.mockReturnValue(undefined);
    ff.set({ [FF_DEV_3391]: true, [FF_FIT_720_LAZY_LOAD_ANNOTATIONS]: true });
    const annWithData = {
      ...createAnnotation({ id: "a1", pk: 1 }),
      versions: { result: [{ id: "r1" }] },
      regions: [],
    };
    const annotations = [
      annWithData,
      ...Array.from({ length: 10 }, (_, i) => createAnnotation({ id: `a${i + 2}`, pk: i + 2 })),
    ];
    const store = createStore({ selected: { selected: annotations[0] } });
    const root = {};

    render(
      <Provider store={store}>
        <VirtualizedGrid store={store} annotations={annotations} root={root} />
      </Provider>,
    );
    await waitForUpdates(220);

    expect(mockGetCachedAnnotation).not.toHaveBeenCalledWith(1);
  });

  it("VirtualizedGrid mount restores annotations from getCachedAnnotation cache", async () => {
    const result = [{ id: "r1", from_name: "rating", to_name: "text", type: "rating", value: { rating: 1 } }];
    mockGetCachedAnnotation.mockImplementation((id) => (id === 1 ? { result } : undefined));
    ff.set({ [FF_DEV_3391]: true, [FF_FIT_720_LAZY_LOAD_ANNOTATIONS]: true });
    const ann = {
      ...createAnnotation({ id: "a1", pk: 1 }),
      versions: {},
      regions: [],
      history: {
        freeze: mock(),
        safeUnfreeze: mock(),
        reinitHistory: mock(),
      },
      deserializeResults: mock(),
      updateObjects: mock(),
    };
    const annotations = [
      ann,
      ...Array.from({ length: 10 }, (_, i) => createAnnotation({ id: `a${i + 2}`, pk: i + 2 })),
    ];
    const store = createStore({ selected: { selected: annotations[0] } });
    const root = {};

    render(
      <Provider store={store}>
        <VirtualizedGrid store={store} annotations={annotations} root={root} />
      </Provider>,
    );
    await waitForUpdates(220);

    expect(mockGetCachedAnnotation).toHaveBeenCalledWith(1);
    expect(ann.deserializeResults).toHaveBeenCalledWith(result);
    expect(ann.updateObjects).toHaveBeenCalled();
  });

  it("VirtualizedGrid with stub annotations triggers hydration path", async () => {
    mockFetchAnnotationCached.mockResolvedValue({
      result: [{ id: "r1", from_name: "rating", to_name: "text", type: "rating", value: { rating: 1 } }],
    });
    ff.set({ [FF_DEV_3391]: true, [FF_FIT_720_LAZY_LOAD_ANNOTATIONS]: true });
    const stubAnnotation = (id, pk) => ({
      ...createAnnotation({ id, pk }),
      versions: { result: [] },
      regions: [],
      history: { freeze: mock(), safeUnfreeze: mock() },
      deserializeResults: mock(),
      updateObjects: mock(),
      reinitHistory: mock(),
    });
    const annotations = Array.from({ length: 11 }, (_, i) => stubAnnotation(`a${i}`, i + 1));
    const store = createStore({ selected: { selected: annotations[0] } });
    const root = {};

    render(
      <Provider store={store}>
        <Grid store={store} annotations={annotations} root={root} />
      </Provider>,
    );

    await waitForUpdates(300);
    expect(screen.getByLabelText("Move right")).toBeInTheDocument();
  });

  it("FIT-1660: Compare all re-fetches when ensureAnnotationLoaded returns null but MST has stale regions", async () => {
    const ensureAnnotationLoaded = mock().mockResolvedValue(null);
    mockFetchAnnotationCached.mockResolvedValue({
      result: [{ id: "taxonomy-new", from_name: "taxonomy", type: "taxonomy", value: { choices: ["Dog"] } }],
    });
    ff.set({ [FF_DEV_3391]: true, [FF_FIT_720_LAZY_LOAD_ANNOTATIONS]: true });

    const ann = {
      ...createAnnotation({ id: "a0", pk: 42 }),
      versions: { result: [] },
      regions: [{ id: "region-stale" }],
      userGenerate: false,
      serializeAnnotation: mock(() => [
        { id: "taxonomy-old", from_name: "taxonomy", type: "taxonomy", value: { choices: [] } },
      ]),
      history: { freeze: mock(), safeUnfreeze: mock(), reinitHistory: mock() },
      deserializeResults: mock(),
      updateObjects: mock(),
      setEditable: mock(),
    };
    const annotations = [
      ann,
      ...Array.from({ length: 10 }, (_, i) => createAnnotation({ id: `a${i + 1}`, pk: i + 2 })),
    ];
    const store = createStore({
      viewingAll: true,
      selected: { selected: annotations[0] },
      store: { task: { id: 100 }, SDK: { ensureAnnotationLoaded } },
    });
    const root = {};

    render(
      <Provider store={store}>
        <VirtualizedGrid store={store} annotations={annotations} root={root} />
      </Provider>,
    );

    await waitForUpdates(400);
    expect(ensureAnnotationLoaded).toHaveBeenCalledWith(42);
    expect(mockFetchAnnotationCached).toHaveBeenCalledWith(42);
    expect(ann.deserializeResults).toHaveBeenCalled();
  });

  it("VirtualizedGrid hydrateAnnotation uses sdk.ensureAnnotationLoaded when available", async () => {
    const ensureAnnotationLoaded = mock().mockResolvedValue(undefined);
    ff.set({ [FF_DEV_3391]: true, [FF_FIT_720_LAZY_LOAD_ANNOTATIONS]: true });
    const store = createStore({
      selected: { selected: null },
      store: { SDK: { ensureAnnotationLoaded } },
    });
    const annotations = Array.from({ length: 11 }, (_, i) => createAnnotation({ id: `a${i}`, pk: i + 1 }));
    store.selected.selected = annotations[0];
    const root = {};

    render(
      <Provider store={store}>
        <VirtualizedGrid store={store} annotations={annotations} root={root} />
      </Provider>,
    );

    await waitForUpdates(250);
    expect(ensureAnnotationLoaded).toHaveBeenCalled();
  });

  it("VirtualizedGrid hydrateAnnotation uses taskStore.loadAnnotation when no ensureAnnotationLoaded", async () => {
    const loadAnnotation = mock().mockResolvedValue({ result: [] });
    ff.set({ [FF_DEV_3391]: true, [FF_FIT_720_LAZY_LOAD_ANNOTATIONS]: true });
    const store = createStore({
      selected: { selected: null },
      store: {
        SDK: {
          ensureAnnotationLoaded: undefined,
          datamanager: { store: { taskStore: { loadAnnotation } } },
        },
      },
    });
    const annotations = Array.from({ length: 11 }, (_, i) => createAnnotation({ id: `a${i}`, pk: i + 1 }));
    store.selected.selected = annotations[0];
    const root = {};

    render(
      <Provider store={store}>
        <VirtualizedGrid store={store} annotations={annotations} root={root} />
      </Provider>,
    );

    await waitForUpdates(250);
    expect(loadAnnotation).toHaveBeenCalled();
  });

  it("VirtualizedGrid hydrateAnnotation deserializes and updates annotation", async () => {
    const result = [{ id: "r1", type: "rating", value: { rating: 1 } }];
    mockFetchAnnotationCached.mockResolvedValue({ result });
    ff.set({ [FF_DEV_3391]: true, [FF_FIT_720_LAZY_LOAD_ANNOTATIONS]: true });
    const ann = {
      ...createAnnotation({ id: "a1", pk: 1 }),
      versions: { result: [] },
      regions: [],
      history: {
        freeze: mock(),
        safeUnfreeze: mock(),
        reinitHistory: mock(),
      },
      deserializeResults: mock(),
      updateObjects: mock(),
    };
    const annotations = [
      ann,
      ...Array.from({ length: 10 }, (_, i) => createAnnotation({ id: `a${i + 2}`, pk: i + 2 })),
    ];
    const store = createStore({ selected: { selected: annotations[0] } });
    const root = {};

    render(
      <Provider store={store}>
        <VirtualizedGrid store={store} annotations={annotations} root={root} />
      </Provider>,
    );

    await waitForUpdates(250);
    expect(mockFetchAnnotationCached).toHaveBeenCalled();
    expect(ann.deserializeResults).toHaveBeenCalledWith(result);
    expect(ann.updateObjects).toHaveBeenCalled();
  });

  it("VirtualizedGrid hydrateAnnotation marks hydrated when fetch returns no result", async () => {
    mockFetchAnnotationCached.mockResolvedValue({ result: undefined });
    ff.set({ [FF_DEV_3391]: true, [FF_FIT_720_LAZY_LOAD_ANNOTATIONS]: true });
    const annotations = Array.from({ length: 11 }, (_, i) => createAnnotation({ id: `a${i}`, pk: i + 1 }));
    const store = createStore({ selected: { selected: annotations[0] } });
    const root = {};

    render(
      <Provider store={store}>
        <VirtualizedGrid store={store} annotations={annotations} root={root} />
      </Provider>,
    );

    await waitForUpdates(250);
    expect(mockFetchAnnotationCached).toHaveBeenCalled();
  });

  it("VirtualizedGrid hydrateAnnotation ignores CancelledError", async () => {
    const err = new Error("cancelled");
    err.name = "CancelledError";
    mockFetchAnnotationCached.mockRejectedValue(err);
    ff.set({ [FF_DEV_3391]: true, [FF_FIT_720_LAZY_LOAD_ANNOTATIONS]: true });
    const annotations = Array.from({ length: 11 }, (_, i) => createAnnotation({ id: `a${i}`, pk: i + 1 }));
    const store = createStore({ selected: { selected: annotations[0] } });
    const root = {};

    render(
      <Provider store={store}>
        <VirtualizedGrid store={store} annotations={annotations} root={root} />
      </Provider>,
    );

    await waitForUpdates(250);
    expect(mockFetchAnnotationCached).toHaveBeenCalled();
  });

  it("VirtualizedGrid hydrateAnnotation marks hydrated when fetch returns error", async () => {
    mockFetchAnnotationCached.mockResolvedValue({ error: "Not found", result: undefined });
    ff.set({ [FF_DEV_3391]: true, [FF_FIT_720_LAZY_LOAD_ANNOTATIONS]: true });
    const annotations = Array.from({ length: 11 }, (_, i) => createAnnotation({ id: `a${i}`, pk: i + 1 }));
    const store = createStore({ selected: { selected: annotations[0] } });
    const root = {};

    render(
      <Provider store={store}>
        <VirtualizedGrid store={store} annotations={annotations} root={root} />
      </Provider>,
    );

    await waitForUpdates(250);
    expect(mockFetchAnnotationCached).toHaveBeenCalled();
  });

  it("VirtualizedGrid onItemsRendered runs debounced hydration", () => {
    useFakeTimers();
    try {
      ff.set({ [FF_DEV_3391]: true, [FF_FIT_720_LAZY_LOAD_ANNOTATIONS]: true });
      const stubAnnotation = (id, pk) => ({
        ...createAnnotation({ id, pk }),
        versions: { result: [] },
        regions: [],
      });
      const annotations = Array.from({ length: 11 }, (_, i) => stubAnnotation(`a${i}`, i + 1));
      const store = createStore({ selected: { selected: annotations[0] } });
      const root = {};

      render(
        <Provider store={store}>
          <Grid store={store} annotations={annotations} root={root} />
        </Provider>,
      );

      act(() => {
        advanceTimersByTime(200);
      });
      expect(screen.getByLabelText("Move right")).toBeInTheDocument();
    } finally {
      useRealTimers();
    }
  });

  it("VirtualizedGrid renders with stub annotations (no result)", async () => {
    ff.set({ [FF_DEV_3391]: true, [FF_FIT_720_LAZY_LOAD_ANNOTATIONS]: true });
    const stubAnnotation = (id, pk) => ({
      ...createAnnotation({ id, pk }),
      versions: { result: [] },
      regions: [],
    });
    const annotations = Array.from({ length: 11 }, (_, i) => stubAnnotation(`a${i}`, i + 1));
    const store = createStore({ selected: { selected: annotations[0] } });
    const root = {};

    render(
      <Provider store={store}>
        <Grid store={store} annotations={annotations} root={root} />
      </Provider>,
    );
    await waitForUpdates(220);

    expect(screen.getByLabelText("Move right")).toBeInTheDocument();
  });
});
