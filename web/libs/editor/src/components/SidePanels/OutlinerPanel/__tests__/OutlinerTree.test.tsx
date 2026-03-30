import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { Provider } from "mobx-react";
import { FF_DEV_2755 } from "../../../../utils/feature-flags";
import { OutlinerTree } from "../OutlinerTree";
import * as bemModule from "../../../../utils/bem";
import * as registryModule from "../../../../core/Registry";
import * as chromaModule from "chroma-js";
import * as regionLabelModule from "../RegionLabel";
import * as nodeModule from "../../../Node/Node";
import * as lockButtonModule from "../../Components/LockButton";
import * as regionContextMenuModule from "../../Components/RegionContextMenu";
import * as regionControlButtonModule from "../../Components/RegionControlButton";
import * as uiModule from "@humansignal/ui";
import * as iconsModule from "@humansignal/icons";
import * as mobxReactModule from "mobx-react";
import * as resizeObserverModule from "../../../../utils/resize-observer";

const ff = mockFF();

(OutlinerTree as any).defaultProps = {
  ...((OutlinerTree as any).defaultProps ?? {}),
  store: { hasInterface: () => false },
};

function renderWithStore(ui: any) {
  return render(<Provider store={{ hasInterface: () => false }}>{ui}</Provider>);
}

const mockObserve = mock();
const mockUnobserve = mock();
const mockDisconnect = mock();
const mockResizeCallback = { current: null as ((entries: Array<{ contentRect: { height: number } }>) => void) | null };

beforeAll(() => {
  (global as any).ResizeObserver = class ResizeObserver {
    observe = mockObserve;
    unobserve = mockUnobserve;
    disconnect = mockDisconnect;
    constructor(callback: (entries: Array<{ contentRect: { height: number } }>) => void) {
      queueMicrotask(() => {
        callback([{ contentRect: { height: 400 } }]);
      });
    }
  };
});

beforeEach(() => {
  mockObserve.mockClear();
  mockUnobserve.mockClear();
  mockDisconnect.mockClear();

  spyOn(bemModule, "cn").mockImplementation((block: string) => ({
    elem: (elem: string) => ({
      mod: (_mods: Record<string, unknown>) => ({
        toClassName: () => `dm-${block}__${elem}`,
      }),
      toClassName: () => `dm-${block}__${elem}`,
    }),
    mod: () => ({
      toClassName: () => `dm-${block}`,
    }),
    toClassName: () => `dm-${block}`,
  }));

  spyOn(registryModule.default, "getPerRegionView").mockReturnValue(null);

  spyOn(chromaModule, "default").mockImplementation((style: string) => {
    const c = style ?? "#666";
    const chain: any = {
      css: () => c,
      alpha: () => chain,
    };
    return chain;
  });

  spyOn(regionLabelModule, "RegionLabel").mockImplementation(({ item }: { item: { type?: string } }) => (
    <span data-testid="region-label">{item?.type ?? "No Label"}</span>
  ));

  spyOn(nodeModule, "NodeIcon").mockImplementation(() => <span data-testid="node-icon" />);

  spyOn(lockButtonModule, "LockButton").mockImplementation(() => <span data-testid="lock-button" />);

  spyOn(regionContextMenuModule, "RegionContextMenu").mockImplementation(() => (
    <span data-testid="region-context-menu" />
  ));

  spyOn(regionControlButtonModule, "RegionControlButton").mockImplementation(({ children, ...props }: any) => (
    <button type="button" data-testid="region-control-button" {...props}>
      {children}
    </button>
  ));

  spyOn(uiModule, "Tooltip").mockImplementation(({ children }: any) => <span data-testid="tooltip">{children}</span>);

  spyOn(iconsModule, "IconArrow").mockImplementation(() => <span data-testid="icon-arrow" />);
  spyOn(iconsModule, "IconChevronLeft").mockImplementation(() => <span data-testid="icon-chevron-left" />);
  spyOn(iconsModule, "IconEyeClosed").mockImplementation(() => <span data-testid="icon-eye-closed" />);
  spyOn(iconsModule, "IconEyeOpened").mockImplementation(() => <span data-testid="icon-eye-opened" />);
  spyOn(iconsModule, "IconSparks").mockImplementation(() => <span data-testid="icon-sparks" />);
  spyOn(iconsModule, "IconWarning").mockImplementation(() => <span data-testid="icon-warning" />);

  spyOn(mobxReactModule, "observer").mockImplementation((C: any) => C);
  spyOn(mobxReactModule, "inject").mockImplementation(() => (C: any) => (props: any) => (
    <C {...props} store={{ hasInterface: () => false }} />
  ));

  spyOn(resizeObserverModule, "default").mockImplementation(function MockResizeObserver(callback: any) {
    mockResizeCallback.current = callback;
    queueMicrotask(() => {
      callback([{ contentRect: { height: 400 } }]);
    });
    return {
      observe: mockObserve,
      unobserve: mockUnobserve,
      disconnect: mockDisconnect,
    };
  } as any);
});

const defaultItem = {
  id: "r1",
  type: "rectangle",
  getOneColor: () => "#3366ff",
  hidden: false,
  isDrawing: false,
  locked: false,
  incomplete: false,
  annotation: null,
  selected: false,
  setHighlight: mock(),
  isReadOnly: () => false,
  hideable: true,
  highlighted: false,
  toggleHidden: mock(),
  setLocked: mock(),
  origin: undefined,
  score: undefined,
  text: undefined,
  perRegionDescControls: [],
  onSelectInOutliner: undefined,
  labeling: undefined,
};

function createMockRegions(overrides: Record<string, unknown> = {}, itemsOverride: any[] | null = null) {
  const items = itemsOverride ?? [{ ...defaultItem }];
  return {
    group: "manual",
    selection: { keys: [] as string[] },
    getRegionsTree: (processor: (item: any, idx: number) => any) => {
      const tree = items.map((item, idx) => {
        const result = processor(item, idx, false, null, undefined);
        return {
          ...result,
          item,
          children: [],
          isArea: true,
        };
      });
      return tree;
    },
    ...overrides,
  };
}

describe("OutlinerTree", () => {
  it("renders tree container and tree when regions provide getRegionsTree", async () => {
    const regions = createMockRegions();
    const { container } = renderWithStore(
      <OutlinerTree regions={regions} footer={null} store={{ hasInterface: () => false }} />,
    );

    await waitFor(() => {
      expect(container.querySelector(".dm-outliner-tree")).toBeInTheDocument();
    });
  });

  it("renders footer when footer prop is provided", async () => {
    const regions = createMockRegions();
    const footer = <div data-testid="outliner-footer">Footer content</div>;
    renderWithStore(<OutlinerTree regions={regions} footer={footer} store={{ hasInterface: () => false }} />);

    await waitFor(() => {
      expect(screen.getByTestId("outliner-footer")).toHaveTextContent("Footer content");
    });
  });

  it("uses ResizeObserver and sets height so Tree is rendered", async () => {
    const regions = createMockRegions();
    renderWithStore(<OutlinerTree regions={regions} footer={null} store={{ hasInterface: () => false }} />);

    await waitFor(() => {
      expect(mockObserve).toHaveBeenCalled();
    });
  });

  it("ResizeObserver early return when height unchanged", async () => {
    const regions = createMockRegions();
    renderWithStore(<OutlinerTree regions={regions} footer={null} store={{ hasInterface: () => false }} />);

    await waitFor(() => {
      expect(mockResizeCallback.current).toBeTruthy();
    });
    const callback = mockResizeCallback.current!;
    callback([{ contentRect: { height: 400 } }]);
    callback([{ contentRect: { height: 400 } }]);
  });

  it("renders tree with manual group (draggable)", async () => {
    const regions = createMockRegions({ group: "manual" });
    const { container } = renderWithStore(
      <OutlinerTree regions={regions} footer={null} store={{ hasInterface: () => false }} />,
    );

    await waitFor(() => {
      expect(container.querySelector(".dm-tree")).toBeInTheDocument();
    });
  });

  it("renders tree with label group", async () => {
    const regions = createMockRegions({ group: "label" });
    const { container } = renderWithStore(
      <OutlinerTree regions={regions} footer={null} store={{ hasInterface: () => false }} />,
    );

    await waitFor(() => {
      expect(container.querySelector(".dm-tree")).toBeInTheDocument();
    });
  });

  it("renders node with item text and incomplete warning", async () => {
    const items = [
      {
        ...defaultItem,
        text: "Sample region text",
        incomplete: true,
        isDrawing: true,
        type: "rectangle",
      },
    ];
    const regions = createMockRegions({}, items);
    const { container } = renderWithStore(
      <OutlinerTree regions={regions} footer={null} store={{ hasInterface: () => false }} />,
    );

    await waitFor(() => {
      expect(container.querySelector(".dm-outliner-tree")).toBeInTheDocument();
    });
    expect(container.textContent).toContain("Sample region text");
    expect(screen.getByTestId("icon-warning")).toBeInTheDocument();
  });

  it("renders with selected keys", async () => {
    const regions = createMockRegions({ selection: { keys: ["r1"] } });
    const { container } = renderWithStore(
      <OutlinerTree regions={regions} footer={null} store={{ hasInterface: () => false }} />,
    );

    await waitFor(() => {
      expect(container.querySelector(".dm-tree")).toBeInTheDocument();
    });
  });

  it("renders RegionControls and visibility button for hidden region", async () => {
    const items = [
      {
        ...defaultItem,
        hidden: true,
        type: "rectangle",
      },
    ];
    const regions = createMockRegions({}, items);
    const { container } = renderWithStore(
      <OutlinerTree regions={regions} footer={null} store={{ hasInterface: () => false }} />,
    );

    await waitFor(() => {
      expect(container.querySelector(".dm-tree")).toBeInTheDocument();
    });
    const visibilityButtons = screen.getAllByTestId("region-control-button");
    expect(visibilityButtons.length).toBeGreaterThan(0);
  });

  it("renders prediction origin and score in RegionControls", async () => {
    const items = [
      {
        ...defaultItem,
        origin: "prediction",
        score: 0.87,
      },
    ];
    const regions = createMockRegions({}, items);
    const { container } = renderWithStore(
      <OutlinerTree regions={regions} footer={null} store={{ hasInterface: () => false }} />,
    );

    await waitFor(() => {
      expect(container.querySelector(".dm-tree")).toBeInTheDocument();
    });
    expect(container.textContent).toContain("0.87");
    expect(screen.getByTestId("icon-sparks")).toBeInTheDocument();
  });

  it("calls setRef with null on unmount", async () => {
    const regions = createMockRegions();
    const { unmount } = renderWithStore(
      <OutlinerTree regions={regions} footer={null} store={{ hasInterface: () => false }} />,
    );

    await waitFor(() => {
      expect(mockObserve).toHaveBeenCalled();
    });
    unmount();
    expect(mockUnobserve).toHaveBeenCalled();
  });

  it("renders RootTitle with isGroup (no index for group node)", async () => {
    const items = [
      { ...defaultItem, id: "g1", type: "label" },
      { ...defaultItem, id: "r1", type: "rectangle" },
    ];
    const regions = {
      ...createMockRegions({}, items),
      getRegionsTree: (processor: (item: any, idx: number) => any) => {
        return items.map((item, idx) => {
          const result = processor(item, idx, false, null, undefined);
          return {
            ...result,
            item,
            children: [],
            isArea: true,
            isGroup: idx === 0,
          };
        });
      },
    };
    const { container } = renderWithStore(
      <OutlinerTree regions={regions} footer={null} store={{ hasInterface: () => false }} />,
    );

    await waitFor(() => {
      expect(container.querySelector(".dm-tree")).toBeInTheDocument();
    });
  });

  it("onSelect selects region when node is clicked", async () => {
    const selectArea = mock();
    const unselectAll = mock();
    const mockAnnotation = {
      selectArea,
      unselectAll,
      toggleRegionSelection: mock(),
      isLinkingMode: false,
      addLinkedRegion: mock(),
      stopLinkingMode: mock(),
      regionStore: { unselectAll: mock() },
    };
    const items = [
      {
        ...defaultItem,
        annotation: mockAnnotation,
        selected: false,
      },
    ];
    const regions = createMockRegions({}, items);
    const { container } = renderWithStore(
      <OutlinerTree regions={regions} footer={null} store={{ hasInterface: () => false }} />,
    );

    await waitFor(() => {
      expect(container.querySelector(".dm-tree")).toBeInTheDocument();
    });
    const nodeContent = container.querySelector(".dm-tree-node-content-wrapper");
    expect(nodeContent).toBeInTheDocument();
    fireEvent.click(nodeContent!, { bubbles: true });
    expect(selectArea).toHaveBeenCalledWith(items[0]);
  });

  it("onSelect unselects when clicking selected node", async () => {
    const unselectAll = mock();
    const items = [
      {
        ...defaultItem,
        annotation: { selectArea: mock(), unselectAll, regionStore: {} },
        selected: true,
      },
    ];
    const regions = createMockRegions({}, items);
    const { container } = renderWithStore(
      <OutlinerTree regions={regions} footer={null} store={{ hasInterface: () => false }} />,
    );

    await waitFor(() => {
      expect(container.querySelector(".dm-tree-node-content-wrapper")).toBeInTheDocument();
    });
    fireEvent.click(container.querySelector(".dm-tree-node-content-wrapper")!, { bubbles: true });
    expect(unselectAll).toHaveBeenCalled();
  });

  it("onSelect with ctrlKey toggles region selection", async () => {
    const toggleRegionSelection = mock();
    const items = [
      {
        ...defaultItem,
        annotation: { toggleRegionSelection, regionStore: {} },
      },
    ];
    const regions = createMockRegions({}, items);
    const { container } = renderWithStore(
      <OutlinerTree regions={regions} footer={null} store={{ hasInterface: () => false }} />,
    );

    await waitFor(() => {
      expect(container.querySelector(".dm-tree-node-content-wrapper")).toBeInTheDocument();
    });
    fireEvent.click(container.querySelector(".dm-tree-node-content-wrapper")!, {
      bubbles: true,
      ctrlKey: true,
    });
    expect(toggleRegionSelection).toHaveBeenCalledWith(items[0]);
  });

  it("onSelect calls onSelectInOutliner when region was not selected", async () => {
    const onSelectInOutliner = mock();
    const selectArea = mock();
    const items = [
      {
        ...defaultItem,
        selected: false,
        onSelectInOutliner,
        annotation: { selectArea, unselectAll: mock(), regionStore: {} },
      },
    ];
    const regions = createMockRegions({}, items);
    const { container } = renderWithStore(
      <OutlinerTree regions={regions} footer={null} store={{ hasInterface: () => false }} />,
    );

    await waitFor(() => {
      expect(container.querySelector(".dm-tree-node-content-wrapper")).toBeInTheDocument();
    });
    fireEvent.click(container.querySelector(".dm-tree-node-content-wrapper")!, { bubbles: true });
    expect(selectArea).toHaveBeenCalled();
    expect(onSelectInOutliner).toHaveBeenCalledWith(true);
  });

  it("onSelect in linking mode adds linked region and stops linking", async () => {
    const addLinkedRegion = mock();
    const stopLinkingMode = mock();
    const unselectAll = mock();
    const items = [
      {
        ...defaultItem,
        isReadOnly: () => false,
        annotation: {
          isLinkingMode: true,
          addLinkedRegion,
          stopLinkingMode,
          regionStore: { unselectAll },
        },
      },
    ];
    const regions = createMockRegions({}, items);
    const { container } = renderWithStore(
      <OutlinerTree regions={regions} footer={null} store={{ hasInterface: () => false }} />,
    );

    await waitFor(() => {
      expect(container.querySelector(".dm-tree-node-content-wrapper")).toBeInTheDocument();
    });
    fireEvent.click(container.querySelector(".dm-tree-node-content-wrapper")!, { bubbles: true });
    expect(addLinkedRegion).toHaveBeenCalledWith(items[0]);
    expect(stopLinkingMode).toHaveBeenCalled();
    expect(unselectAll).toHaveBeenCalled();
  });

  it("onMouseEnter and onMouseLeave call setHighlight", async () => {
    const setHighlight = mock();
    const items = [{ ...defaultItem, setHighlight }];
    const regions = createMockRegions({}, items);
    const { container } = renderWithStore(
      <OutlinerTree regions={regions} footer={null} store={{ hasInterface: () => false }} />,
    );

    await waitFor(() => {
      expect(container.querySelector(".dm-tree-node-content-wrapper")).toBeInTheDocument();
    });
    const wrapper = container.querySelector(".dm-tree-node-content-wrapper")!;
    fireEvent.mouseEnter(wrapper);
    await waitFor(() => expect(setHighlight).toHaveBeenCalledWith(true));
    fireEvent.mouseLeave(wrapper);
    expect(setHighlight).toHaveBeenCalledWith(false);
  });

  it("onMouseEnter on second node clears highlight on first", async () => {
    const setHighlight1 = mock();
    const setHighlight2 = mock();
    const items = [
      { ...defaultItem, id: "r1", setHighlight: setHighlight1 },
      { ...defaultItem, id: "r2", setHighlight: setHighlight2 },
    ];
    const regions = createMockRegions({}, items);
    const { container } = renderWithStore(
      <OutlinerTree regions={regions} footer={null} store={{ hasInterface: () => false }} />,
    );

    await waitFor(() => {
      const wrappers = container.querySelectorAll(".dm-tree-node-content-wrapper");
      expect(wrappers.length).toBeGreaterThanOrEqual(2);
    });
    const wrappers = container.querySelectorAll(".dm-tree-node-content-wrapper");
    fireEvent.mouseEnter(wrappers[0]);
    await waitFor(() => expect(setHighlight1).toHaveBeenCalledWith(true));
    fireEvent.mouseEnter(wrappers[1]);
    await waitFor(() => {
      expect(setHighlight1).toHaveBeenCalledWith(false);
      expect(setHighlight2).toHaveBeenCalledWith(true);
    });
  });

  it("renders OCR section when item has perRegionDescControls", async () => {
    const items = [
      {
        ...defaultItem,
        perRegionDescControls: [{ type: "textarea" }],
      },
    ];
    const regions = createMockRegions({}, items);
    const { container } = renderWithStore(
      <OutlinerTree regions={regions} footer={null} store={{ hasInterface: () => false }} />,
    );

    await waitFor(() => {
      expect(container.querySelector(".dm-tree")).toBeInTheDocument();
    });
    expect(container.querySelector(".dm-ocr")).toBeInTheDocument();
  });

  it("RegionItemDesc onClick selects area when not selected", async () => {
    const selectArea = mock();
    const items = [
      {
        ...defaultItem,
        annotation: { selectArea },
        perRegionDescControls: [{ type: "textarea" }],
      },
    ];
    const regions = createMockRegions({}, items);
    const { container } = renderWithStore(
      <OutlinerTree regions={regions} footer={null} store={{ hasInterface: () => false }} />,
    );

    await waitFor(() => {
      expect(container.querySelector(".dm-ocr")).toBeInTheDocument();
    });
    fireEvent.click(container.querySelector(".dm-ocr")!);
    expect(selectArea).toHaveBeenCalledWith(items[0]);
  });

  describe("with FF_DEV_2755 (persist collapse)", () => {
    beforeEach(() => {
      ff.set({ [FF_DEV_2755]: true });
    });
    afterEach(() => {
      ff.reset();
    });

    it("uses expandedKeys and onExpand when group is label", async () => {
      const storageKey = "collapsed-label-pos";
      const getItem = spyOn(Storage.prototype, "getItem").mockReturnValue(null);
      const setItem = spyOn(Storage.prototype, "setItem");

      const parentItem = { ...defaultItem, id: "label-1", type: "label" };
      const childItem = { ...defaultItem, id: "r1", type: "rectangle" };
      const regions = {
        group: "label",
        selection: { keys: [] as string[] },
        getRegionsTree: (processor: (item: any, idx: number) => any) => {
          const childNode = {
            ...processor(childItem, 1),
            item: childItem,
            children: [],
            isArea: true,
            key: "r1",
            pos: "r1",
          };
          const parentNode = {
            ...processor(parentItem, 0),
            item: parentItem,
            children: [childNode],
            isArea: false,
            key: "label-1",
            pos: "Label 1",
          };
          return [parentNode];
        },
      };
      const { container } = renderWithStore(
        <OutlinerTree regions={regions} footer={null} store={{ hasInterface: () => false }} />,
      );

      await waitFor(() => {
        expect(container.querySelector(".dm-tree")).toBeInTheDocument();
      });
      expect(getItem).toHaveBeenCalledWith(storageKey);
      const switchers = container.querySelectorAll(".dm-tree-switcher");
      const expandableSwitcher = Array.from(switchers).find((s) => !s.classList.contains("dm-tree-switcher-noop"));
      if (expandableSwitcher) {
        fireEvent.click(expandableSwitcher);
        expect(setItem).toHaveBeenCalled();
      }
      getItem.mockRestore();
      setItem.mockRestore();
    });
  });

  it("renders item text with escaped newlines", async () => {
    const items = [{ ...defaultItem, text: "line1\\nline2" }];
    const regions = createMockRegions({}, items);
    const { container } = renderWithStore(
      <OutlinerTree regions={regions} footer={null} store={{ hasInterface: () => false }} />,
    );

    await waitFor(() => {
      expect(container.querySelector(".dm-tree")).toBeInTheDocument();
    });
    expect(container.textContent).toContain("line1");
    expect(container.textContent).toContain("line2");
  });

  it("renders node with type range for RegionControls branch", async () => {
    const items = [{ ...defaultItem, type: "range", hidden: false }];
    const regions = createMockRegions({}, items);
    const { container } = renderWithStore(
      <OutlinerTree regions={regions} footer={null} store={{ hasInterface: () => false }} />,
    );

    await waitFor(() => {
      expect(container.querySelector(".dm-tree")).toBeInTheDocument();
    });
    expect(container.querySelector(".dm-outliner-item__controls")).toBeInTheDocument();
  });
});
