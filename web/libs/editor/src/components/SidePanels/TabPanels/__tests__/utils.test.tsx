import { DEFAULT_PANEL_HEIGHT, DEFAULT_PANEL_WIDTH } from "../../constants";
import { JoinOrder, type PanelBBox, Side } from "../types";
import {
  applyHostPanel,
  checkCollapsedPanelsHaveData,
  determineDroppableArea,
  determineLeftOrRight,
  findPanelViewByName,
  findZIndices,
  getSnappedHeights,
  joinPanelColumns,
  redistributeHeights,
  applyFocusTabToPanels,
  setActive,
  setActiveDefaults,
  splitPanelColumns,
  stateAddedTab,
  stateRemovedTab,
  stateRemovePanelEmptyViews,
  HOST_VIEW_NAME,
  panelComponents,
  restorePanel,
  syncHostView,
} from "../utils";

const dummyPanels: Record<string, PanelBBox> = {
  p1: {
    top: 0,
    left: 0,
    order: 0,
    relativeLeft: 0,
    relativeTop: 0,
    zIndex: 1,
    width: 500,
    height: 500,
    visible: true,
    detached: false,
    alignment: Side.left,
    maxHeight: 800,
    panelViews: [
      { title: "Tab 1", name: "Tab1", component: () => null, active: true },
      { title: "Tab 2", name: "Tab2", component: () => null, active: false },
      { title: "Tab 3", name: "Tab3", component: () => null, active: false },
    ],
  },
  p2: {
    top: 0,
    left: 0,
    order: 0,
    relativeLeft: 0,
    relativeTop: 0,
    zIndex: 1,
    width: 500,
    height: 500,
    visible: true,
    detached: true,
    alignment: Side.right,
    maxHeight: 800,
    panelViews: [{ title: "Tab 4", name: "Tab4", component: () => null, active: true }],
  },
};

describe("determineLeftOrRight", () => {
  it("returns DroppableSide.right when the event x position is greater than half the droppable element width", () => {
    const event = {
      pageX: 500,
      target: {
        clientWidth: 800,
        getBoundingClientRect: () => ({ left: 0 }),
      },
    };

    expect(determineLeftOrRight(event)).toBe(Side.right);
  });

  it("returns DroppableSide.left when the event x position is less than half the droppable element width", () => {
    const event = {
      pageX: 200,
      target: {
        clientWidth: 800,
        getBoundingClientRect: () => ({ left: 0 }),
      },
    };

    expect(determineLeftOrRight(event)).toBe(Side.left);
  });
});

describe("determineDroppableArea", () => {
  it('returns true when the droppingElement id includes "droppable"', () => {
    const droppingElement = document.createElement("div");

    droppingElement.id = "droppable-123";

    expect(determineDroppableArea(droppingElement)).toBe(true);
  });

  it('returns false when the droppingElement id does not include "droppable"', () => {
    const droppingElement = document.createElement("div");

    droppingElement.id = "no";

    expect(determineDroppableArea(droppingElement)).toBe(false);
  });
});

describe("stateRemovedTab", () => {
  const state = { ...dummyPanels };

  it("should remove the specified tab from the specified panel", () => {
    const panelName = "p1";
    const tabToRemove = 1;

    const expectedPanelViews = [
      { title: "Tab 1", name: "Tab1", component: () => null, active: true },
      { title: "Tab 3", name: "Tab3", component: () => null, active: false },
    ];

    const expectedState = {
      ...state,
      [panelName]: {
        ...state[panelName],
        panelViews: expectedPanelViews,
      },
    };

    const newState = stateRemovedTab(state, panelName, tabToRemove);

    expect(JSON.stringify(newState)).toEqual(JSON.stringify(expectedState));
  });

  it("should return the same state if the specified panel or tab does not exist", () => {
    const nonExistentPanelName = "nonexistent";
    const nonExistentTab = 5;
    const newState = stateRemovedTab(state, nonExistentPanelName, nonExistentTab);

    expect(newState).toEqual(state);
  });
});

describe("setActive", () => {
  const panelName = "p1";
  const tabIndex = 1;

  it("should set the correct tab as active", () => {
    const expectedState = [
      {
        title: "Tab 1",
        name: "Tab1",
        component: () => null,
        active: false,
      },
      {
        title: "Tab 2",
        name: "Tab2",
        component: () => null,
        active: true,
      },
      {
        title: "Tab 3",
        name: "Tab3",
        component: () => null,
        active: false,
      },
    ];

    const stateBefore = { ...dummyPanels };
    const newState = setActive(stateBefore, panelName, tabIndex);

    expect(JSON.stringify(newState[panelName].panelViews)).toEqual(JSON.stringify(expectedState));
  });

  it("should not modify the original state object", () => {
    const stateBefore = { ...dummyPanels };

    setActive(dummyPanels, panelName, tabIndex);
    expect(dummyPanels).toEqual(stateBefore);
  });

  it("should return a new state object", () => {
    const newState = setActive(dummyPanels, panelName, tabIndex);

    expect(newState).not.toBe(dummyPanels);
  });
});

describe("setActiveDefaults", () => {
  it("sets the first tab as active if no tabs are currently active", () => {
    const state = {
      panel1: {
        panelViews: [
          { title: "Tab 1", name: "Tab1", component: () => null, active: false },
          { title: "Tab 2", name: "Tab2", component: () => null, active: false },
          { title: "Tab 3", name: "Tab3", component: () => null, active: false },
        ],
      },
      panel2: {
        panelViews: [
          { title: "Tab 4", name: "Tab4", component: () => null, active: false },
          { title: "Tab 5", name: "Tab5", component: () => null, active: false },
        ],
      },
    };
    const newState = setActiveDefaults(state);

    expect(newState.panel1.panelViews[0].active).toBe(true);
    expect(newState.panel2.panelViews[0].active).toBe(true);
  });

  it("does not change active tabs if there are already active tabs", () => {
    const state = {
      panel1: {
        panelViews: [
          { title: "Tab 1", name: "Tab1", component: () => null, active: false },
          { title: "Tab 2", name: "Tab2", component: () => null, active: true },
          { title: "Tab 3", name: "Tab3", component: () => null, active: false },
        ],
      },
      panel2: {
        panelViews: [
          { title: "Tab 4", name: "Tab4", component: () => null, active: true },
          { title: "Tab 5", name: "Tab5", component: () => null, active: false },
        ],
      },
    };

    const newState = setActiveDefaults(state);
    const p1t2Active = newState.panel1.panelViews[1].active;
    const p2t1Active = newState.panel2.panelViews[0].active;

    expect(p1t2Active).toBe(true);
    expect(p2t1Active).toBe(true);
  });
});

describe("stateAddedTab", () => {
  const panelName = "panel1";
  const initialPanelViews = [
    { title: "Tab 1", name: "Tab1", component: () => null, active: true },
    { title: "Tab 2", name: "Tab2", component: () => null, active: false },
  ];

  const state: Record<string, PanelBBox> = {
    [panelName]: { panelViews: initialPanelViews } as unknown as PanelBBox,
  };

  it("adds a new tab to the receiving panel on the right", () => {
    const movingTabData = { title: "Tab 3", name: "Tab3", component: () => null, active: false };
    const receivingTab = 1;
    const receivingPanel = panelName;
    const dropSide = Side.right;

    const expectedPanelViews = [
      { title: "Tab 1", name: "Tab1", component: () => null, active: false },
      { title: "Tab 3", name: "Tab3", component: () => null, active: false },
      { title: "Tab 2", name: "Tab2", component: () => null, active: false },
    ];

    const expectedState = {
      ...state,
      [panelName]: {
        panelViews: expectedPanelViews,
      },
    };

    const newState = stateAddedTab(state, panelName, receivingPanel, movingTabData, receivingTab, dropSide);

    expect(JSON.stringify(newState)).toEqual(JSON.stringify(expectedState));
  });

  it("adds a new tab to the receiving panel on the left", () => {
    const movingTabData = { title: "Tab 3", name: "Tab3", component: () => null, active: false };
    const receivingTab = 1;
    const receivingPanel = panelName;
    const dropSide = Side.left;

    const expectedPanelViews = [
      { title: "Tab 3", name: "Tab3", component: () => null, active: false },
      { title: "Tab 1", name: "Tab1", component: () => null, active: false },
      { title: "Tab 3", name: "Tab3", component: () => null, active: false },
      { title: "Tab 2", name: "Tab2", component: () => null, active: false },
    ];

    const expectedState = {
      ...state,
      [panelName]: {
        panelViews: expectedPanelViews,
      },
    };

    const newState = stateAddedTab(state, panelName, receivingPanel, movingTabData, receivingTab, dropSide);

    expect(JSON.stringify(newState)).toEqual(JSON.stringify(expectedState));
  });
});

describe("stateRemovePanelEmptyViews", () => {
  const panelName = "panel1";
  const initialPanelViews = [{ title: "Tab 1", name: "Tab1", component: () => null, active: true }];

  const state: Record<string, PanelBBox> = {
    [panelName]: { panelViews: initialPanelViews } as unknown as PanelBBox,
    panel2: { panelViews: [] } as unknown as PanelBBox,
  };

  it("removes empty panel views from the state", () => {
    const expectedState = {
      [panelName]: { panelViews: initialPanelViews } as unknown as PanelBBox,
    };

    const newState = stateRemovePanelEmptyViews(state);

    expect(newState).toEqual(expectedState);
  });
});

describe("splitPanelColumns", () => {
  const panel1 = "panel1";
  const panel2 = "panel2";
  const panel3 = "panel3";
  const totalHeight = 1000;
  const panelAttributes = {
    panelViews: [{ name: "view1", component: () => null }],
    order: 0,
    width: DEFAULT_PANEL_WIDTH,
    height: DEFAULT_PANEL_HEIGHT,
    alignment: Side.left,
  };
  const initialPanels = {
    panel1: { ...panelAttributes },
    panel2: { ...panelAttributes, alignment: Side.right },
    panel3: { ...panelAttributes, alignment: Side.left },
  };

  it("should split the columns when removing a panel from a column", () => {
    const removingKey = panel1;
    const expectedPanel1Attributes = {
      ...panelAttributes,
      order: 0,
      alignment: Side.left,
      detached: true,
      panelViews: [{ name: "view1", component: () => null }],
    };
    const expectedPanel2Attributes = {
      ...panelAttributes,
      order: 0,
      alignment: Side.right,
    };
    const expectedPanel3Attributes = {
      ...panelAttributes,
      order: 1,
      alignment: Side.left,
    };
    const expectedState = {
      [panel1]: { ...expectedPanel1Attributes },
      [panel2]: { ...expectedPanel2Attributes },
      [panel3]: { ...expectedPanel3Attributes },
    };

    const newState = splitPanelColumns(initialPanels, removingKey, totalHeight);

    expect(JSON.stringify(newState[removingKey])).toEqual(JSON.stringify(expectedState[removingKey]));
  });

  it("should split the columns when removing a panel from a column with multiple panels", () => {
    const panel1Attributes = {
      ...panelAttributes,
      panelViews: [{ name: "view1", component: () => null }],
    };
    const panel2Attributes = {
      ...panelAttributes,
      alignment: Side.left,
      panelViews: [{ name: "view2", component: () => null }],
    };
    const panel3Attributes = {
      ...panelAttributes,
      alignment: Side.right,
      panelViews: [{ name: "view3", component: () => null }],
    };
    const removingKey = panel1;
    const expectedPanel1Attributes = {
      ...panelAttributes,
      order: 0,
      alignment: Side.left,
      detached: true,
    };
    const expectedPanel2Attributes = {
      ...panelAttributes,
      order: 1,
      alignment: Side.left,
      panelViews: [{ name: "view2", component: () => null }],
    };
    const expectedPanel3Attributes = {
      ...panelAttributes,
      order: 0,
      alignment: Side.right,
      panelViews: [{ name: "view3", component: () => null }],
    };
    const expectedState = {
      [panel1]: { ...expectedPanel1Attributes },
      [panel2]: { ...expectedPanel2Attributes },
      [panel3]: { ...expectedPanel3Attributes },
    };

    const newState = splitPanelColumns(
      { panel1: panel1Attributes, panel2: panel2Attributes, panel3: panel3Attributes },
      removingKey,
      totalHeight,
    );

    expect(JSON.stringify(newState)).toEqual(JSON.stringify(expectedState));
  });
});

describe("joinPanelColumns", () => {
  const panel1: PanelBBox = {
    width: 200,
    height: 300,
    top: 0,
    left: 0,
    order: 0,
    detached: false,
    alignment: Side.left,
    panelViews: [],
  };
  const panel2: PanelBBox = {
    width: 300,
    height: 200,
    top: 0,
    left: 200,
    order: 1,
    detached: false,
    alignment: Side.left,
    panelViews: [],
  };
  const panel3: PanelBBox = {
    width: 250,
    height: 400,
    top: 0,
    left: 500,
    order: 2,
    detached: false,
    alignment: Side.right,
    panelViews: [],
  };
  const panel4: PanelBBox = {
    width: 250,
    height: 400,
    top: 0,
    left: 500,
    order: 2,
    detached: false,
    alignment: Side.right,
    panelViews: [],
  };
  const state = {
    panel1,
    panel2,
    panel3,
    panel4,
  };

  it("should join two columns on the left", () => {
    const result = joinPanelColumns(state, "panel4", Side.left, 300, 600);

    expect(result).toEqual({
      panel1,
      panel2,
      panel3,
      panel4: {
        width: 300,
        zIndex: 10,
        height: 400,
        top: 0,
        left: 500,
        order: 3,
        detached: false,
        alignment: "left",
        panelViews: [],
      },
    });
  });

  it("should join two columns on the right", () => {
    const result = joinPanelColumns(state, "panel4", Side.right, 400, 600);

    expect(result).toEqual({
      panel1,
      panel2,
      panel3,
      panel4: {
        width: 250,
        zIndex: 10,
        height: 400,
        top: 0,
        left: 500,
        order: 2,
        detached: false,
        alignment: "right",
        panelViews: [],
      },
    });
  });

  it("should adjust the order when joining two columns", () => {
    const result = joinPanelColumns(state, "panel4", Side.left, 300, 600, JoinOrder.top);

    expect(result.panel1.order).toBe(1);
    expect(result.panel2.order).toBe(2);
    expect(result.panel3.order).toBe(0);
    expect(result.panel4.order).toBe(0);
  });
});

describe("redistributeHeights", () => {
  const state = {
    panel1: {
      detached: false,
      alignment: "left",
      height: 100,
      visible: true,
    },
    panel2: {
      detached: false,
      alignment: "left",
      height: 100,
      visible: true,
    },
    panel3: {
      detached: false,
      alignment: "left",
      height: 100,
      visible: true,
    },
    panel4: {
      detached: false,
      alignment: "left",
      height: 100,
      visible: true,
    },
    panel5: {
      detached: false,
      alignment: "left",
      height: 100,
      visible: false,
    },
  };
  const totalHeight = 500;
  const alignment = "left";
  const result = redistributeHeights(state, totalHeight, alignment);

  it("should return a new state object", () => {
    expect(result).not.toBe(state);
  });

  it("should distribute the total height among the visible panels", () => {
    expect(result.panel1.height).toBeCloseTo(119);
    expect(result.panel2.height).toBeCloseTo(119);
    expect(result.panel3.height).toBeCloseTo(119);
    expect(result.panel4.height).toBeCloseTo(119);
  });

  it("should not change the height of collapsed panels", () => {
    expect(result.panel5.height).toBe(100);
  });
});

describe("getSnappedHeights", () => {
  const state = {
    panel1: { height: 100, top: 0, visible: true },
    panel2: { height: 200, top: 100, visible: true },
    panel3: { height: 50, top: 300, visible: true },
    panel4: { height: 30, top: 350, visible: false },
  };

  it("should return a new state object with updated panel heights and top positions", () => {
    const totalHeight = 500;
    const expectedState = {
      panel1: { height: 100, top: 0, visible: true },
      panel2: { height: 200, top: 100, visible: true },
      panel3: { height: 50, top: 300, visible: true },
      panel4: { height: 30, top: 350, visible: false },
    };

    expect(getSnappedHeights(state, totalHeight)).toEqual(expectedState);
  });

  it("should handle collapsed panels", () => {
    const totalHeight = 300;
    const expectedState = {
      panel1: { height: 100, top: 0, visible: true },
      panel2: { height: 200, top: 100, visible: true },
      panel3: { height: 50, top: 300, visible: true },
      panel4: { height: 30, top: 350, visible: false },
    };

    expect(getSnappedHeights(state, totalHeight)).toEqual(expectedState);
  });

  it("should handle an empty state object", () => {
    const totalHeight = 500;
    const expectedState = {};

    expect(getSnappedHeights({}, totalHeight)).toEqual(expectedState);
  });
});

describe("findZIndices", () => {
  const panel1 = {
    panelViews: [{ title: "Tab 1", name: "Tab1", component: () => null, active: true }],
    detached: true,
    zIndex: 5,
  };
  const panel2 = {
    panelViews: [{ title: "Tab 2", name: "Tab2", component: () => null, active: false }],
    detached: false,
    zIndex: 8,
  };
  const panel3 = {
    panelViews: [{ title: "Tab 3", name: "Tab3", component: () => null, active: false }],
    detached: true,
    zIndex: 7,
  };
  const state = {
    panel1,
    panel2,
    panel3,
  };

  it("should correctly update z-indices for attached and detached panels", () => {
    const expectedState = {
      panel1: { ...panel1, zIndex: 14 },
      panel2: { ...panel2, zIndex: 10 },
      panel3: { ...panel3, zIndex: 13 },
    };
    const focusedKey = "panel1";
    const newState = findZIndices(state, focusedKey);

    expect(newState).toEqual(expectedState);
  });

  it("should correctly update z-index for focused detached panel", () => {
    const panel4 = {
      panelViews: [{ title: "Tab 4", name: "Tab4", component: () => null, active: true }],
      detached: true,
      zIndex: 6,
    };
    const newState = {
      ...state,
      panel4,
    };
    const expectedState = {
      ...newState,
      panel4: { ...panel4, zIndex: 15 },
    };
    const focusedKey = "panel4";
    const result = findZIndices(newState, focusedKey);

    expect(result).toEqual(expectedState);
  });
});

describe("findPanelViewByName", () => {
  const state = {
    "view1-view2-view3": {
      panelViews: [{ name: "view1" }, { name: "view2" }, { name: "view3" }],
    },
    "view4-view5": {
      panelViews: [{ name: "View 4" }, { name: "View 5" }],
    },
  };

  it("should return the correct panel view when it exists", () => {
    const name = "view2";
    const expected = {
      panelName: "view1-view2-view3",
      tab: { name: "view2" },
      panelViewIndex: 1,
    };

    const result = findPanelViewByName(state, name);

    expect(result).toEqual(expected);
  });

  it("should return undefined when the panel view does not exist", () => {
    const name = "Non-existent View";

    const result = findPanelViewByName(state, name);

    expect(result).toBeUndefined();
  });

  it("should handle an empty state object", () => {
    const name = "View";

    const result = findPanelViewByName({}, name);

    expect(result).toBeUndefined();
  });

  it("should handle an empty panelViews array", () => {
    const stateWithEmptyPanel = {
      panel1: {
        panelViews: [],
      },
    };
    const name = "View";

    const result = findPanelViewByName(stateWithEmptyPanel, name);

    expect(result).toBeUndefined();
  });

  it("should handle a state object with no matching panel views", () => {
    const name = "Non-existent View";

    const result = findPanelViewByName(state, name);

    expect(result).toBeUndefined();
  });
});

describe("checkCollapsedPanelsHaveData", () => {
  const collapsedSide = {
    left: true,
    right: false,
  };

  const panelData = {
    panel1: { alignment: "left", detached: false },
    panel2: { alignment: "right", detached: false },
    panel3: { alignment: "top", detached: true },
    panel4: { alignment: "bottom", detached: false },
  };

  it("should update collapsedSide correctly when there is data in collapsed panels", () => {
    const expected = {
      left: true,
      right: false,
    };

    const result = checkCollapsedPanelsHaveData(collapsedSide, panelData);

    expect(result).toEqual(expected);
  });

  it("should not update collapsedSide when there is no data in collapsed panels", () => {
    const collapsedSideWithNoData = {
      left: true,
      right: true,
    };
    const expected = { ...collapsedSideWithNoData };

    const result = checkCollapsedPanelsHaveData(collapsedSideWithNoData, panelData);

    expect(result).toEqual(expected);
  });
});

describe("applyFocusTabToPanels (FIT-2813)", () => {
  const commentsPanelState: Record<string, PanelBBox> = {
    "info-comments-history": {
      order: 1,
      top: 0,
      left: 0,
      relativeLeft: 0,
      relativeTop: 0,
      zIndex: 10,
      width: DEFAULT_PANEL_WIDTH,
      height: DEFAULT_PANEL_HEIGHT,
      visible: true,
      detached: false,
      alignment: Side.right,
      maxHeight: 800,
      panelViews: [
        { title: "Info", name: "info", component: () => null, active: true },
        { title: "Comments", name: "comments", component: () => null, active: false },
        { title: "History", name: "history", component: () => null, active: false },
      ],
    },
  };

  it("expands a collapsed right sidebar and activates the Comments tab", () => {
    const result = applyFocusTabToPanels(commentsPanelState, { left: false, right: true }, "comments");

    expect(result.collapsedSide.right).toBe(false);
    expect(result.panelData["info-comments-history"].panelViews.find((v) => v.name === "comments")?.active).toBe(true);
    expect(result.showPanel).toBeUndefined();
  });

  it("requests visibility when the Comments panel is individually hidden", () => {
    const hidden = {
      ...commentsPanelState,
      "info-comments-history": {
        ...commentsPanelState["info-comments-history"],
        visible: false,
      },
    };
    const result = applyFocusTabToPanels(hidden, { left: false, right: false }, "comments");

    expect(result.showPanel).toBe("info-comments-history");
    expect(result.panelData["info-comments-history"].panelViews.find((v) => v.name === "comments")?.active).toBe(true);
  });
});

/**
 * UTC-1446: the one tab a host app fills itself. What matters to users is that its coming and going never resets
 * the layout they arranged, that it lands next to Info the first time, and stays wherever they dragged it.
 */
describe("host panel tab", () => {
  const view = (name: string, active = false) => ({ name, title: name, component: () => null, active });
  const panel = (panelViews: ReturnType<typeof view>[], overrides: Partial<PanelBBox> = {}): PanelBBox => ({
    order: 1,
    top: 0,
    left: 0,
    relativeLeft: 0,
    relativeTop: 0,
    zIndex: 10,
    width: 410,
    height: 500,
    visible: true,
    detached: false,
    alignment: Side.right,
    maxHeight: 800,
    panelViews,
    ...overrides,
  });
  /** A layout a user arranged by hand: Info dragged in with Regions, History torn off into a floating panel. */
  const arranged = (): Record<string, PanelBBox> => ({
    "regions-relations-info-comments": panel([
      view("regions", true),
      view("relations"),
      view("info"),
      view("comments"),
    ]),
    history: panel([view("history", true)], { detached: true, width: 333, zIndex: 12, top: 40, left: 70 }),
  });
  const names = (state: Record<string, PanelBBox>, key: string) => state[key].panelViews.map((v) => v.name);
  const save = (panelData: Record<string, PanelBBox>, collapsedSide = { left: false, right: false }) =>
    window.localStorage.setItem("panelState", JSON.stringify({ panelData, collapsedSide }));

  afterEach(() => window.localStorage.removeItem("panelState"));

  describe("restorePanel", () => {
    it("adds the tab to the panel holding Info without resetting a layout saved before it existed", () => {
      save(arranged(), { left: false, right: true });

      const { panelData, collapsedSide } = restorePanel(true, false, "Helper");

      expect(Object.keys(panelData)).toEqual(["regions-relations-info-comments-host", "history"]);
      expect(names(panelData, "regions-relations-info-comments-host")).toEqual([
        "regions",
        "relations",
        "info",
        "comments",
        HOST_VIEW_NAME,
      ]);
      const host = panelData["regions-relations-info-comments-host"].panelViews[4];
      expect(host.title).toBe("Helper");
      expect(host.active).toBe(false);
      expect(host.component === panelComponents[HOST_VIEW_NAME]).toBe(true);
      // Nothing else moved: the floating History panel and the collapsed right side are as the user left them.
      expect(panelData.history.width).toBe(333);
      expect(panelData.history.detached).toBe(true);
      expect(collapsedSide.right).toBe(true);
    });

    it("restores a saved layout that has the tab as saved, wherever it was dragged", () => {
      save({
        ...arranged(),
        host: panel([{ ...view(HOST_VIEW_NAME, true), title: "Helper" }], { detached: true, width: 360, top: 90 }),
      });

      const { panelData } = restorePanel(true, false, "Helper");

      expect(Object.keys(panelData)).toEqual(["regions-relations-info-comments", "history", "host"]);
      expect(panelData.host.width).toBe(360);
      expect(panelData.host.top).toBe(90);
      expect(panelData.host.panelViews[0].active).toBe(true);
    });

    it("drops the tab when it is not offered, keeping the rest of the layout and an active tab in its panel", () => {
      const withHost = arranged();
      withHost["regions-relations-info-comments"].panelViews = [
        view("regions"),
        view("relations"),
        view("info"),
        view("comments"),
        { ...view(HOST_VIEW_NAME, true), title: "Helper" },
      ];
      save({
        "regions-relations-info-comments-host": withHost["regions-relations-info-comments"],
        history: withHost.history,
      });

      const { panelData } = restorePanel(true, false, false);

      expect(Object.keys(panelData)).toEqual(["regions-relations-info-comments", "history"]);
      expect(panelData["regions-relations-info-comments"].panelViews.map((v) => [v.name, v.active])).toEqual([
        ["regions", true],
        ["relations", false],
        ["info", false],
        ["comments", false],
      ]);
      expect(panelData.history.width).toBe(333);
    });

    it("removes a floating panel that held only the tab", () => {
      save({ ...arranged(), host: panel([{ ...view(HOST_VIEW_NAME, true), title: "Helper" }], { detached: true }) });

      const { panelData } = restorePanel(true, false, false);

      expect(Object.keys(panelData)).toEqual(["regions-relations-info-comments", "history"]);
    });

    it("survives the flag going off and on again with the user's own layout intact", () => {
      save(arranged(), { left: false, right: true });
      const geometry = (state: Record<string, PanelBBox>) =>
        Object.values(state).map(({ width, height, top, left, detached, alignment, zIndex }) => ({
          width,
          height,
          top,
          left,
          detached,
          alignment,
          zIndex,
        }));
      const before = geometry(restorePanel(true, false, false).panelData);

      let restored = restorePanel(true, false, "Helper");
      save(restored.panelData, restored.collapsedSide);
      restored = restorePanel(true, false, false);
      save(restored.panelData, restored.collapsedSide);
      restored = restorePanel(true, false, "Helper");

      expect(geometry(restored.panelData)).toEqual(before);
      expect(restored.collapsedSide.right).toBe(true);
      expect(names(restored.panelData, "regions-relations-info-comments-host")).toContain(HOST_VIEW_NAME);
    });

    it("still resets a layout that is missing a native tab, and then adds the tab to the default Info panel", () => {
      save({ "info-comments": panel([view("info", true), view("comments")]) });

      const { panelData } = restorePanel(true, false, "Helper");

      expect(Object.keys(panelData)).toEqual(["info-comments-history-host", "regions-relations"]);
    });

    it("leaves an active tab in every panel when it falls back to the defaults after the tab was brought forward", () => {
      // No saved layout: the defaults are used, and the host's tab is brought forward in them.
      const first = restorePanel(true, false, "Helper");
      applyHostPanel(first.panelData, first.collapsedSide, "Helper", true, 800);

      // A project whose config adds the custom tab: the tab count changed, so the defaults are used again.
      const { panelData } = restorePanel(true, "Custom", "Helper");

      expect(Object.values(panelData).map((p) => p.panelViews.filter((v) => v.active).length)).toEqual([1, 1]);
    });
  });

  describe("syncHostView", () => {
    it("is idempotent: syncing again returns the very same layout", () => {
      const added = syncHostView(arranged(), "Helper");
      const removed = syncHostView(added, false);

      expect(syncHostView(added, "Helper") === added).toBe(true);
      expect(syncHostView(removed, false) === removed).toBe(true);
    });

    it("retitles the tab in place", () => {
      const added = syncHostView(arranged(), "Helper");
      const retitled = syncHostView(added, "Assistant");

      expect(Object.keys(retitled)).toEqual(Object.keys(added));
      expect(retitled["regions-relations-info-comments-host"].panelViews[4].title).toBe("Assistant");
    });

    it("falls back to the first panel when no panel holds Info", () => {
      const added = syncHostView({ "regions-relations": panel([view("regions", true), view("relations")]) }, "Helper");

      expect(Object.keys(added)).toEqual(["regions-relations-host"]);
    });

    it("renames only the panel it changed: the custom tab still finds its panel by key", () => {
      const state = {
        "info-comments-history": panel([view("info", true), view("comments"), view("history")]),
        "regions-relations": panel([view("regions", true), view("relations"), view("custom")]),
      };

      expect(Object.keys(syncHostView(state, "Helper"))).toEqual(["info-comments-history-host", "regions-relations"]);
    });
  });

  describe("applyHostPanel", () => {
    const columns = () => ({
      "info-comments-history": panel([view("info", true), view("comments"), view("history")], { height: 400 }),
      "regions-relations": panel([view("regions", true), view("relations")], { order: 2, height: 400 }),
    });
    const open = { left: false, right: false };

    it("shows and brings forward the tab in one go: added, then made active", () => {
      const { panelData } = applyHostPanel(columns(), open, "Helper", true, 800);
      const views = panelData["info-comments-history-host"].panelViews;

      expect(views.find((v) => v.name === HOST_VIEW_NAME)?.active).toBe(true);
      expect(views.find((v) => v.name === "info")?.active).toBe(false);
    });

    it("expands the collapsed side the tab is on", () => {
      const { collapsedSide } = applyHostPanel(columns(), { left: false, right: true }, "Helper", true, 800);

      expect(collapsedSide.right).toBe(false);
    });

    it("shows its panel when that panel was minimized", () => {
      const state = columns();
      state["info-comments-history"].visible = false;

      const { panelData } = applyHostPanel(state, open, "Helper", true, 800);

      expect(panelData["info-comments-history-host"].visible).toBe(true);
    });

    it("raises a floating panel holding the tab above the other floating panels", () => {
      const state = {
        ...columns(),
        host: panel([{ ...view(HOST_VIEW_NAME), title: "Helper" }], { detached: true, zIndex: 12 }),
        relations: panel([view("relations", true)], { detached: true, zIndex: 13 }),
      };
      state["regions-relations"].panelViews = [view("regions", true)];

      const { panelData } = applyHostPanel(state, open, "Helper", true, 800);

      expect(panelData.host.zIndex).toBeGreaterThan(panelData.relations.zIndex);
    });

    it("changes nothing without a request or a change of registration", () => {
      const state = syncHostView(columns(), "Helper");
      const result = applyHostPanel(state, open, "Helper", false, 800);

      expect(result.panelData === state).toBe(true);
      expect(result.collapsedSide === open).toBe(true);
    });

    it("ignores a focus request when no tab is shown", () => {
      const state = columns();
      const result = applyHostPanel(state, open, false, true, 800);

      expect(result.panelData === state).toBe(true);
    });

    it("un-collapses a side that is left empty once the tab goes", () => {
      const state = {
        ...columns(),
        host: panel([{ ...view(HOST_VIEW_NAME, true), title: "Helper" }], { alignment: Side.left }),
      };

      const { panelData, collapsedSide } = applyHostPanel(state, { left: true, right: false }, false, false, 800);

      expect(panelData.host).toBeUndefined();
      expect(collapsedSide.left).toBe(false);
    });
  });
});
