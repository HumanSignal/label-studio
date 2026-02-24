/**
 * Unit tests for VideoRegions.jsx (tags/object/Video/VideoRegions.jsx)
 */
import React from "react";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { VideoRegions, MIN_SIZE } from "../VideoRegions";

jest.mock("chroma-js", () => ({
  __esModule: true,
  default: () => ({
    alpha: () => ({
      css: () => "rgba(97,122,218,0.1)",
    }),
  }),
}));

jest.mock("mobx-state-tree", () => ({
  ...jest.requireActual("mobx-state-tree"),
  getParentOfType: jest.fn(() => null),
}));

jest.mock("../../../../utils/utilities", () => ({
  fixMobxObserve: jest.fn(),
}));

const mockCreateBoundingBoxGetter = jest.fn(() => () => (oldBox, newBox) => newBox);
const mockCreateOnDragMoveHandler = jest.fn(() => () => {});

jest.mock("../TransformTools", () => ({
  createBoundingBoxGetter: (...args) => mockCreateBoundingBoxGetter(...args),
  createOnDragMoveHandler: (...args) => mockCreateOnDragMoveHandler(...args),
}));

jest.mock("../Rectangle", () => {
  const React = require("react");
  return {
    Rectangle: ({ id, reg, onClick, ...rest }) => (
      <div data-testid={`rectangle-${id}`} data-reg-id={reg?.id} onClick={onClick} {...rest} />
    ),
  };
});

jest.mock("react-konva", () => {
  const React = require("react");
  function withKonvaEvt(handler) {
    if (!handler) return undefined;
    return (e) => {
      const n = e?.nativeEvent ?? e;
      const evt = e?.evt ?? {
        offsetX: n?.offsetX ?? n?.clientX ?? 0,
        offsetY: n?.offsetY ?? n?.clientY ?? 0,
      };
      handler({ ...e, evt });
    };
  }
  const MockRect = React.forwardRef((props, ref) => <div ref={ref} data-testid="mock-rect" {...props} />);
  const MockLayer = ({ children, ...props }) => (
    <div data-testid="mock-layer" {...props}>
      {children}
    </div>
  );
  const MockTransformer = React.forwardRef((props, ref) => {
    const { ref: initRef, ...rest } = props;
    React.useEffect(() => {
      if (ref) {
        ref.current = {
          getStage: () => ({ findOne: () => null }),
          nodes: () => [],
          getLayer: () => ({ batchDraw: jest.fn() }),
        };
        if (typeof initRef === "function") initRef(ref.current);
        else if (initRef) initRef.current = ref.current;
      }
    }, [ref, initRef]);
    return <div data-testid="mock-transformer" {...rest} />;
  });
  return {
    Stage: React.forwardRef(({ children, onMouseDown, onMouseMove, onMouseUp, ...props }, ref) => (
      <div
        ref={ref}
        data-testid="stage"
        {...props}
        onMouseDown={withKonvaEvt(onMouseDown)}
        onMouseMove={withKonvaEvt(onMouseMove)}
        onMouseUp={withKonvaEvt(onMouseUp)}
      >
        {children}
      </div>
    )),
    Layer: MockLayer,
    Rect: MockRect,
    Transformer: MockTransformer,
  };
});

function createMockRegion(overrides = {}) {
  return {
    id: "reg-1",
    selected: false,
    inSelection: false,
    hidden: false,
    locked: false,
    sequence: [],
    isReadOnly: () => false,
    isInLifespan: () => true,
    getShape: () => ({ x: 10, y: 10, width: 50, height: 50, rotation: 0 }),
    setHighlight: jest.fn(),
    onClickRegion: jest.fn(),
    ...overrides,
  };
}

function createMockItem(overrides = {}) {
  const annotation = {
    isReadOnly: () => false,
    unselectAreas: jest.fn(),
    ...overrides.annotation,
  };
  return {
    frame: 1,
    annotation,
    addVideoRegion: jest.fn(),
    ...overrides,
  };
}

const defaultWorkingArea = { width: 800, height: 600 };
const defaultProps = {
  item: createMockItem(),
  regions: [],
  width: 800,
  height: 600,
  zoom: 1,
  workingArea: defaultWorkingArea,
  locked: false,
  allowRegionsOutsideWorkingArea: true,
  pan: { x: 0, y: 0 },
  stageRef: React.createRef(),
  currentFrame: 1,
};

describe("VideoRegions", () => {
  describe("MIN_SIZE", () => {
    it("exports MIN_SIZE as 5", () => {
      expect(MIN_SIZE).toBe(5);
    });
  });

  describe("render", () => {
    it("renders Stage with layer and no regions", () => {
      render(<VideoRegions {...defaultProps} />);
      expect(screen.getByTestId("stage")).toBeInTheDocument();
      expect(screen.getByTestId("mock-layer")).toBeInTheDocument();
    });

    it("renders with locked true and does not attach mouse handlers", () => {
      const { container } = render(<VideoRegions {...defaultProps} locked={true} />);
      const stage = screen.getByTestId("stage");
      expect(stage).toBeInTheDocument();
      fireEvent.mouseDown(stage, { offsetX: 100, offsetY: 100 });
      expect(defaultProps.item.annotation.unselectAreas).not.toHaveBeenCalled();
    });

    it("renders regions layer with region that is in lifespan", () => {
      const reg = createMockRegion({ id: "r1" });
      render(<VideoRegions {...defaultProps} regions={[reg]} />);
      expect(screen.getByTestId("rectangle-r1")).toBeInTheDocument();
    });

    it("does not render Rectangle when region is not in lifespan", () => {
      const reg = createMockRegion({ id: "r2", isInLifespan: () => false });
      render(<VideoRegions {...defaultProps} regions={[reg]} />);
      expect(screen.queryByTestId("rectangle-r2")).not.toBeInTheDocument();
    });

    it("does not render Rectangle when getShape returns null", () => {
      const reg = createMockRegion({ id: "r3", getShape: () => null });
      render(<VideoRegions {...defaultProps} regions={[reg]} />);
      expect(screen.queryByTestId("rectangle-r3")).not.toBeInTheDocument();
    });

    it("uses currentFrame when provided for Shape", () => {
      const reg = createMockRegion({ id: "r4" });
      render(<VideoRegions {...defaultProps} regions={[reg]} currentFrame={5} />);
      expect(screen.getByTestId("rectangle-r4")).toBeInTheDocument();
    });
  });

  describe("mouse drawing", () => {
    it("on stage mouseDown when not drawing calls unselectAreas and enters drawing mode", () => {
      const item = createMockItem();
      const stageRef = React.createRef();
      render(<VideoRegions {...defaultProps} item={item} stageRef={stageRef} />);
      const stage = screen.getByTestId("stage");
      stageRef.current = stage;
      fireEvent.mouseDown(stage, { clientX: 400, clientY: 300 });
      expect(item.annotation.unselectAreas).toHaveBeenCalled();
    });

    it("on stage mouseDown when target is not stageRef does nothing", () => {
      const item = createMockItem();
      const stageRef = React.createRef();
      render(<VideoRegions {...defaultProps} item={item} stageRef={stageRef} />);
      const stage = screen.getByTestId("stage");
      stageRef.current = null;
      fireEvent.mouseDown(stage, { clientX: 100, clientY: 100 });
      expect(item.annotation.unselectAreas).not.toHaveBeenCalled();
    });

    it("on stage mouseDown when annotation is readOnly does nothing", () => {
      const item = createMockItem({ annotation: { isReadOnly: () => true, unselectAreas: jest.fn() } });
      const stageRef = React.createRef();
      render(<VideoRegions {...defaultProps} item={item} stageRef={stageRef} />);
      const stage = screen.getByTestId("stage");
      stageRef.current = stage;
      fireEvent.mouseDown(stage, { clientX: 400, clientY: 300 });
      expect(item.annotation.unselectAreas).not.toHaveBeenCalled();
    });

    it("on stage mouseDown when allowRegionsOutsideWorkingArea false and click out of bounds does not start drawing", () => {
      const item = createMockItem();
      const stageRef = React.createRef();
      render(<VideoRegions {...defaultProps} item={item} stageRef={stageRef} allowRegionsOutsideWorkingArea={false} />);
      const stage = screen.getByTestId("stage");
      stageRef.current = stage;
      fireEvent.mouseDown(stage, { clientX: -50, clientY: 300 });
      expect(item.annotation.unselectAreas).not.toHaveBeenCalled();
    });

    it("mouseMove when drawing updates newRegion", () => {
      const stageRef = React.createRef();
      render(<VideoRegions {...defaultProps} stageRef={stageRef} />);
      const stage = screen.getByTestId("stage");
      stageRef.current = stage;
      fireEvent.mouseDown(stage, { clientX: 100, clientY: 100 });
      fireEvent.mouseMove(stage, { clientX: 150, clientY: 150 });
      fireEvent.mouseUp(stage, { clientX: 150, clientY: 150 });
      expect(defaultProps.item.addVideoRegion).toHaveBeenCalled();
    });

    it("mouseUp when drag smaller than MIN_SIZE does not add region", () => {
      const item = createMockItem();
      const stageRef = React.createRef();
      render(<VideoRegions {...defaultProps} item={item} stageRef={stageRef} />);
      const stage = screen.getByTestId("stage");
      stageRef.current = stage;
      fireEvent.mouseDown(stage, { clientX: 400, clientY: 300 });
      fireEvent.mouseUp(stage, { clientX: 402, clientY: 302 });
      expect(item.addVideoRegion).not.toHaveBeenCalled();
    });
  });

  describe("workinAreaCoordinates and allowRegionsOutsideWorkingArea", () => {
    it("with allowRegionsOutsideWorkingArea false passes enabled to TransformTools", () => {
      const reg = createMockRegion({ id: "sel-wa", selected: true });
      render(<VideoRegions {...defaultProps} allowRegionsOutsideWorkingArea={false} regions={[reg]} />);
      expect(screen.getByTestId("stage")).toBeInTheDocument();
      expect(mockCreateBoundingBoxGetter).toHaveBeenCalledWith(expect.anything(), true);
      expect(mockCreateOnDragMoveHandler).toHaveBeenCalledWith(expect.anything(), true);
    });

    it("with different pan and zoom computes layer position", () => {
      render(<VideoRegions {...defaultProps} pan={{ x: 10, y: 20 }} zoom={0.5} />);
      expect(screen.getByTestId("mock-layer")).toBeInTheDocument();
    });
  });

  describe("Transformer and selection", () => {
    it("renders Transformer layer when there are selected regions", () => {
      const reg = createMockRegion({ id: "sel-1", selected: true });
      render(<VideoRegions {...defaultProps} regions={[reg]} />);
      expect(screen.getByTestId("mock-transformer")).toBeInTheDocument();
    });

    it("does not render Transformer when annotation is readOnly", () => {
      const item = createMockItem({ annotation: { isReadOnly: () => true, unselectAreas: jest.fn() } });
      const reg = createMockRegion({ id: "sel-2", selected: true });
      render(<VideoRegions {...defaultProps} item={item} regions={[reg]} />);
      expect(screen.queryByTestId("mock-transformer")).not.toBeInTheDocument();
    });

    it("does not render Transformer when no selected regions", () => {
      const reg = createMockRegion({ id: "nsel", selected: false, inSelection: false });
      render(<VideoRegions {...defaultProps} regions={[reg]} />);
      expect(screen.queryByTestId("mock-transformer")).not.toBeInTheDocument();
    });
  });

  describe("Shape onClick", () => {
    it("calls setHighlight and onClickRegion when rectangle is clicked", () => {
      const getParentOfType = require("mobx-state-tree").getParentOfType;
      getParentOfType.mockReturnValue(null);
      const reg = createMockRegion({ id: "click-1" });
      render(<VideoRegions {...defaultProps} regions={[reg]} />);
      const rect = screen.getByTestId("rectangle-click-1");
      fireEvent.click(rect);
      expect(reg.setHighlight).toHaveBeenCalledWith(false);
      expect(reg.onClickRegion).toHaveBeenCalled();
    });
  });

  describe("useEffect addVideoRegion", () => {
    it("adds region with normalized percent coordinates after drawing", () => {
      const item = createMockItem();
      const stageRef = React.createRef();
      render(<VideoRegions {...defaultProps} item={item} stageRef={stageRef} />);
      const stage = screen.getByTestId("stage");
      stageRef.current = stage;
      fireEvent.mouseDown(stage, { clientX: 80, clientY: 60 });
      fireEvent.mouseMove(stage, { clientX: 160, clientY: 120 });
      fireEvent.mouseUp(stage, { clientX: 160, clientY: 120 });
      expect(item.addVideoRegion).toHaveBeenCalledWith(
        expect.objectContaining({
          x: expect.any(Number),
          y: expect.any(Number),
          width: expect.any(Number),
          height: expect.any(Number),
        }),
      );
    });

    it("handles negative width/height by normalizing", () => {
      const item = createMockItem();
      const stageRef = React.createRef();
      render(<VideoRegions {...defaultProps} item={item} stageRef={stageRef} />);
      const stage = screen.getByTestId("stage");
      stageRef.current = stage;
      fireEvent.mouseDown(stage, { clientX: 200, clientY: 150 });
      fireEvent.mouseMove(stage, { clientX: 100, clientY: 100 });
      fireEvent.mouseUp(stage, { clientX: 100, clientY: 100 });
      expect(item.addVideoRegion).toHaveBeenCalled();
    });
  });

  describe("selected filter", () => {
    it("excludes hidden and readOnly regions from selection for Transformer", () => {
      const regHidden = createMockRegion({ id: "h", selected: true, hidden: true });
      const regReadOnly = createMockRegion({ id: "ro", selected: true, isReadOnly: () => true });
      const regNotInLifespan = createMockRegion({ id: "life", selected: true, isInLifespan: () => false });
      render(<VideoRegions {...defaultProps} regions={[regHidden, regReadOnly, regNotInLifespan]} />);
      expect(screen.queryByTestId("mock-transformer")).not.toBeInTheDocument();
    });

    it("includes inSelection in selected", () => {
      const reg = createMockRegion({ id: "insel", selected: false, inSelection: true });
      render(<VideoRegions {...defaultProps} regions={[reg]} />);
      expect(screen.getByTestId("mock-transformer")).toBeInTheDocument();
    });
  });
});
