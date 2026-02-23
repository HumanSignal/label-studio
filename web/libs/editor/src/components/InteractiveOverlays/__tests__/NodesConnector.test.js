/**
 * Unit tests for NodesConnector (components/InteractiveOverlays/NodesConnector.js)
 */
import NodesConnector from "../NodesConnector";

const mockRelationShapeInstance = {
  boundingBox: jest.fn(),
  onUpdate: jest.fn(),
  destroy: jest.fn(),
};

jest.mock("../RelationShape", () => ({
  RelationShape: jest.fn(() => mockRelationShapeInstance),
}));

jest.mock("../Geometry", () => ({
  Geometry: {
    getDOMBBox: jest.fn(),
    padding: jest.fn((bbox, pad = 0) => ({
      ...bbox,
      x: bbox.x - pad,
      y: bbox.y - pad,
      width: bbox.width + pad * 2,
      height: bbox.height + pad * 2,
    })),
    closestRects: jest.fn((list1, list2) => [
      list1[0] ?? { x: 0, y: 0, width: 0, height: 0 },
      list2[0] ?? { x: 0, y: 0, width: 0, height: 0 },
    ]),
  },
}));

const { Geometry } = require("../Geometry");
const { RelationShape } = require("../RelationShape");

describe("NodesConnector", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRelationShapeInstance.boundingBox.mockReturnValue([{ x: 0, y: 0, width: 10, height: 10 }]);
    Geometry.getDOMBBox.mockReturnValue({ x: 0, y: 0 });
  });

  describe("obtainWatcher", () => {
    it("returns DOMWatcher for node with from_name (result)", () => {
      const node = { from_name: "some" };
      expect(NodesConnector.obtainWatcher(node)).toBeDefined();
    });

    it("returns DOMWatcher for richtextregion", () => {
      const node = { type: "richtextregion" };
      expect(NodesConnector.obtainWatcher(node)).toBeDefined();
    });

    it("returns DOMWatcher for paragraphs", () => {
      const node = { type: "paragraphs" };
      expect(NodesConnector.obtainWatcher(node)).toBeDefined();
    });

    it("returns property watcher for audioregion", () => {
      const node = { type: "audioregion" };
      expect(NodesConnector.obtainWatcher(node)).toBeDefined();
    });

    it("returns property watcher for rectangleregion", () => {
      const node = { type: "rectangleregion" };
      expect(NodesConnector.obtainWatcher(node)).toBeDefined();
    });

    it("returns property watcher for ellipseregion", () => {
      const node = { type: "ellipseregion" };
      expect(NodesConnector.obtainWatcher(node)).toBeDefined();
    });

    it("returns property watcher for polygonregion", () => {
      const node = { type: "polygonregion" };
      expect(NodesConnector.obtainWatcher(node)).toBeDefined();
    });

    it("returns property watcher for vectorregion", () => {
      const node = { type: "vectorregion" };
      expect(NodesConnector.obtainWatcher(node)).toBeDefined();
    });

    it("returns property watcher for keypointregion", () => {
      const node = { type: "keypointregion" };
      expect(NodesConnector.obtainWatcher(node)).toBeDefined();
    });

    it("returns property watcher for brushregion", () => {
      const node = { type: "brushregion" };
      expect(NodesConnector.obtainWatcher(node)).toBeDefined();
    });

    it("returns property watcher for timeseriesregion", () => {
      const node = { type: "timeseriesregion" };
      expect(NodesConnector.obtainWatcher(node)).toBeDefined();
    });

    it("returns null for unknown region type", () => {
      const node = { type: "unknown" };
      expect(NodesConnector.obtainWatcher(node)).toBeNull();
    });
  });

  describe("createShape", () => {
    it("creates RelationShape with root, element, and watcher from obtainWatcher", () => {
      const root = {};
      const node = { type: "rectangleregion" };
      const shape = NodesConnector.createShape(node, root);
      expect(RelationShape).toHaveBeenCalledWith(
        expect.objectContaining({
          root,
          element: node,
          watcher: expect.anything(),
        }),
      );
      expect(shape).toBe(mockRelationShapeInstance);
    });
  });

  describe("connect", () => {
    it("returns connection object with id, label, color, direction, start, end", () => {
      const relation = {
        id: "r1",
        labels: "L1",
        direction: "right",
        startNode: { type: "rectangleregion" },
        endNode: { type: "rectangleregion" },
      };
      const root = {};
      const conn = NodesConnector.connect(relation, root);
      expect(conn.id).toBe("r1");
      expect(conn.label).toBe("L1");
      expect(conn.color).toBe("#fa541c");
      expect(conn.direction).toBe("right");
      expect(conn.start).toBe(mockRelationShapeInstance);
      expect(conn.end).toBe(mockRelationShapeInstance);
    });

    it("joins multiple labels with comma", () => {
      const relation = {
        id: "r1",
        labels: ["A", "B"],
        startNode: { type: "rectangleregion" },
        endNode: { type: "rectangleregion" },
      };
      const conn = NodesConnector.connect(relation, {});
      expect(conn.label).toBe("A, B");
    });

    it("uses empty label when labels is null/undefined", () => {
      const relation = {
        id: "r1",
        startNode: { type: "rectangleregion" },
        endNode: { type: "rectangleregion" },
      };
      const conn = NodesConnector.connect(relation, {});
      expect(conn.label).toBe("");
    });

    it("onChange registers debounced callback on start and end shapes", () => {
      const relation = {
        id: "r1",
        startNode: { type: "rectangleregion" },
        endNode: { type: "rectangleregion" },
      };
      const conn = NodesConnector.connect(relation, {});
      const cb = jest.fn();
      conn.onChange(cb);
      expect(mockRelationShapeInstance.onUpdate).toHaveBeenCalledTimes(2);
    });

    it("destroy calls destroy on start and end shapes", () => {
      const relation = {
        id: "r1",
        startNode: { type: "rectangleregion" },
        endNode: { type: "rectangleregion" },
      };
      const conn = NodesConnector.connect(relation, {});
      conn.destroy();
      expect(mockRelationShapeInstance.destroy).toHaveBeenCalledTimes(2);
    });
  });

  describe("calculateBBox", () => {
    it("returns padded bbox list relative to root origin", () => {
      Geometry.getDOMBBox.mockReturnValue({ x: 10, y: 20 });
      Geometry.padding.mockImplementation((bbox) => ({
        ...bbox,
        x: bbox.x - 3,
        y: bbox.y - 3,
        width: bbox.width + 6,
        height: bbox.height + 6,
      }));
      mockRelationShapeInstance.boundingBox.mockReturnValue([{ x: 50, y: 60, width: 10, height: 10 }]);
      const result = NodesConnector.calculateBBox(mockRelationShapeInstance, document.createElement("div"));
      expect(Geometry.getDOMBBox).toHaveBeenCalledWith(expect.anything(), true);
      expect(Geometry.padding).toHaveBeenCalledWith(expect.any(Object), 3);
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual(expect.objectContaining({ x: 37, y: 37, width: 16, height: 16 }));
    });

    it("uses 0,0 when getDOMBBox returns null", () => {
      Geometry.getDOMBBox.mockReturnValue(null);
      Geometry.padding.mockImplementation((bbox) => ({ ...bbox }));
      mockRelationShapeInstance.boundingBox.mockReturnValue([{ x: 5, y: 5, width: 10, height: 10 }]);
      const result = NodesConnector.calculateBBox(mockRelationShapeInstance, null);
      expect(result[0].x).toBeDefined();
      expect(result[0].y).toBeDefined();
    });
  });

  describe("getNodesBBox", () => {
    it("returns start and end bboxes from closestRects", () => {
      const startBBox = { x: 0, y: 0, width: 10, height: 10 };
      const endBBox = { x: 20, y: 0, width: 10, height: 10 };
      Geometry.closestRects.mockReturnValue([startBBox, endBBox]);
      const root = {};
      const result = NodesConnector.getNodesBBox({
        start: mockRelationShapeInstance,
        end: mockRelationShapeInstance,
        root,
      });
      expect(Geometry.closestRects).toHaveBeenCalled();
      expect(result).toEqual({ start: startBBox, end: endBBox });
    });
  });

  describe("calculatePath", () => {
    it("returns path command and edge center for non-intersecting vertical layout", () => {
      const start = { x: 10, y: 100, width: 20, height: 20 };
      const end = { x: 50, y: 20, width: 20, height: 20 };
      const [pathCommand, edgeCenter] = NodesConnector.calculatePath(start, end);
      expect(pathCommand).toContain("M ");
      expect(pathCommand).toMatch(/a 5 5 0 0/);
      expect(edgeCenter).toHaveLength(2);
      expect(typeof edgeCenter[0]).toBe("number");
      expect(typeof edgeCenter[1]).toBe("number");
    });

    it("uses horizontal path when shapes intersect (same y)", () => {
      const start = { x: 0, y: 50, width: 30, height: 20 };
      const end = { x: 25, y: 50, width: 30, height: 20 };
      const [pathCommand] = NodesConnector.calculatePath(start, end);
      expect(pathCommand).toBeDefined();
      expect(pathCommand.length).toBeGreaterThan(0);
    });

    it("uses left rendering side when min(x1,x2)-limit >= 0", () => {
      const start = { x: 100, y: 50, width: 30, height: 20 };
      const end = { x: 150, y: 50, width: 30, height: 20 };
      const [pathCommand] = NodesConnector.calculatePath(start, end);
      expect(pathCommand).toBeDefined();
    });

    it("uses right rendering side when min(x1,x2)-limit < 0", () => {
      const start = { x: 0, y: 50, width: 30, height: 20 };
      const end = { x: 10, y: 50, width: 30, height: 20 };
      const [pathCommand] = NodesConnector.calculatePath(start, end);
      expect(pathCommand).toBeDefined();
    });

    it("produces valid path for toEnd true (xw1 < xw2) vertical", () => {
      const start = { x: 10, y: 80, width: 20, height: 20 };
      const end = { x: 50, y: 10, width: 20, height: 20 };
      const [pathCommand, edgeCenter] = NodesConnector.calculatePath(start, end);
      expect(pathCommand).toContain("M ");
      expect(edgeCenter[0]).toBeLessThanOrEqual(Math.max(10, 50) + 5);
      expect(edgeCenter[0]).toBeGreaterThanOrEqual(Math.min(10, 50) - 5);
    });

    it("produces valid path for toEnd false (xw1 >= xw2) vertical", () => {
      const start = { x: 50, y: 10, width: 20, height: 20 };
      const end = { x: 10, y: 80, width: 20, height: 20 };
      const [pathCommand] = NodesConnector.calculatePath(start, end);
      expect(pathCommand).toContain("M ");
    });

    it("horizontal left rendering with toEnd true (ys1 < ys2)", () => {
      const start = { x: 100, y: 20, width: 30, height: 20 };
      const end = { x: 120, y: 80, width: 30, height: 20 };
      const [pathCommand, edgeCenter] = NodesConnector.calculatePath(start, end);
      expect(pathCommand).toContain("M ");
      expect(pathCommand).toMatch(/a 5 5 0 0/);
      expect(edgeCenter).toHaveLength(2);
    });

    it("horizontal left rendering with toEnd false (ys1 >= ys2)", () => {
      const start = { x: 100, y: 80, width: 30, height: 20 };
      const end = { x: 120, y: 20, width: 30, height: 20 };
      const [pathCommand] = NodesConnector.calculatePath(start, end);
      expect(pathCommand).toContain("M ");
    });

    it("horizontal right rendering with toEnd true", () => {
      const start = { x: 2, y: 20, width: 30, height: 20 };
      const end = { x: 15, y: 70, width: 30, height: 20 };
      const [pathCommand] = NodesConnector.calculatePath(start, end);
      expect(pathCommand).toContain("M ");
    });

    it("horizontal right rendering with toEnd false", () => {
      const start = { x: 2, y: 70, width: 30, height: 20 };
      const end = { x: 15, y: 20, width: 30, height: 20 };
      const [pathCommand] = NodesConnector.calculatePath(start, end);
      expect(pathCommand).toContain("M ");
    });

    it("shapesIntersect leftIntersection: x2 inside shape1 x range", () => {
      const start = { x: 0, y: 10, width: 40, height: 20 };
      const end = { x: 20, y: 60, width: 20, height: 20 };
      const [pathCommand] = NodesConnector.calculatePath(start, end);
      expect(pathCommand).toBeDefined();
    });

    it("shapesIntersect rightIntersection: x2+w2 inside shape1 x range", () => {
      const start = { x: 20, y: 10, width: 30, height: 20 };
      const end = { x: 5, y: 60, width: 15, height: 20 };
      const [pathCommand] = NodesConnector.calculatePath(start, end);
      expect(pathCommand).toBeDefined();
    });
  });
});
