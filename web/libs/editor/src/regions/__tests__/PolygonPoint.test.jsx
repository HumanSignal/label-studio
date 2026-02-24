/**
 * Unit tests for PolygonPoint (model views and actions).
 * Covers point model and view behavior used by PolygonRegion.
 */
import { render } from "@testing-library/react";
import { getParent, hasParent, types } from "mobx-state-tree";

jest.mock("../../tags/object/Image", () => {
  const { types } = require("mobx-state-tree");
  return {
    ImageModel: types
      .model("ImageModel", { id: types.identifier })
      .views(() => ({
        get naturalWidth() {
          return 100;
        },
        get naturalHeight() {
          return 100;
        },
        get stageWidth() {
          return 100;
        },
        get stageHeight() {
          return 100;
        },
      }))
      .actions((self) => ({
        createSerializedResult(region, value) {
          return {
            value: { ...value },
            original_width: 100,
            original_height: 100,
            image_rotation: 0,
          };
        },
      })),
  };
});

import { PolygonPointView } from "../PolygonPoint";
import { PolygonRegionModel } from "../PolygonRegion";
import { ImageModel } from "../../tags/object/Image";

jest.mock("../../hooks/useRegionColor", () => ({
  useRegionStyles: () => ({ strokeColor: "#000" }),
}));

const mockControl = {
  getSnappedPoint: (p) => ({ x: p.x, y: p.y }),
  obj: { getSkipInteractions: () => false },
};

const TestPolygonRegionModel = types.compose(
  "TestPolygonRegion",
  PolygonRegionModel,
  types.model({}).views((self) => ({
    get control() {
      return mockControl;
    },
    get parent() {
      return getParent(self);
    },
  })),
);

const mockAnnotation = {
  isReadOnly: () => false,
  history: { freeze: jest.fn(), unfreeze: jest.fn() },
};

const WrapperModel = types
  .model("Wrapper", {
    region: types.optional(TestPolygonRegionModel, {
      id: "poly1",
      pid: "p1",
      object: "img1",
      points: [
        [10, 10],
        [50, 10],
        [50, 50],
        [10, 50],
      ],
      closed: false,
      results: [],
    }),
  })
  .volatile(() => ({
    control: {
      getSnappedPoint: (p) => ({ x: p.x, y: p.y }),
      obj: { getSkipInteractions: () => false },
    },
  }))
  .views((self) => ({
    get parent() {
      return getParent(self);
    },
    get closed() {
      return self.region.closed;
    },
    get mouseOverStartPoint() {
      return self.region.mouseOverStartPoint;
    },
    get points() {
      return self.region.points;
    },
    // PolygonPoint.stage = point.parent.parent = region.parent = wrapper; stage views live on wrapper
    get canvasToInternalX() {
      return (x) => x;
    },
    get canvasToInternalY() {
      return (y) => y;
    },
    get internalToCanvasX() {
      return (x) => x;
    },
    get internalToCanvasY() {
      return (y) => y;
    },
    get zoomScale() {
      return 1;
    },
    get stageWidth() {
      return 100;
    },
    get stageHeight() {
      return 100;
    },
    get stageRef() {
      return {
        container: () => ({ style: { cursor: "" } }),
      };
    },
  }))
  .actions((self) => ({
    setMouseOverStartPoint(v) {
      self.region.setMouseOverStartPoint(v);
    },
    closePoly() {
      self.region.closePoly();
    },
  }));

const TestRoot = types
  .model("TestRoot", {
    annotationStore: types.optional(types.frozen(), { selected: mockAnnotation }),
    wrapper: types.optional(WrapperModel, {}),
    image: types.optional(ImageModel, { id: "img1" }),
  })
  .views((self) => ({
    get canvasToInternalX() {
      return (x) => x;
    },
    get canvasToInternalY() {
      return (y) => y;
    },
    get internalToCanvasX() {
      return (x) => x;
    },
    get internalToCanvasY() {
      return (y) => y;
    },
    get zoomScale() {
      return 1;
    },
    get stageWidth() {
      return 100;
    },
    get stageHeight() {
      return 100;
    },
    get stageRef() {
      return {
        container: () => ({ style: { cursor: "" } }),
      };
    },
  }));

describe("PolygonPoint", () => {
  let root;
  let region;
  let point;

  beforeEach(() => {
    root = TestRoot.create({
      annotationStore: { selected: mockAnnotation },
      wrapper: {
        region: {
          id: "poly1",
          pid: "p1",
          object: "img1",
          points: [
            [10, 10],
            [30, 10],
            [30, 30],
            [10, 30],
          ],
          closed: false,
          results: [],
        },
      },
      image: { id: "img1" },
    });
    region = root.wrapper.region;
    point = region.points[0];
  });

  describe("model views", () => {
    it("has parent chain of 2; parent is region (owner of points array)", () => {
      expect(hasParent(point, 2)).toBe(true);
      expect(getParent(point, 2)).toBe(region);
    });

    it("stage is parent.parent (wrapper) and has transform methods", () => {
      const stage = point.stage;
      expect(stage).toBeDefined();
      expect(typeof stage.internalToCanvasX).toBe("function");
      expect(stage.internalToCanvasX(10)).toBe(10);
    });

    it("canvasX and canvasY use stage internalToCanvasX/Y", () => {
      expect(point.x).toBe(10);
      expect(point.y).toBe(10);
      expect(point.canvasX).toBe(10);
      expect(point.canvasY).toBe(10);
    });
  });

  describe("actions", () => {
    it("_setPos updates x and y", () => {
      point._setPos(20, 25);
      expect(point.x).toBe(20);
      expect(point.y).toBe(25);
    });

    it("movePoint applies canvas delta via stage transform", () => {
      point.movePoint(5, 5);
      expect(point.x).toBe(15);
      expect(point.y).toBe(15);
    });

    it("_movePoint uses parent.control.getSnappedPoint and updates position", () => {
      point._movePoint(40, 40);
      expect(point.x).toBe(40);
      expect(point.y).toBe(40);
    });

    it("closeStartPoint does nothing when annotation is read-only", () => {
      const readOnlyRoot = TestRoot.create({
        annotationStore: {
          selected: { isReadOnly: () => true, history: { freeze: () => {}, unfreeze: () => {} } },
        },
        wrapper: {
          region: {
            id: "polyRO",
            pid: "pRO",
            object: "img1",
            points: [
              [0, 0],
              [10, 0],
              [10, 10],
            ],
            closed: false,
            results: [],
          },
        },
        image: { id: "img1" },
      });
      const roRegion = readOnlyRoot.wrapper.region;
      roRegion.setMouseOverStartPoint(true);
      const roPoint = roRegion.points[0];
      roPoint.closeStartPoint();
      expect(roRegion.closed).toBe(false);
    });

    it("closeStartPoint does nothing when parent already closed", () => {
      region.closePoly();
      region.setMouseOverStartPoint(true);
      point.closeStartPoint();
      expect(region.closed).toBe(true);
    });

    it("closeStartPoint calls parent.closePoly when mouseOverStartPoint", () => {
      expect(region.closed).toBe(false);
      region.setMouseOverStartPoint(true);
      point.closeStartPoint();
      expect(region.closed).toBe(true);
    });

    it("getSkipInteractions returns parent.control.obj.getSkipInteractions()", () => {
      expect(point.getSkipInteractions()).toBe(false);
    });
  });

  describe("handleMouseOverStartPoint / handleMouseOutStartPoint", () => {
    it("handleMouseOverStartPoint sets cancelBubble and calls setMouseOverStartPoint when stage and open polygon", () => {
      const ev = {
        cancelBubble: false,
        target: {
          setX: jest.fn(),
          setY: jest.fn(),
          x: () => 0,
          y: () => 0,
          width: () => 0,
          height: () => 0,
          scale: jest.fn(),
        },
      };
      point.handleMouseOverStartPoint(ev);
      expect(ev.cancelBubble).toBe(true);
      expect(region.mouseOverStartPoint).toBe(true);
    });

    it("handleMouseOutStartPoint resets cursor and setMouseOverStartPoint", () => {
      region.setMouseOverStartPoint(true);
      expect(region.mouseOverStartPoint).toBe(true);
      const ev = {
        target: { setX: jest.fn(), setY: jest.fn(), x: () => 0, y: () => 0, scale: jest.fn() },
      };
      point.handleMouseOutStartPoint(ev);
      expect(region.mouseOverStartPoint).toBe(false);
    });
  });

  describe("PolygonPointView", () => {
    it("renders with item that has parent (circle style)", () => {
      const { container } = render(<PolygonPointView item={point} name="point-0" />);
      expect(container.firstChild).not.toBeNull();
    });
  });
});
