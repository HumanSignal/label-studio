/**
 * Unit tests for AudioRegionModel (regions/AudioRegion/AudioRegionModel.js).
 * Covers model views (bboxTriggers, bboxCoordsCanvas, wsRegionOptions) and actions (serialize, getColor, updateColor, updatePosition, selectRegion, deleteRegion, afterUnselectRegion, setHighlight, beforeDestroy, setLocked, onMouseOver, onMouseLeave, onUpdateEnd, toggleHidden, setProperty, setWSRegion).
 */
import { types } from "mobx-state-tree";

jest.mock("../../../tags/object/Audio/model", () => {
  const { types } = require("mobx-state-tree");
  return {
    AudioModel: types
      .model("AudioModel", {
        id: types.identifier,
      })
      .volatile(() => ({
        _ws: { duration: 12.5 },
        _wfFrame: null,
      })),
  };
});

import { AudioRegionModel } from "../AudioRegionModel";
import { AudioRegionModel as ComposedAudioRegionModel } from "../../AudioRegion";
import { AudioModel } from "../../../tags/object/Audio/model";

function createMockAnnotation(overrides = {}) {
  return {
    deleteRegion: jest.fn(),
    isLinkingMode: false,
    isReadOnly: () => false,
    ...overrides,
  };
}

const TestRoot = types
  .model("TestRoot", {
    annotationStore: types.optional(
      types.model({
        selected: types.frozen(),
      }),
      { selected: createMockAnnotation() },
    ),
    audio: types.optional(AudioModel, { id: "a1" }),
    region: types.optional(ComposedAudioRegionModel, {
      id: "ar1",
      pid: "p1",
      object: "a1",
      start: 1.5,
      end: 5.2,
      channel: 0,
    }),
  })
  .actions((self) => ({
    setAnnotation(ann) {
      self.annotationStore.selected = ann;
    },
  }));

describe("AudioRegionModel", () => {
  describe("base model (AudioRegion/AudioRegionModel.js)", () => {
    let root;
    let region;

    beforeEach(() => {
      root = TestRoot.create({
        annotationStore: { selected: createMockAnnotation() },
        audio: { id: "a1" },
        region: {
          id: "ar1",
          pid: "p1",
          object: "a1",
          start: 1.5,
          end: 5.2,
          channel: 0,
        },
      });
      region = root.region;
    });

    describe("serialize", () => {
      it("returns original_length from object._ws.duration and value with start, end, channel", () => {
        const result = region.serialize();
        expect(result.original_length).toBe(12.5);
        expect(result.value).toEqual({
          start: 1.5,
          end: 5.2,
          channel: 0,
        });
      });

      it("includes value.start, value.end, value.channel in result", () => {
        const result = region.serialize();
        expect(result.value).toHaveProperty("start", 1.5);
        expect(result.value).toHaveProperty("end", 5.2);
        expect(result.value).toHaveProperty("channel", 0);
      });
    });

    describe("bboxTriggers", () => {
      it("returns array of start, end, _ws_region, object._ws, object._wfFrame", () => {
        expect(region.bboxTriggers).toEqual([
          region.start,
          region.end,
          region._ws_region,
          root.audio._ws,
          root.audio._wfFrame,
        ]);
      });
    });

    describe("bboxCoordsCanvas", () => {
      it("returns null when _ws_region is null", () => {
        expect(region._ws_region).toBeNull();
        expect(region.bboxCoordsCanvas).toBeNull();
      });

      it("returns null when _ws_region.inViewport is false", () => {
        region.setWSRegion({
          on: jest.fn(),
          inViewport: false,
          xStart: 10,
          xEnd: 50,
          yStart: 0,
          yEnd: 20,
          visualizer: { width: 100 },
        });
        expect(region.bboxCoordsCanvas).toBeNull();
      });

      it("returns clamped coords when _ws_region in viewport", () => {
        region.setWSRegion({
          on: jest.fn(),
          inViewport: true,
          xStart: 10,
          xEnd: 90,
          yStart: 5,
          yEnd: 25,
          visualizer: { width: 100 },
        });
        const coords = region.bboxCoordsCanvas;
        expect(coords).toEqual({
          left: 10,
          top: 5,
          right: 90,
          bottom: 25,
        });
      });

      it("clamps left/right to visualizer width", () => {
        region.setWSRegion({
          on: jest.fn(),
          inViewport: true,
          xStart: -10,
          xEnd: 150,
          yStart: 0,
          yEnd: 20,
          visualizer: { width: 100 },
        });
        const coords = region.bboxCoordsCanvas;
        expect(coords.left).toBe(0);
        expect(coords.right).toBe(100);
      });
    });

    describe("wsRegionOptions", () => {
      it("returns object with id, start, end, color, visible, updateable, deletable, channel", () => {
        const opts = region.wsRegionOptions();
        expect(opts.id).toBe(region.id);
        expect(opts.start).toBe(1.5);
        expect(opts.end).toBe(5.2);
        expect(opts.visible).toBe(true);
        expect(opts.updateable).toBe(true);
        expect(opts.deletable).toBe(true);
        expect(opts.channel).toBe(0);
        expect(typeof opts.color).toBe("string");
      });
    });

    describe("getColor", () => {
      it("returns RGBA string for default alpha 1", () => {
        const color = region.getColor();
        expect(color).toMatch(/^rgba?\(/);
      });

      it("accepts alpha parameter", () => {
        const color = region.getColor(0.5);
        expect(color).toMatch(/^rgba?\(/);
      });
    });

    describe("updateColor", () => {
      it("does not throw when _ws_region is null", () => {
        expect(() => region.updateColor()).not.toThrow();
      });

      it("calls _ws_region.updateColor when set", () => {
        const updateColor = jest.fn();
        region.setWSRegion({ on: jest.fn(), updateColor });
        region.updateColor(0.8);
        expect(updateColor).toHaveBeenCalledWith(expect.any(String));
      });
    });

    describe("updatePosition", () => {
      it("does not throw when _ws_region is null", () => {
        expect(() => region.updatePosition()).not.toThrow();
        expect(() => region.updatePosition(2, 6)).not.toThrow();
      });

      it("calls _ws_region.updatePosition with start and end", () => {
        const updatePosition = jest.fn();
        region.setWSRegion({ on: jest.fn(), updatePosition });
        region.updatePosition(2, 7);
        expect(updatePosition).toHaveBeenCalledWith(2, 7);
      });

      it("uses self.start/self.end when args omitted", () => {
        const updatePosition = jest.fn();
        region.setWSRegion({ on: jest.fn(), updatePosition });
        region.updatePosition();
        expect(updatePosition).toHaveBeenCalledWith(1.5, 5.2);
      });
    });

    describe("selectRegion", () => {
      it("does nothing when _ws_region is null", () => {
        expect(() => region.selectRegion()).not.toThrow();
      });

      it("calls handleSelected, bringToFront, scrollToRegion when _ws_region set", () => {
        const handleSelected = jest.fn();
        const bringToFront = jest.fn();
        const scrollToRegion = jest.fn();
        region.setWSRegion({
          on: jest.fn(),
          handleSelected,
          bringToFront,
          scrollToRegion,
        });
        region.selectRegion();
        expect(handleSelected).toHaveBeenCalledWith(true);
        expect(bringToFront).toHaveBeenCalled();
        expect(scrollToRegion).toHaveBeenCalled();
      });
    });

    describe("deleteRegion", () => {
      it("calls annotation.deleteRegion with self", () => {
        region.deleteRegion();
        expect(root.annotationStore.selected.deleteRegion).toHaveBeenCalledWith(region);
      });
    });

    describe("afterUnselectRegion", () => {
      it("does nothing when _ws_region is null", () => {
        expect(() => region.afterUnselectRegion()).not.toThrow();
      });

      it("calls _ws_region.handleSelected(false) when set", () => {
        const handleSelected = jest.fn();
        region.setWSRegion({ on: jest.fn(), handleSelected });
        region.afterUnselectRegion();
        expect(handleSelected).toHaveBeenCalledWith(false);
      });
    });

    describe("setHighlight", () => {
      it("sets _highlighted and does nothing when _ws_region is null", () => {
        region.setHighlight(true);
        expect(region._highlighted).toBe(true);
        region.setHighlight(false);
        expect(region._highlighted).toBe(false);
      });

      it("calls _ws_region.handleHighlighted when set", () => {
        const handleHighlighted = jest.fn();
        region.setWSRegion({ on: jest.fn(), handleHighlighted });
        region.setHighlight(true);
        expect(handleHighlighted).toHaveBeenCalledWith(true);
      });
    });

    describe("beforeDestroy", () => {
      it("does nothing when _ws_region is null", () => {
        expect(() => region.beforeDestroy()).not.toThrow();
      });

      it("calls _ws_region.remove when set", () => {
        const remove = jest.fn();
        region.setWSRegion({ on: jest.fn(), remove });
        region.beforeDestroy();
        expect(remove).toHaveBeenCalled();
      });
    });

    describe("setLocked", () => {
      it("updates locked and calls _ws_region.setLocked when set", () => {
        const setLocked = jest.fn();
        region.setWSRegion({ on: jest.fn(), setLocked });
        region.setLocked(true);
        expect(region.locked).toBe(true);
        expect(setLocked).toHaveBeenCalledWith(true);
      });
    });

    describe("onMouseOver", () => {
      it("does nothing when _ws_region is null", () => {
        expect(() => region.onMouseOver()).not.toThrow();
      });

      it("when annotation.isLinkingMode sets highlight and switchCursor", () => {
        root.setAnnotation(createMockAnnotation({ isLinkingMode: true }));
        const switchCursor = jest.fn();
        const handleHighlighted = jest.fn();
        region.setWSRegion({ on: jest.fn(), switchCursor, handleHighlighted });
        region.onMouseOver();
        expect(region._highlighted).toBe(true);
        expect(switchCursor).toHaveBeenCalledWith("crosshair");
      });
    });

    describe("onMouseLeave", () => {
      it("when annotation.isLinkingMode clears highlight and switchCursor", () => {
        root.setAnnotation(createMockAnnotation({ isLinkingMode: true }));
        const switchCursor = jest.fn();
        const handleHighlighted = jest.fn();
        region.setWSRegion({ on: jest.fn(), switchCursor, handleHighlighted });
        region.setHighlight(true);
        region.onMouseLeave();
        expect(region._highlighted).toBe(false);
        expect(switchCursor).toHaveBeenCalledWith("hand");
      });
    });

    describe("onUpdateEnd", () => {
      it("updates start/end from _ws_region and calls notifyDrawingFinished", () => {
        const notifyDrawingFinished = jest.fn();
        region.notifyDrawingFinished = notifyDrawingFinished;
        region.setWSRegion({ on: jest.fn(), start: 2, end: 6 });
        region.onUpdateEnd();
        expect(region.start).toBe(2);
        expect(region.end).toBe(6);
        expect(notifyDrawingFinished).toHaveBeenCalled();
      });
    });

    describe("toggleHidden", () => {
      it("toggles hidden and does nothing when _ws_region is null", () => {
        expect(region.hidden).toBe(false);
        region.toggleHidden();
        expect(region.hidden).toBe(true);
        region.toggleHidden();
        expect(region.hidden).toBe(false);
      });

      it("accepts event and stops propagation", () => {
        const e = { stopPropagation: jest.fn() };
        region.toggleHidden(e);
        expect(e.stopPropagation).toHaveBeenCalled();
      });

      it("calls _ws_region.setVisibility when set", () => {
        const setVisibility = jest.fn();
        region.setWSRegion({ on: jest.fn(), setVisibility });
        region.toggleHidden();
        expect(region.hidden).toBe(true);
        expect(setVisibility).toHaveBeenCalledWith(false);
      });
    });

    describe("setProperty", () => {
      it("updates position when start or end changed", () => {
        const updatePosition = jest.fn();
        region.setWSRegion({ on: jest.fn(), updatePosition });
        region.setProperty("start", 2);
        expect(region.start).toBe(2);
        expect(updatePosition).toHaveBeenCalled();
        region.setProperty("end", 8);
        expect(region.end).toBe(8);
      });
    });

    describe("setWSRegion", () => {
      it("sets _ws_region and attaches mouseOver/mouseLeave when wsRegion provided", () => {
        const on = jest.fn();
        const wsRegion = { on };
        region.setWSRegion(wsRegion);
        expect(region._ws_region).toBe(wsRegion);
        expect(on).toHaveBeenCalledWith("mouseOver", region.onMouseOver);
        expect(on).toHaveBeenCalledWith("mouseLeave", region.onMouseLeave);
      });

      it("allows setting null", () => {
        region.setWSRegion({ on: jest.fn() });
        region.setWSRegion(null);
        expect(region._ws_region).toBeNull();
      });
    });
  });
});
