let mockFreehandEnabled = false;

jest.mock("../../utils/feature-flags", () => ({
  FF_DEV_3391: "fflag_fix_front_dev_3391_interactive_view_all",
  FF_SIMPLE_INIT: "fflag_fix_front_leap_443_select_annotation_once",
  FF_POLYGON_FREEHAND: "fflag_feat_front_polygon_freehand",
  isFF: jest.fn((flag) => {
    if (flag === "fflag_feat_front_polygon_freehand") return mockFreehandEnabled;
    return flag === "fflag_fix_front_dev_3391_interactive_view_all";
  }),
}));

jest.mock("@humansignal/core", () => ({
  ff: {
    FF_MULTIPLE_LABELS_REGIONS: "fflag_multiple_labels_regions",
    isActive: jest.fn(() => false),
  },
}));

jest.mock("../../components/Node/Node", () => ({
  NodeViews: { PolygonRegionModel: { icon: jest.fn(), altIcon: jest.fn() } },
}));

const { Polygon } = require("../Polygon");

const createPolygonTool = () => {
  const history = { freeze: jest.fn(), unfreeze: jest.fn() };
  const selection = { drawingUnselect: jest.fn(), hasSelection: false };
  const annotation = {
    editable: true,
    isDrawing: false,
    isReadOnly: jest.fn(() => false),
    history,
    regionStore: { selection, hasSelection: false },
    setIsDrawing: jest.fn((drawing) => {
      annotation.isDrawing = drawing;
    }),
    afterCreateResult: jest.fn(),
    unselectAll: jest.fn(),
  };
  const control = {
    type: "polygonlabels",
    isSelected: true,
    isSeparated: false,
    annotation,
    getResultValue: jest.fn(() => ({})),
    getSnappedPoint: jest.fn(({ x, y }) => ({ x, y })),
  };
  const area = {
    type: "polygonregion",
    closed: false,
    isDrawing: true,
    points: [],
    setValue: jest.fn(),
    setDrawing: jest.fn((drawing) => {
      area.isDrawing = drawing;
    }),
    addPoint: jest.fn((x, y) => area.points.push({ x, y })),
    closePoly: jest.fn(() => {
      area.closed = true;
    }),
    notifyDrawingFinished: jest.fn(),
    toJSON: jest.fn(() => ({ points: area.points.map(({ x, y }) => [x, y]) })),
  };
  annotation.createResult = jest.fn((options) => {
    area.points = options.points.map(([x, y]) => ({ x, y }));
    return area;
  });
  const object = {
    name: "image",
    annotation,
    regs: [],
    canvasSize: { width: 100, height: 100 },
    stageScale: 1,
    stageWidth: 100,
    stageHeight: 100,
    multiImage: false,
    currentImage: 0,
    checkLabels: jest.fn(() => true),
    activeStates: jest.fn(() => []),
  };
  const manager = { name: "image", obj: object, findSelectedTool: jest.fn(), selectTool: jest.fn() };
  const tool = Polygon.create({}, { manager, control, object });

  return { tool, annotation, history, area };
};

describe("Polygon freehand", () => {
  beforeEach(() => {
    jest.useFakeTimers();
    mockFreehandEnabled = false;
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  it("does not create a contour when the feature flag is off", () => {
    const { tool, history } = createPolygonTool();

    expect(tool.canStartFreehand()).toBe(false);
    expect(
      tool.commitFreehand([
        [10, 10],
        [20, 10],
        [20, 20],
      ]),
    ).toBe(false);
    expect(history.freeze).not.toHaveBeenCalled();
  });

  it("commits one contour inside a single history transaction", () => {
    mockFreehandEnabled = true;
    const { tool, annotation, history, area } = createPolygonTool();

    expect(
      tool.commitFreehand([
        [10, 10],
        [20, 10],
        [20, 20],
        [10, 20],
      ]),
    ).toBe(true);
    expect(history.freeze).toHaveBeenCalledTimes(1);
    expect(history.freeze).toHaveBeenCalledWith("polygon-freehand");

    jest.runOnlyPendingTimers();

    expect(area.points).toHaveLength(4);
    expect(area.closed).toBe(true);
    expect(annotation.afterCreateResult).toHaveBeenCalledTimes(1);
    expect(history.unfreeze).toHaveBeenCalledTimes(1);
    expect(history.unfreeze).toHaveBeenCalledWith("polygon-freehand");
  });

  it("releases history when deferred completion is skipped", () => {
    mockFreehandEnabled = true;
    const { tool, annotation, history, area } = createPolygonTool();

    expect(
      tool.commitFreehand([
        [10, 10],
        [20, 10],
        [20, 20],
      ]),
    ).toBe(true);
    area.setDrawing(false);
    annotation.setIsDrawing(false);

    jest.runOnlyPendingTimers();

    expect(annotation.afterCreateResult).not.toHaveBeenCalled();
    expect(history.unfreeze).toHaveBeenCalledTimes(1);
    expect(history.unfreeze).toHaveBeenCalledWith("polygon-freehand");
  });

  it("releases history synchronously on a tool switch without double-finishing", () => {
    mockFreehandEnabled = true;
    const { tool, annotation, history } = createPolygonTool();

    expect(
      tool.commitFreehand([
        [10, 10],
        [20, 10],
        [20, 20],
      ]),
    ).toBe(true);
    tool.handleToolSwitch({ toolName: "RectangleTool" });

    expect(history.unfreeze).toHaveBeenCalledTimes(1);
    jest.runOnlyPendingTimers();
    expect(annotation.afterCreateResult).toHaveBeenCalledTimes(1);
    expect(history.unfreeze).toHaveBeenCalledTimes(1);
  });
});
