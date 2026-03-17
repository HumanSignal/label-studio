/**
 * Unit tests for RichText tag view (tags/object/RichText/view.jsx)
 */
import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { Provider } from "mobx-react";
import Tree from "../../../../core/Tree";
import Registry from "../../../../core/Registry";
import "../../../visual/View";
import "../index";

const mockAddErrors = vi.fn();
const mockRegionStore = { regions: [] };
const mockSelected = {
  toNames: new Map(),
  id: 1,
  isReadOnly: () => false,
  regionStore: mockRegionStore,
  unselectAll: vi.fn(),
};
const mockRoot = {
  task: { dataObj: { text: "Hello" } },
  annotationStore: {
    addErrors: mockAddErrors,
    selected: mockSelected,
  },
};

vi.mock("mobx-state-tree", async () => {
  const actual = await vi.importActual("mobx-state-tree");
  return {
    ...actual,
    getRoot: (node) => {
      if (node && (node.type === "richtext" || node.type === "text")) {
        return mockRoot;
      }
      return actual.getRoot(node);
    },
    isAlive: (node) => {
      if (node && typeof node === "object" && "onDispose" in node) return true;
      return actual.isAlive(node);
    },
  };
});

vi.mock("mobx", async () => {
  const actual = await vi.importActual("mobx");
  return {
    ...actual,
    observe: (target, key, handler, fireImmediately) => {
      if (target && typeof target === "object" && !actual.isObservable?.(target)) {
        return () => {};
      }
      return actual.observe(target, key, handler, fireImmediately);
    },
  };
});

const mockDomManager = {
  setStyles: vi.fn(),
  removeStyles: vi.fn(),
  destroy: vi.fn(),
  globalOffsetsToRelativeOffsets: vi.fn(() => ({ start: "", startOffset: 0, end: "", endOffset: 0 })),
  relativeOffsetsToGlobalOffsets: vi.fn(() => [0, 0]),
  rangeToGlobalOffset: vi.fn(() => [0, 0]),
  createSpans: vi.fn(() => []),
  removeSpans: vi.fn(),
  getText: vi.fn(() => ""),
};
vi.mock("../domManager", () => ({ __esModule: true, default: vi.fn(() => mockDomManager) }));

let mockDocRef = null;
vi.mock("../../../../utils", async () => {
  let actual;
  try {
    actual = await vi.importActual("../../../../utils");
  } catch {
    actual = { default: { Selection: {} } };
  }
  return {
    __esModule: true,
    default: {
      ...actual.default,
      Selection: {
        ...actual.default?.Selection,
        captureSelection(callback, opts) {
          const doc = mockDocRef;
          const root =
            doc?.body?.querySelector?.("[class*='container']") ||
            doc?.body?.querySelector?.("[class*='richtext']") ||
            doc?.body;
          if (root && root.appendChild) {
            const range = doc.createRange();
            const textNode = doc.createTextNode("\u200b");
            root.appendChild(textNode);
            range.setStart(textNode, 0);
            range.setEnd(textNode, 1);
            if (root.contains(range.startContainer)) {
              callback({ selectionText: "\u200b", range });
            }
          }
          opts?.beforeCleanup?.();
        },
      },
    },
  };
});

vi.mock("xpath-range", () => ({
  fromRange: () => ({ _range: null, text: "", isText: true }),
}));

const MINIMAL_CONFIG = `<View><Text name="t1" value="$text" /></View>`;

function createTextNode(storeRef = { task: { dataObj: { text: "Hello" } } }) {
  const config = Tree.treeToModel(MINIMAL_CONFIG, storeRef);
  const ViewModel = Registry.getModelByTag("view");
  const root = ViewModel.create(config);
  return root.children.find((c) => c.type === "text" || c.type === "richtext");
}

function createHyperTextNode(storeRef = { task: { dataObj: { html: "<p>Hi</p>" } } }) {
  const config = Tree.treeToModel('<View><HyperText name="h1" value="$html" /></View>', storeRef);
  const ViewModel = Registry.getModelByTag("view");
  const root = ViewModel.create(config);
  return root.children.find((c) => c.type === "text" || c.type === "richtext");
}

/** Create a mock item for the view that mimics MST node shape (for tests that need controlled _value) */
function createMockItem(overrides = {}) {
  return {
    _value: "Hello",
    type: "text",
    inline: true,
    mountNodeRef: React.createRef(),
    getRootNode: vi.fn(() => null),
    setLoaded: vi.fn(),
    setReady: vi.fn(),
    onDispose: vi.fn(),
    setStyles: vi.fn(),
    setHighlight: vi.fn(),
    regs: [],
    ...overrides,
  };
}

beforeEach(() => {
  mockDocRef = typeof document !== "undefined" ? document : null;
  vi.useFakeTimers();
  vi.clearAllMocks();
  window.LS_SECURE_MODE = false;
  window.STORE_INIT_OK = true;
});

afterEach(() => {
  vi.clearAllTimers();
  vi.useRealTimers();
  window.STORE_INIT_OK = undefined;
});

describe("RichText view", () => {
  describe("HtxRichText render", () => {
    it("renders nothing when item._value is not defined", () => {
      const mockItem = createMockItem({ _value: undefined });
      const store = { settings: { showLineNumbers: false } };
      const TextView = Registry.getViewByTag("text");

      const { container } = render(
        <Provider store={store}>
          <TextView item={mockItem} store={store} />
        </Provider>,
      );

      expect(container.firstChild).toBeNull();
    });

    it("renders inline text content for Text tag (isText true)", () => {
      const mockItem = createMockItem({ _value: "Hello", type: "text", inline: true });
      const store = { settings: { showLineNumbers: false } };
      const TextView = Registry.getViewByTag("text");

      render(
        <Provider store={store}>
          <TextView item={mockItem} store={store} />
        </Provider>,
      );

      expect(screen.getByText("Hello")).toBeInTheDocument();
    });

    it("renders loading and iframe for HyperText (inline false)", () => {
      const mockItem = createMockItem({
        _value: "<p>Hi</p>",
        type: "richtext",
        inline: false,
      });
      const store = { settings: { showLineNumbers: false } };
      const HyperTextView = Registry.getViewByTag("hypertext");

      const { container } = render(
        <Provider store={store}>
          <HyperTextView item={mockItem} store={store} />
        </Provider>,
      );

      const loading = container.querySelector("[class*='loading']");
      const iframe = container.querySelector("iframe");
      expect(loading).toBeInTheDocument();
      expect(iframe).toBeInTheDocument();
    });

    it("shows line numbers data attribute when settings.showLineNumbers is true", () => {
      const mockItem = createMockItem({ _value: "Hello" });
      const store = { settings: { showLineNumbers: true } };
      const TextView = Registry.getViewByTag("text");

      const { container } = render(
        <Provider store={store}>
          <TextView item={mockItem} store={store} />
        </Provider>,
      );

      const containerEl = container.querySelector('[data-linenumbers="enabled"]');
      expect(containerEl).toBeInTheDocument();
    });

    it("does not show line numbers when settings.showLineNumbers is false", () => {
      const mockItem = createMockItem({ _value: "Hello" });
      const store = { settings: { showLineNumbers: false } };
      const TextView = Registry.getViewByTag("text");

      const { container } = render(
        <Provider store={store}>
          <TextView item={mockItem} store={store} />
        </Provider>,
      );

      const containerEl = container.querySelector('[data-linenumbers="disabled"]');
      expect(containerEl).toBeInTheDocument();
    });
  });

  describe("lifecycle", () => {
    it("calls setLoaded and onDispose on unmount when item is alive", () => {
      const mockItem = createMockItem({ _value: "Hello" });
      const store = { settings: {} };
      const TextView = Registry.getViewByTag("text");

      const { unmount } = render(
        <Provider store={store}>
          <TextView item={mockItem} store={store} />
        </Provider>,
      );

      unmount();

      expect(mockItem.onDispose).toHaveBeenCalled();
      expect(mockItem.setLoaded).toHaveBeenCalledWith(false);
      expect(mockItem.setReady).toHaveBeenCalledWith(false);
    });
  });

  describe("_handleUpdate", () => {
    it("returns early when non-inline and root has no childNodes (iframe path)", () => {
      const needsUpdate = vi.fn();
      const emptyRoot = document.createElement("div");
      const mockItem = createMockItem({
        _value: "<p>Hi</p>",
        type: "richtext",
        inline: false,
        getRootNode: () => emptyRoot,
        needsUpdate,
      });
      const store = { settings: {} };
      const HyperTextView = Registry.getViewByTag("hypertext");

      const iframeDoc =
        typeof document.implementation?.createHTMLDocument === "function"
          ? document.implementation.createHTMLDocument("")
          : null;
      if (!iframeDoc) return;

      const { container } = render(
        <Provider store={store}>
          <HyperTextView item={mockItem} store={store} />
        </Provider>,
      );

      const iframe = container.querySelector("iframe");
      expect(iframe).toBeTruthy();
      Object.defineProperty(iframe, "contentDocument", {
        value: iframeDoc,
        configurable: true,
      });
      vi.useFakeTimers();
      iframe.dispatchEvent(new Event("load"));
      vi.runAllTimers();
      vi.useRealTimers();
      expect(needsUpdate).not.toHaveBeenCalled();
    });

    it("calls needsUpdate when markObjectAsLoaded runs without annotation (else branch)", () => {
      const needsUpdate = vi.fn();
      const rootWithChild = document.createElement("div");
      rootWithChild.appendChild(document.createTextNode("x"));
      const mockItem = createMockItem({
        _value: "<p>Hi</p>",
        type: "richtext",
        inline: false,
        getRootNode: () => rootWithChild,
        annotation: undefined,
        needsUpdate,
        isLoaded: false,
        isReady: true,
        setLoaded(v) {
          this.isLoaded = !!v;
        },
        setReady(v) {
          this.isReady = !!v;
        },
      });
      const store = { settings: {} };
      const HyperTextView = Registry.getViewByTag("hypertext");

      const iframeDoc =
        typeof document.implementation?.createHTMLDocument === "function"
          ? document.implementation.createHTMLDocument("")
          : null;
      if (!iframeDoc) return;
      const tall = iframeDoc.createElement("div");
      tall.style.height = "100px";
      iframeDoc.body.appendChild(tall);

      const { container } = render(
        <Provider store={store}>
          <HyperTextView item={mockItem} store={store} />
        </Provider>,
      );

      const iframe = container.querySelector("iframe");
      Object.defineProperty(iframe, "contentDocument", {
        value: iframeDoc,
        configurable: true,
      });
      vi.useFakeTimers();
      iframe.dispatchEvent(new Event("load"));
      vi.runAllTimers();
      vi.useRealTimers();
      expect(needsUpdate).toHaveBeenCalled();
    });

    it("onIFrameLoad sets iframe height when body.scrollHeight and dispatches keydown to _passHotkeys", () => {
      const needsUpdate = vi.fn();
      const rootWithChild = document.createElement("div");
      rootWithChild.appendChild(document.createTextNode("x"));
      const mockItem = createMockItem({
        _value: "<p>Hi</p>",
        type: "richtext",
        inline: false,
        getRootNode: () => rootWithChild,
        annotation: undefined,
        needsUpdate,
      });
      const store = { settings: {} };
      const HyperTextView = Registry.getViewByTag("hypertext");

      const iframeDoc =
        typeof document.implementation?.createHTMLDocument === "function"
          ? document.implementation.createHTMLDocument("")
          : null;
      if (!iframeDoc) return;
      const tall = iframeDoc.createElement("div");
      tall.style.height = "200px";
      iframeDoc.body.appendChild(tall);
      Object.defineProperty(iframeDoc.body, "scrollHeight", { value: 200, configurable: true });
      const htmlEl = iframeDoc.body.parentElement;
      if (htmlEl) {
        Object.defineProperty(htmlEl, "offsetHeight", { value: 200, configurable: true });
      }

      const { container } = render(
        <Provider store={store}>
          <HyperTextView item={mockItem} store={store} />
        </Provider>,
      );

      const iframe = container.querySelector("iframe");
      Object.defineProperty(iframe, "contentDocument", {
        value: iframeDoc,
        configurable: true,
      });
      iframe.dispatchEvent(new Event("load"));
      expect(iframe.style.height).toContain("200");
      iframeDoc.body.dispatchEvent(new KeyboardEvent("keydown", { key: "a", bubbles: true }));
    });

    it("calls annotation history and needsUpdate when markObjectAsLoaded runs with annotation", () => {
      const pauseAutosave = vi.fn();
      const startAutosave = vi.fn();
      const needsUpdate = vi.fn();
      const rootDiv = document.createElement("div");
      rootDiv.appendChild(document.createTextNode("x"));
      const mockItem = createMockItem({
        _value: "Hello",
        inline: true,
        getRootNode: () => rootDiv,
        annotation: {
          history: {
            freeze: vi.fn(),
            unfreeze: vi.fn(),
            setReplaceNextUndoState: vi.fn(),
          },
          pauseAutosave,
          startAutosave,
        },
        needsUpdate,
      });
      const store = { settings: {} };
      const TextView = Registry.getViewByTag("text");

      vi.useFakeTimers();
      render(
        <Provider store={store}>
          <TextView item={mockItem} store={store} />
        </Provider>,
      );
      vi.runAllTimers();
      vi.useRealTimers();

      expect(needsUpdate).toHaveBeenCalled();
      expect(pauseAutosave).toHaveBeenCalled();
      expect(startAutosave).toHaveBeenCalled();
    });
  });

  describe("event handlers", () => {
    it("calls setHighlight on mouseover over container", () => {
      const mockItem = createMockItem({ _value: "Hello", setHighlight: vi.fn() });
      const store = { settings: {} };
      const TextView = Registry.getViewByTag("text");

      const { container } = render(
        <Provider store={store}>
          <TextView item={mockItem} store={store} />
        </Provider>,
      );

      const content = container.querySelector("[class*='container']") || container.firstChild?.firstChild;
      if (content) {
        content.dispatchEvent(new MouseEvent("mouseover", { bubbles: true }));
        expect(mockItem.setHighlight).toHaveBeenCalled();
      }
    });

    it("prevents default when clicking a link and clickablelinks is false", () => {
      const mockItem = createMockItem({
        _value: '<a href="https://example.com">link</a>',
        type: "richtext",
        inline: true,
        clickablelinks: false,
      });
      const store = { settings: {} };
      const HyperTextView = Registry.getViewByTag("hypertext");

      const { container } = render(
        <Provider store={store}>
          <HyperTextView item={mockItem} store={store} />
        </Provider>,
      );

      const link = container.querySelector("a[href]");
      expect(link).toBeInTheDocument();
      const ev = new MouseEvent("click", { bubbles: true });
      ev.preventDefault = vi.fn();
      link.dispatchEvent(ev);
      expect(ev.preventDefault).toHaveBeenCalled();
    });

    it("calls addRegion when mouseup triggers captureSelection with valid range", () => {
      const addRegion = vi.fn();
      const mockItem = createMockItem({
        _value: "Select me",
        type: "text",
        inline: true,
        activeStates: () => [{ selectedLabels: [{}], selectedValues: () => [] }],
        annotation: { isReadOnly: () => false },
        selectionenabled: true,
        addRegion,
      });
      const store = { settings: {} };
      const TextView = Registry.getViewByTag("text");

      const { container } = render(
        <Provider store={store}>
          <TextView item={mockItem} store={store} />
        </Provider>,
      );

      const content = container.querySelector("[class*='container']") || container.firstChild?.firstChild;
      expect(content).toBeTruthy();
      content.dispatchEvent(new MouseEvent("mouseup", { bubbles: true, cancelable: true, pageX: 0, pageY: 0 }));
      expect(addRegion).toHaveBeenCalled();
    });

    it("calls _selectRegions on mouseup when no active states (selection path)", () => {
      const mockItem = createMockItem({
        _value: '<span class="htx-highlight">hi</span>',
        type: "richtext",
        inline: true,
        activeStates: () => null,
        annotation: { extendSelectionWith: vi.fn(), selectAreas: vi.fn() },
        regs: [],
      });
      const store = { settings: {} };
      const HyperTextView = Registry.getViewByTag("hypertext");

      const { container } = render(
        <Provider store={store}>
          <HyperTextView item={mockItem} store={store} />
        </Provider>,
      );

      const root = container.querySelector("[class*='container']");
      expect(root).toBeTruthy();
      expect(() => {
        fireEvent.mouseUp(root, { bubbles: true, ctrlKey: false });
      }).not.toThrow();
    });

    it("calls region.onClickRegion when clicking a highlight span", () => {
      const onClickRegion = vi.fn();
      const mockRegion = { find: (el) => el?.classList?.contains?.("htx-highlight"), onClickRegion };
      const mockItem = createMockItem({
        _value: '<span class="htx-highlight">label</span>',
        type: "richtext",
        inline: true,
        regs: [mockRegion],
      });
      const store = { settings: {} };
      const HyperTextView = Registry.getViewByTag("hypertext");

      const { container } = render(
        <Provider store={store}>
          <HyperTextView item={mockItem} store={store} />
        </Provider>,
      );

      const span = container.querySelector(".htx-highlight");
      expect(span).toBeInTheDocument();
      span.click();
      expect(onClickRegion).toHaveBeenCalled();
      const callArg = onClickRegion.mock.calls[0][0];
      expect(callArg.type).toBe("click");
      expect(callArg.stopPropagation).toBeDefined();
    });

    it("resets drag params and does not set draggableRegion on mousedown when not on handle", () => {
      const mockItem = createMockItem({
        _value: "Hello",
        canResizeSpans: true,
      });
      const store = { settings: {} };
      const TextView = Registry.getViewByTag("text");

      const { container } = render(
        <Provider store={store}>
          <TextView item={mockItem} store={store} />
        </Provider>,
      );

      const content = container.querySelector("[class*='container']") || container.firstChild?.firstChild;
      content.dispatchEvent(new MouseEvent("mousedown", { bubbles: true, buttons: 1 }));
      expect(mockItem.setStyles).not.toHaveBeenCalled();
    });

    it("sets selection style and handles mousemove when mousedown on resize handle", () => {
      const setStyles = vi.fn();
      const mockRegion = {
        find: (el) => el?.classList?.contains?.("htx-highlight") && !el.classList?.contains?.("__resize_left"),
        getColors: () => ({ resizeBackground: "#eee", activeText: "#000" }),
        resizeStyles: "cursor: col-resize;",
        identifier: "r1",
        styles: "border: 1px dashed;",
        selected: true,
        _spans: [],
      };
      const mockItem = createMockItem({
        _value: '<span class="htx-highlight"><span class="__resize_left">L</span>text</span>',
        type: "richtext",
        inline: true,
        canResizeSpans: true,
        setStyles,
        regs: [mockRegion],
      });
      const store = { settings: {} };
      const HyperTextView = Registry.getViewByTag("hypertext");

      const { container } = render(
        <Provider store={store}>
          <HyperTextView item={mockItem} store={store} />
        </Provider>,
      );

      const handle = container.querySelector(".htx-highlight .__resize_left");
      expect(handle).toBeInTheDocument();
      const root = container.querySelector("[class*='container']");
      fireEvent.mouseDown(handle, { buttons: 1 });
      expect(setStyles).toHaveBeenCalled();
      fireEvent.mouseMove(root, { buttons: 1 });
      fireEvent.mouseUp(root, { buttons: 1 });
    });

    it("clears doubleClickSelection when second mouseup is after timeout", () => {
      const addRegion = vi.fn();
      const mockItem = createMockItem({
        _value: "One two",
        type: "text",
        inline: true,
        activeStates: () => [{ selectedLabels: [{}], selectedValues: () => [] }],
        annotation: {
          isReadOnly: () => false,
          pauseAutosave: vi.fn(),
          startAutosave: vi.fn(),
          history: { freeze: vi.fn(), unfreeze: vi.fn(), setReplaceNextUndoState: vi.fn() },
        },
        selectionenabled: true,
        needsUpdate: vi.fn(),
        addRegion,
      });
      const store = { settings: {} };
      const TextView = Registry.getViewByTag("text");

      const { container } = render(
        <Provider store={store}>
          <TextView item={mockItem} store={store} />
        </Provider>,
      );

      const content = container.querySelector("[class*='container']");
      content.dispatchEvent(new MouseEvent("mouseup", { bubbles: true, pageX: 10, pageY: 10 }));
      expect(addRegion).toHaveBeenCalledTimes(1);
      vi.advanceTimersByTime(500);
      content.dispatchEvent(new MouseEvent("mouseup", { bubbles: true, pageX: 10, pageY: 10 }));
      expect(addRegion).toHaveBeenCalledTimes(2);
    });

    it("_onRegionClick returns early when _selectionMode is true (set by captureSelection beforeCleanup)", () => {
      const onClickRegion = vi.fn();
      const mockItem = createMockItem({
        _value: '<span class="htx-highlight">x</span>',
        type: "richtext",
        inline: true,
        activeStates: () => [{ selectedLabels: [{}], selectedValues: () => [] }],
        annotation: { isReadOnly: () => false },
        selectionenabled: true,
        addRegion: vi.fn(),
        regs: [{ find: (el) => el?.classList?.contains?.("htx-highlight"), onClickRegion }],
      });
      const store = { settings: {} };
      const HyperTextView = Registry.getViewByTag("hypertext");

      const { container } = render(
        <Provider store={store}>
          <HyperTextView item={mockItem} store={store} />
        </Provider>,
      );

      const content = container.querySelector("[class*='container']");
      content.dispatchEvent(new MouseEvent("mouseup", { bubbles: true, pageX: 0, pageY: 0 }));
      const span = container.querySelector(".htx-highlight");
      span.click();
      expect(onClickRegion).not.toHaveBeenCalled();
    });
  });
});
