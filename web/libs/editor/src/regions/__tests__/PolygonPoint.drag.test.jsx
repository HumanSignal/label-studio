import { act, render } from "@testing-library/react";

const shapeProps = { current: null };

import { PolygonPointView } from "../PolygonPoint";

// These tests exercise the view's event contract, not real Konva pointer routing.
describe("PolygonPoint drag cancellation", () => {
  let originalShapes;
  let originalRegionStyles;

  beforeAll(() => {
    const { Circle, Rect } = require("react-konva");
    originalShapes = { Circle, Rect };
    originalRegionStyles = require("../../hooks/useRegionColor").useRegionStyles;

    mockModule("react-konva", () => {
      const Shape = (props) => {
        shapeProps.current = props;
        return <div />;
      };
      return { Circle: Shape, Rect: Shape };
    });
    mockModule("../../hooks/useRegionColor", () => ({
      useRegionStyles: () => ({ strokeColor: "#000" }),
    }));
  });

  afterAll(() => {
    // Bun's mock.restore() does not restore module mocks. Preserve whatever
    // implementations were installed before this suite, including shared mocks.
    mockModule("react-konva", () => originalShapes);
    mockModule("../../hooks/useRegionColor", () => ({ useRegionStyles: originalRegionStyles }));
    shapeProps.current = null;
  });
  for (const style of ["circle", "rectangle"]) {
    describe(style, () => {
      let item;
      let skipInteractions;

      beforeEach(() => {
        skipInteractions = false;
        item = {
          index: 1,
          style,
          size: "small",
          x: 10,
          y: 10,
          canvasX: 10,
          canvasY: 10,
          parent: { isReadOnly: () => false },
          stage: { zoomScale: 1, stageWidth: 100, stageHeight: 100 },
          annotation: { history: { freeze: mock(), unfreeze: mock() } },
          getSkipInteractions: () => skipInteractions,
          _movePoint: mock(),
        };
      });

      it("cancels Pan drags without disabling the vertex after Pan is turned off", () => {
        const { rerender } = render(<PolygonPointView item={item} name="point" />);

        for (let attempt = 0; attempt < 3; attempt++) {
          skipInteractions = true;
          const evt = { type: "mousemove" };
          const endEvent = { cancelBubble: false };
          const node = {
            // Konva stopDrag emits dragend synchronously, while its handler is
            // still installed; changing the draggable prop can lose that event.
            stopDrag: mock(() => shapeProps.current.onDragEnd(endEvent)),
          };

          act(() => shapeProps.current.onDragStart({ target: node, currentTarget: node, evt }));
          act(() => shapeProps.current.onDragMove({ target: node, currentTarget: node }));

          expect(node.stopDrag).toHaveBeenCalledWith(evt);
          expect(endEvent.cancelBubble).toBe(true);
          expect(item.annotation.history.freeze).not.toHaveBeenCalled();
          expect(item._movePoint).not.toHaveBeenCalled();
          expect(shapeProps.current.draggable).toBe(true);

          skipInteractions = false;
          rerender(<PolygonPointView item={item} name={`point-${attempt}`} />);
          expect(shapeProps.current.draggable).toBe(true);
        }

        const node = { attrs: { x: 20, y: 30 }, setAttr: mock(), stopDrag: mock() };
        act(() => shapeProps.current.onDragStart({ target: node, currentTarget: node, evt: {} }));
        act(() => shapeProps.current.onDragMove({ target: node, currentTarget: node }));
        expect(item._movePoint).toHaveBeenCalledWith(20, 30);
        expect(item.annotation.history.freeze).toHaveBeenCalledTimes(1);
        act(() => shapeProps.current.onDragEnd({ cancelBubble: false }));
      });

      it("continues to freeze and unfreeze history for an editable vertex drag", () => {
        render(<PolygonPointView item={item} name="point" />);
        const node = { stopDrag: mock() };
        const endEvent = { cancelBubble: false };

        act(() => shapeProps.current.onDragStart({ target: node, currentTarget: node, evt: {} }));
        expect(node.stopDrag).not.toHaveBeenCalled();
        expect(item.annotation.history.freeze).toHaveBeenCalledTimes(1);

        act(() => shapeProps.current.onDragEnd(endEvent));
        expect(item.annotation.history.unfreeze).toHaveBeenCalledTimes(1);
        expect(endEvent.cancelBubble).toBe(true);
        expect(shapeProps.current.draggable).toBe(true);
      });

      it("does not enable dragging for a read-only vertex", () => {
        item.parent.isReadOnly = () => true;
        render(<PolygonPointView item={item} name="point" />);
        expect(shapeProps.current.draggable).toBe(false);
      });
    });
  }
});
