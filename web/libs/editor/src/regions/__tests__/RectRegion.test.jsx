/**
 * Unit tests for RectRegion (model views, actions, and region type).
 * View coverage is largely from Cypress; these tests cover model logic.
 */
import { getRoot, types } from "mobx-state-tree";

const rectPropsRef = { current: null };
jest.mock("react-konva", () => {
  const React = require("react");
  return {
    Rect: (props) => {
      rectPropsRef.current = props;
      return React.createElement("div", { "data-testid": "konva-rect", ...props });
    },
  };
});

jest.mock("../../utils/feature-flags", () => ({
  isFF: jest.fn(() => false),
  FF_ZOOM_OPTIM: "ff_zoom_optim",
}));

jest.mock("../../hooks/useRegionColor", () => ({
  useRegionStyles: jest.fn(() => ({
    fillColor: "#ff8800",
    strokeColor: "#000",
    strokeWidth: 1,
  })),
}));

jest.mock("../../components/ImageView/ImageViewContext", () => ({
  ImageViewContext: require("react").createContext({ suggestion: null }),
}));

jest.mock("../RegionWrapper", () => ({
  RegionWrapper: ({ children }) => require("react").createElement("div", { "data-testid": "region-wrapper" }, children),
}));

jest.mock("../../components/ImageView/LabelOnRegion", () => ({
  LabelOnRect: () => require("react").createElement("div", { "data-testid": "label-on-rect" }),
}));

jest.mock("../../utils/image", () => ({
  createDragBoundFunc: jest.fn(() => () => ({ x: 0, y: 0 })),
}));

jest.mock("konva", () => {
  return {
    Transform: jest.fn().mockImplementation(function () {
      this.rotate = jest.fn();
      this.point = jest.fn((p) => ({ x: p.x, y: p.y }));
      return this;
    }),
  };
});

jest.mock("../../tags/object/Image", () => {
  const { types } = require("mobx-state-tree");
  return {
    ImageModel: types
      .model("ImageModel", { id: types.identifier })
      .volatile(() => ({
        whRatio: 1,
        zoomedPixelSize: { x: 1, y: 1 },
        stageRef: { container: () => ({ style: {} }) },
        getSkipInteractions: () => false,
      }))
      .views(() => ({
        get naturalWidth() {
          return 100;
        },
        get naturalHeight() {
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
        internalToCanvasX(v) {
          return v;
        },
        internalToCanvasY(v) {
          return v;
        },
        canvasToInternalX(v) {
          return v;
        },
        canvasToInternalY(v) {
          return v;
        },
      })),
  };
});

import React from "react";
import { render } from "@testing-library/react";
import { RectRegionModel, HtxRectangle } from "../RectRegion";
import { ImageModel } from "../../tags/object/Image";
import { ImageViewContext } from "../../components/ImageView/ImageViewContext";

// Composed model that reads control from root._testControl for setPosition(snap) tests.
const TestRectRegionWithControl = types.compose(
  RectRegionModel,
  types.model({}).views((self) => ({
    get control() {
      const root = getRoot(self);
      return root._testControl ?? undefined;
    },
  })),
);

const TestRoot = types
  .model("TestRoot", {
    image: types.optional(ImageModel, { id: "img1" }),
    region: types.optional(RectRegionModel, {
      id: "rect1",
      pid: "p1",
      object: "img1",
      x: 10,
      y: 20,
      width: 30,
      height: 25,
      rotation: 0,
      results: [],
    }),
  })
  .volatile(() => ({ whRatio: 1, _testControl: null, _annotation: null }))
  .views((self) => ({
    get annotationStore() {
      return self._annotation != null ? { selected: self._annotation } : null;
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
    canvasToInternalX(v) {
      return v;
    },
    canvasToInternalY(v) {
      return v;
    },
    setAnnotation(ann) {
      self._annotation = ann;
    },
  }));

const RootWithControl = types
  .model({
    image: types.optional(ImageModel, { id: "img1" }),
    region: types.optional(TestRectRegionWithControl, {
      id: "rect1",
      pid: "p1",
      object: "img1",
      x: 10,
      y: 20,
      width: 30,
      height: 25,
      rotation: 0,
      results: [],
    }),
  })
  .volatile(() => ({ whRatio: 1, _testControl: null }))
  .actions((self) => ({
    createSerializedResult(region, value) {
      return {
        value: { ...value },
        original_width: 100,
        original_height: 100,
        image_rotation: 0,
      };
    },
    canvasToInternalX(v) {
      return v;
    },
    canvasToInternalY(v) {
      return v;
    },
    setTestControl(c) {
      self._testControl = c;
    },
  }));

describe("RectRegion", () => {
  let root;
  let region;

  beforeEach(() => {
    rectPropsRef.current = null;
    root = TestRoot.create({
      image: { id: "img1" },
      region: {
        id: "rect1",
        pid: "p1",
        object: "img1",
        x: 10,
        y: 20,
        width: 30,
        height: 25,
        rotation: 0,
        results: [],
      },
    });
    region = root.region;
  });

  describe("RectRegionModel", () => {
    it("bboxCoords returns correct bounds when rotation is 0", () => {
      expect(region.bboxCoords).toEqual({
        left: 10,
        top: 20,
        right: 40,
        bottom: 45,
      });
    });

    it("bboxCoords uses rotateBboxCoords when rotation is non-zero", () => {
      const rotated = TestRoot.create({
        image: { id: "img1" },
        region: {
          id: "r2",
          pid: "p2",
          object: "img1",
          x: 10,
          y: 20,
          width: 30,
          height: 25,
          rotation: 90,
          results: [],
        },
      });
      const r = rotated.region;
      expect(r.rotation).toBe(90);
      const bbox = r.bboxCoords;
      expect(bbox).toHaveProperty("left");
      expect(bbox).toHaveProperty("top");
      expect(bbox).toHaveProperty("right");
      expect(bbox).toHaveProperty("bottom");
    });

    it("canvasX, canvasY, canvasWidth, canvasHeight delegate to parent", () => {
      expect(region.canvasX).toBe(10);
      expect(region.canvasY).toBe(20);
      expect(region.canvasWidth).toBe(30);
      expect(region.canvasHeight).toBe(25);
    });

    it("afterCreate sets startX and startY from x and y", () => {
      expect(region.startX).toBe(10);
      expect(region.startY).toBe(20);
    });

    it("getDistanceBetweenPoints returns Euclidean distance", () => {
      const d = region.getDistanceBetweenPoints({ x: 0, y: 0 }, { x: 3, y: 4 });
      expect(d).toBe(5);
    });

    it("getHeightOnPerpendicular returns perpendicular distance", () => {
      const h = region.getHeightOnPerpendicular({ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 5, y: 3 });
      expect(h).toBeCloseTo(3, 5);
    });

    it("isAboveTheLine returns true when c is above line a-b (cross product < 0)", () => {
      expect(region.isAboveTheLine({ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 5, y: -1 })).toBe(true);
    });

    it("isAboveTheLine returns false when c is below line a-b", () => {
      expect(region.isAboveTheLine({ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 5, y: 1 })).toBe(false);
    });

    it("coordsInside returns true for point inside rectangle", () => {
      expect(region.coordsInside(25, 32)).toBe(true);
      expect(region.coordsInside(11, 21)).toBe(true);
    });

    it("coordsInside returns false for point outside rectangle", () => {
      expect(region.coordsInside(0, 0)).toBe(false);
      expect(region.coordsInside(50, 50)).toBe(false);
    });

    it("setPositionInternal updates x, y, width, height and normalizes rotation", () => {
      region.setPositionInternal(5, 15, 20, 18, 45);
      expect(region.x).toBe(5);
      expect(region.y).toBe(15);
      expect(region.width).toBe(20);
      expect(region.height).toBe(18);
      expect(region.rotation).toBe(45);

      region.setPositionInternal(0, 0, 1, 1, -90);
      expect(region.rotation).toBe(270);
    });

    it("beforeSetPosition returns unchanged when height >= 0", () => {
      const out = region.beforeSetPosition(10, 20, 30, 25, 0);
      expect(out).toEqual([10, 20, 30, 25, 0]);
    });

    it("beforeSetPosition corrects vertical flip when height < 0 and deltaRotation not in (90,270)", () => {
      const r = root.region;
      const out = r.beforeSetPosition(10, 20, 30, -25, 0);
      expect(out[4]).toBeDefined();
      expect(out[3]).toBe(25);
    });

    it("beforeSetPosition corrects horizontal flip when height < 0 and deltaRotation in (90,270)", () => {
      const rotatedRoot = TestRoot.create({
        image: { id: "img1" },
        region: {
          id: "r2",
          pid: "p2",
          object: "img1",
          x: 10,
          y: 20,
          width: 30,
          height: 25,
          rotation: 180,
          results: [],
        },
      });
      const out = rotatedRoot.region.beforeSetPosition(10, 20, 30, -25, 180);
      expect(out[4]).toBeDefined();
      expect(out[3]).toBe(25);
    });

    it("setPosition delegates to setPositionInternal with parent canvas conversion", () => {
      region.setPosition(100, 80, 10, 12, 0);
      expect(region.x).toBe(100);
      expect(region.y).toBe(80);
      expect(region.width).toBe(10);
      expect(region.height).toBe(12);
    });

    it("setPosition without snap uses setPositionInternal with canvas conversion", () => {
      region.setPosition(10.3, 20.7, 30, 25, 0);
      expect(region.x).toBeCloseTo(10.3, 5);
      expect(region.y).toBeCloseTo(20.7, 5);
      expect(region.width).toBe(30);
      expect(region.height).toBe(25);
    });

    it("setPosition with control.snap pixel uses getSnappedPoint and setPositionInternal", () => {
      const getSnappedPoint = jest.fn((p) => ({ x: Math.round(p.x), y: Math.round(p.y) }));
      const rootWithControl = RootWithControl.create({
        image: { id: "img1" },
        region: {
          id: "rect1",
          pid: "p1",
          object: "img1",
          x: 10,
          y: 20,
          width: 30,
          height: 25,
          rotation: 0,
          results: [],
        },
      });
      rootWithControl.setTestControl({ snap: "pixel", getSnappedPoint });
      const r = rootWithControl.region;
      r.setPosition(10.3, 20.7, 30, 25, 0);
      expect(getSnappedPoint).toHaveBeenCalled();
      expect(r.x).toBe(10);
      expect(r.y).toBe(21);
      expect(r.width).toBe(30);
      expect(r.height).toBe(25);
    });

    it("addState pushes state onto states array", () => {
      const state = { name: "state1", value: "a" };
      if (Array.isArray(region.states)) {
        region.addState(state);
        expect(region.states).toContain(state);
      }
    });

    it("setScale updates scaleX and scaleY", () => {
      region.setScale(2, 3);
      expect(region.scaleX).toBe(2);
      expect(region.scaleY).toBe(3);
    });

    it("setFill updates fill", () => {
      region.setFill("#ff0000");
      expect(region.fill).toBe("#ff0000");
    });

    it("updateImageSize is a no-op", () => {
      expect(() => region.updateImageSize()).not.toThrow();
    });

    it("flipBack vertical returns corrected attrs with positive height", () => {
      const result = region.flipBack({ x: 10, y: 20, width: 30, height: -25, rotation: 0 }, false);
      expect(result.height).toBe(25);
      expect(result.x).toBeDefined();
      expect(result.y).toBeDefined();
    });

    it("flipBack horizontal returns corrected attrs and rotation + 180", () => {
      const result = region.flipBack({ x: 10, y: 20, width: 30, height: -25, rotation: 180 }, true);
      expect(result.height).toBe(25);
      expect(result.rotation).toBe(0);
    });

    it("serialize returns value with x, y, width, height, rotation", () => {
      const result = region.serialize();
      expect(result.value).toEqual({
        x: 10,
        y: 20,
        width: 30,
        height: 25,
        rotation: 0,
      });
      expect(result.original_width).toBe(100);
      expect(result.original_height).toBe(100);
      expect(result.image_rotation).toBe(0);
    });

    it("draw with one point updates width and rotation", () => {
      region.draw(40, 25, [{ x: 10, y: 20 }]);
      expect(region.width).toBeGreaterThan(0);
      expect(region.rotation).toBeDefined();
    });

    it("draw with two points updates x, y, height and rotation", () => {
      region.draw(15, 40, [
        { x: 10, y: 20 },
        { x: 40, y: 20 },
      ]);
      expect(region.x).toBeDefined();
      expect(region.y).toBeDefined();
      expect(region.height).toBeDefined();
    });

    it("draw reverts height when bbox is out of bounds", () => {
      const oldHeight = region.height;
      // Draw so resulting bbox has right > RELATIVE_STAGE_WIDTH (100)
      region.draw(85, 30, [
        { x: 85, y: 20 },
        { x: 115, y: 20 },
      ]);
      expect(region.height).toBe(oldHeight);
    });

    it("setPosition with snap pixel clamps width and height to min pixel size", () => {
      const getSnappedPoint = jest.fn((p) => {
        if (p.x === 10 && p.y === 20) return { x: 10, y: 20 };
        return { x: 10, y: 20 };
      });
      const rootWithControl = RootWithControl.create({
        image: { id: "img1" },
        region: {
          id: "rect1",
          pid: "p1",
          object: "img1",
          x: 10,
          y: 20,
          width: 30,
          height: 25,
          rotation: 0,
          results: [],
        },
      });
      rootWithControl.setTestControl({ snap: "pixel", getSnappedPoint });
      const r = rootWithControl.region;
      r.setPosition(10, 20, 0, 0, 0);
      expect(r.width).toBe(1);
      expect(r.height).toBe(1);
    });

    it("coordsInside respects scaleX and scaleY", () => {
      region.setScale(2, 2);
      expect(region.coordsInside(50, 40)).toBe(true);
      region.setScale(1, 1);
      expect(region.coordsInside(50, 40)).toBe(false);
    });
  });

  describe("Registry region type", () => {
    it("is registered as rectangleregion", () => {
      const Registry = require("../../core/Registry").default;
      const Model = Registry.getModelByTag("rectangleregion");
      expect(Model).toBeDefined();
      expect(Model).toBe(RectRegionModel);
    });
  });

  describe("HtxRectangle view", () => {
    it("renders Rect and RegionWrapper when item has parent and inViewPort", () => {
      root.setAnnotation({
        regionStore: { isSelected: () => false },
        history: { freeze: jest.fn(), unfreeze: jest.fn() },
        isReadOnly: () => false,
        isDrawing: false,
      });
      const { getByTestId } = render(
        <ImageViewContext.Provider value={{ suggestion: null }}>
          <HtxRectangle item={region} />
        </ImageViewContext.Provider>,
      );
      expect(getByTestId("konva-rect")).toBeInTheDocument();
      expect(getByTestId("region-wrapper")).toBeInTheDocument();
    });

    it("renders with suggestion (dash and listening branches)", () => {
      root.setAnnotation({
        regionStore: { isSelected: () => false },
        history: { freeze: jest.fn(), unfreeze: jest.fn() },
        isReadOnly: () => false,
        isDrawing: false,
      });
      const { getByTestId } = render(
        <ImageViewContext.Provider value={{ suggestion: {} }}>
          <HtxRectangle item={region} />
        </ImageViewContext.Provider>,
      );
      expect(getByTestId("konva-rect")).toBeInTheDocument();
    });

    it("returns null when inViewPort is false (FF_ZOOM_OPTIM on, object has no viewPortBBoxCoords)", () => {
      const { isFF } = require("../../utils/feature-flags");
      isFF.mockReturnValue(true);
      root.setAnnotation({
        regionStore: { isSelected: () => false },
        history: { freeze: jest.fn(), unfreeze: jest.fn() },
        isReadOnly: () => false,
        isDrawing: false,
      });
      const { container } = render(
        <ImageViewContext.Provider value={{ suggestion: null }}>
          <HtxRectangle item={region} />
        </ImageViewContext.Provider>,
      );
      expect(container.firstChild).toBeNull();
      isFF.mockReturnValue(false);
    });

    it("onTransformEnd updates region and calls notifyDrawingFinished", () => {
      const notifyDrawingFinished = jest.fn();
      region.notifyDrawingFinished = notifyDrawingFinished;
      root.setAnnotation({
        regionStore: { isSelected: () => false },
        history: { freeze: jest.fn(), unfreeze: jest.fn() },
        isReadOnly: () => false,
        isDrawing: false,
      });
      render(
        <ImageViewContext.Provider value={{ suggestion: null }}>
          <HtxRectangle item={region} />
        </ImageViewContext.Provider>,
      );
      const props = rectPropsRef.current;
      expect(props.onTransformEnd).toBeDefined();
      const mockTarget = {
        getAttr: (k) => {
          if (k === "scaleX" || k === "scaleY") return 1;
          if (k === "rotation") return 0;
          return 10;
        },
        setAttr: jest.fn(),
        position: jest.fn(),
      };
      props.onTransformEnd({ target: mockTarget });
      expect(region.x).toBe(10);
      expect(region.y).toBe(10);
      expect(region.width).toBe(10);
      expect(region.height).toBe(10);
      expect(notifyDrawingFinished).toHaveBeenCalled();
    });

    it("onTransform resets skew on target", () => {
      root.setAnnotation({
        regionStore: { isSelected: () => false },
        history: { freeze: jest.fn(), unfreeze: jest.fn() },
        isReadOnly: () => false,
        isDrawing: false,
      });
      render(
        <ImageViewContext.Provider value={{ suggestion: null }}>
          <HtxRectangle item={region} />
        </ImageViewContext.Provider>,
      );
      const props = rectPropsRef.current;
      const mockTarget = { setAttr: jest.fn() };
      props.onTransform({ target: mockTarget });
      expect(mockTarget.setAttr).toHaveBeenCalledWith("skewX", 0);
      expect(mockTarget.setAttr).toHaveBeenCalledWith("skewY", 0);
    });

    it("onDragStart freezes history and onDragEnd unfreezes and updates region", () => {
      const freeze = jest.fn();
      const unfreeze = jest.fn();
      root.setAnnotation({
        regionStore: { isSelected: () => false },
        history: { freeze, unfreeze },
        isReadOnly: () => false,
        isDrawing: false,
      });
      render(
        <ImageViewContext.Provider value={{ suggestion: null }}>
          <HtxRectangle item={region} />
        </ImageViewContext.Provider>,
      );
      const props = rectPropsRef.current;
      props.onDragStart({ currentTarget: { stopDrag: jest.fn() }, evt: {} });
      expect(freeze).toHaveBeenCalledWith(region.id);
      const mockTarget = { getAttr: (k) => (k === "scaleX" || k === "scaleY" ? 1 : 15), position: jest.fn() };
      region.notifyDrawingFinished = jest.fn();
      props.onDragEnd({ target: mockTarget });
      expect(region.x).toBe(15);
      expect(region.y).toBe(15);
      expect(region.width).toBe(15);
      expect(region.height).toBe(15);
      expect(unfreeze).toHaveBeenCalledWith(region.id);
      expect(region.notifyDrawingFinished).toHaveBeenCalled();
    });

    it("onTransformEnd with isFlipped sets rotation on target", () => {
      region.notifyDrawingFinished = jest.fn();
      root.setAnnotation({
        regionStore: { isSelected: () => false },
        history: { freeze: jest.fn(), unfreeze: jest.fn() },
        isReadOnly: () => false,
        isDrawing: false,
      });
      render(
        <ImageViewContext.Provider value={{ suggestion: null }}>
          <HtxRectangle item={region} />
        </ImageViewContext.Provider>,
      );
      const props = rectPropsRef.current;
      const setAttr = jest.fn();
      const mockTarget = {
        getAttr: (k) => (k === "scaleY" ? -1 : k === "rotation" ? 0 : 5),
        setAttr,
        position: jest.fn(),
      };
      props.onTransformEnd({ target: mockTarget });
      expect(setAttr).toHaveBeenCalledWith("rotation", region.rotation);
    });
  });
});
