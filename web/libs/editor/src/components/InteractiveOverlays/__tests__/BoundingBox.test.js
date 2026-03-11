/**
 * Unit tests for BoundingBox (components/InteractiveOverlays/BoundingBox.js)
 */
import { BoundingBox } from "../BoundingBox";
import { Geometry } from "../Geometry";

jest.mock("../Geometry", () => ({
  Geometry: {
    getDOMBBox: jest.fn(),
    clampBBox: jest.fn((bbox) => ({ ...bbox })),
    modifyBBoxCoords: jest.fn((bbox) => ({ ...bbox })),
  },
}));

describe("BoundingBox", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("class", () => {
    it("stores options in constructor", () => {
      const options = {
        source: { left: 10, top: 20 },
        getX: (s) => s.left,
        getY: (s) => s.top,
        getWidth: (s) => 100,
        getHeight: (s) => 50,
      };
      const box = new BoundingBox(options);
      expect(box._source).toBe(options.source);
      expect(box.x).toBe(10);
      expect(box.y).toBe(20);
      expect(box.width).toBe(100);
      expect(box.height).toBe(50);
    });

    it("returns default-like bbox when getters return values", () => {
      const box = new BoundingBox({
        source: {},
        getX: () => 5,
        getY: () => 5,
        getWidth: () => 10,
        getHeight: () => 10,
      });
      expect(box.x).toBe(5);
      expect(box.y).toBe(5);
      expect(box.width).toBe(10);
      expect(box.height).toBe(10);
    });
  });

  describe("bbox (static)", () => {
    it("returns array of default bbox for unknown region type", () => {
      const region = { type: "unknown" };
      const warnSpy = jest.spyOn(console, "warn").mockImplementation(() => {});
      const result = BoundingBox.bbox(region);
      expect(result).toEqual([{ x: 0, y: 0, width: 0, height: 0 }]);
      expect(warnSpy).toHaveBeenCalledWith("Unknown region type: unknown");
      warnSpy.mockRestore();
    });

    it("returns bbox from result (from_name) when region has from_name", () => {
      const elementRef = { current: document.createElement("div") };
      Geometry.getDOMBBox.mockReturnValue({ x: 10, y: 20, width: 30, height: 40 });
      const region = { from_name: { elementRef } };
      const result = BoundingBox.bbox(region);
      expect(Geometry.getDOMBBox).toHaveBeenCalledWith(elementRef.current);
      expect(result).toEqual([{ x: 10, y: 20, width: 30, height: 40 }]);
    });

    it("returns default bbox for result when getDOMBBox returns null/undefined", () => {
      Geometry.getDOMBBox.mockReturnValue(null);
      const region = { from_name: { elementRef: { current: null } } };
      const result = BoundingBox.bbox(region);
      expect(result).toEqual([{ x: 0, y: 0, width: 0, height: 0 }]);
    });

    it("returns default bbox for canvas region without parent.stageRef", () => {
      const region = {
        type: "rectangleregion",
        bboxCoordsCanvas: { left: 0, top: 0, right: 50, bottom: 30 },
      };
      const result = BoundingBox.bbox(region);
      expect(result).toEqual([{ x: 0, y: 0, width: 0, height: 0 }]);
    });

    it("returns stage-related bbox for canvas region with parent.stageRef", () => {
      const contentEl = document.createElement("div");
      Geometry.getDOMBBox
        .mockReturnValueOnce({ x: 100, y: 50, width: 400, height: 300 })
        .mockReturnValueOnce({ x: 10, y: 20, width: 50, height: 30 });
      Geometry.clampBBox.mockImplementation((bbox) => ({ ...bbox }));
      Geometry.modifyBBoxCoords.mockImplementation((bbox) => ({ ...bbox }));

      const region = {
        type: "rectangleregion",
        bboxCoordsCanvas: { left: 5, top: 10, right: 55, bottom: 40 },
        parent: {
          stageRef: { content: contentEl },
          zoomOriginalCoords: (c) => c,
          canvasSize: { width: 400, height: 300 },
        },
      };
      const result = BoundingBox.bbox(region);
      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({ width: 50, height: 30 });
      expect(result[0].x).toBe(105);
      expect(result[0].y).toBe(60);
    });

    it("returns bbox for audioregion with bboxCoordsCanvas and stage", () => {
      const stageEl = document.createElement("div");
      Geometry.getDOMBBox.mockReset();
      Geometry.getDOMBBox.mockReturnValue({ x: 50, y: 100, width: 200, height: 80 });

      const region = {
        type: "audioregion",
        bboxCoordsCanvas: { left: 10, top: 5, right: 110, bottom: 45 },
        parent: { stageRef: { current: stageEl } },
      };
      const result = BoundingBox.bbox(region);
      expect(Geometry.getDOMBBox).toHaveBeenCalledWith(stageEl, true);
      expect(result).toEqual([{ x: 60, y: 105, width: 100, height: 40 }]);
    });

    it("returns default bbox for audioregion without bboxCoordsCanvas", () => {
      const region = { type: "audioregion", parent: {} };
      const result = BoundingBox.bbox(region);
      expect(result).toEqual([{ x: 0, y: 0, width: 0, height: 0 }]);
    });

    it("returns region bbox for textarearegion without iframe", () => {
      const regionEl = document.createElement("div");
      Geometry.getDOMBBox.mockReturnValue([{ x: 1, y: 2, width: 10, height: 5 }]);
      const region = {
        type: "textarearegion",
        getRegionElement: () => regionEl,
        parent: {},
      };
      const result = BoundingBox.bbox(region);
      expect(Geometry.getDOMBBox).toHaveBeenCalledWith(regionEl);
      expect(result).toEqual([{ x: 1, y: 2, width: 10, height: 5 }]);
    });

    it("returns offset bbox for textarearegion inside iframe", () => {
      const regionEl = document.createElement("div");
      const iframeEl = document.createElement("iframe");
      Geometry.getDOMBBox
        .mockReturnValueOnce([{ x: 5, y: 10, width: 20, height: 8 }])
        .mockReturnValueOnce({ x: 200, y: 100, width: 400, height: 300 });
      const region = {
        type: "textarearegion",
        getRegionElement: () => regionEl,
        parent: { mountNodeRef: { current: iframeEl } },
      };
      Object.defineProperty(iframeEl, "tagName", { value: "IFRAME" });
      const result = BoundingBox.bbox(region);
      expect(result).toEqual([{ x: 205, y: 110, width: 20, height: 8 }]);
    });

    it("returns default bbox for brushregion without parent stageRef", () => {
      const region = {
        type: "brushregion",
        bboxCoordsCanvas: { left: 0, top: 0, right: 10, bottom: 10 },
      };
      const result = BoundingBox.bbox(region);
      expect(result).toEqual([{ x: 0, y: 0, width: 0, height: 0 }]);
    });
  });
});
