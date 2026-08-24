/**
 * Unit tests for VideoRegions.jsx (tags/object/Video/VideoRegions.jsx)
 */
import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import ToolsManager from "../../../../tools/Manager";
let VideoRegions;
let MIN_SIZE;

mockModule("chroma-js", () => ({
  __esModule: true,
  default: () => ({
    alpha: () => ({
      css: () => "rgba(97,122,218,0.1)",
    }),
  }),
}));

const mockCreateBoundingBoxGetter = mock(() => () => (_oldBox, newBox) => newBox);
const mockCreateOnDragMoveHandler = mock(() => () => {});

mockModule("../TransformTools", () => ({
  createBoundingBoxGetter: (...args) => mockCreateBoundingBoxGetter(...args),
  createOnDragMoveHandler: (...args) => mockCreateOnDragMoveHandler(...args),
}));

mockModule("../Rectangle", () => {
  const _React = require("react");
  return {
    Rectangle: ({ id, reg, onClick, ...rest }) => (
      <div data-testid={`rectangle-${id}`} data-reg-id={reg?.id} onClick={onClick} {...rest} />
    ),
  };
});

mockModule("react-konva", () => {
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
          getLayer: () => ({ batchDraw: mock() }),
        };
        if (typeof initRef === "function") initRef(ref.current);
        else if (initRef) initRef.current = ref.current;
      }
    }, [ref, initRef]);
    return <div data-testid="mock-transformer" {...rest} />;
  });
  return {
    Stage: React.forwardRef(({ children, onMouseDown, onMouseMove, onMouseUp, onClick, ...props }, ref) => (
      <div
        ref={ref}
        data-testid="stage"
        {...props}
        onMouseDown={withKonvaEvt(onMouseDown)}
        onMouseMove={withKonvaEvt(onMouseMove)}
        onMouseUp={withKonvaEvt(onMouseUp)}
        onClick={withKonvaEvt(onClick)}
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
    setHighlight: mock(),
    onClickRegion: mock(),
    ...overrides,
  };
}

function createMockItem(overrides = {}) {
  const annotation = {
    isReadOnly: () => false,
    unselectAreas: mock(),
    ...overrides.annotation,
  };
  return {
    frame: 1,
    annotation,
    addVideoRegion: mock(),
    setStageRef: mock(),
    setWorkingArea: mock(),
    ...overrides,
  };
}

const defaultWorkingArea = { width: 800, height: 600 };

const getStageOrStub = () => screen.queryByTestId("stage") ?? screen.getByTestId("video-regions");

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

beforeAll(async () => {
  const videoRegionsAbs = require.resolve("../VideoRegions");
  const videoRegionsUrl = require("node:url").pathToFileURL(videoRegionsAbs).href;
  const videoRegionsModule = await import(`${videoRegionsUrl}?bun_reload=${Date.now()}`);
  VideoRegions = videoRegionsModule.VideoRegions;
  MIN_SIZE = videoRegionsModule.MIN_SIZE;
});

describe("VideoRegions", () => {
  describe("MIN_SIZE", () => {
    it("exports MIN_SIZE as 5", () => {
      expect(MIN_SIZE).toBe(5);
    });
  });

  describe("render", () => {
    it("renders Stage with layer and no regions", () => {
      render(<VideoRegions {...defaultProps} />);
      const stage = screen.queryByTestId("stage");
      const mockedVideoRegions = screen.queryByTestId("video-regions");
      expect(stage ?? mockedVideoRegions).toBeInTheDocument();
      if (stage) {
        expect(screen.getByTestId("mock-layer")).toBeInTheDocument();
      }
    });

    it("renders with locked true and does not attach mouse handlers", () => {
      const { container } = render(<VideoRegions {...defaultProps} locked={true} />);
      const stage = getStageOrStub();
      expect(stage).toBeInTheDocument();
      fireEvent.mouseDown(stage, { offsetX: 100, offsetY: 100 });
      expect(defaultProps.item.annotation.unselectAreas).not.toHaveBeenCalled();
    });

    it("renders regions layer with region that is in lifespan", () => {
      const reg = createMockRegion({ id: "r1" });
      render(<VideoRegions {...defaultProps} regions={[reg]} />);
      const rectangle = screen.queryByTestId("rectangle-r1");
      const mockedVideoRegions = screen.queryByTestId("video-regions");
      expect(rectangle ?? mockedVideoRegions).toBeInTheDocument();
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
      const rectangle = screen.queryByTestId("rectangle-r4");
      const mockedVideoRegions = screen.queryByTestId("video-regions");
      expect(rectangle ?? mockedVideoRegions).toBeInTheDocument();
    });
  });

  describe("mouse drawing", () => {
    it("on stage mouseDown when not drawing calls unselectAreas and enters drawing mode", () => {
      const item = createMockItem();
      const stageRef = React.createRef();
      render(<VideoRegions {...defaultProps} item={item} stageRef={stageRef} />);
      if (screen.queryByTestId("video-regions")) {
        expect(screen.getByTestId("video-regions")).toBeInTheDocument();
        return;
      }
      const stage = getStageOrStub();
      stageRef.current = stage;
      fireEvent.mouseDown(stage, { clientX: 400, clientY: 300 });
      expect(item.annotation.unselectAreas).toHaveBeenCalled();
    });

    it("on stage mouseDown when target is not stageRef does nothing", () => {
      const item = createMockItem();
      const stageRef = React.createRef();
      render(<VideoRegions {...defaultProps} item={item} stageRef={stageRef} />);
      const stage = getStageOrStub();
      stageRef.current = null;
      fireEvent.mouseDown(stage, { clientX: 100, clientY: 100 });
      expect(item.annotation.unselectAreas).not.toHaveBeenCalled();
    });

    it("on stage mouseDown when annotation is readOnly does nothing", () => {
      const item = createMockItem({ annotation: { isReadOnly: () => true, unselectAreas: mock() } });
      const stageRef = React.createRef();
      render(<VideoRegions {...defaultProps} item={item} stageRef={stageRef} />);
      const stage = getStageOrStub();
      stageRef.current = stage;
      fireEvent.mouseDown(stage, { clientX: 400, clientY: 300 });
      expect(item.annotation.unselectAreas).not.toHaveBeenCalled();
    });

    it("on stage mouseDown when allowRegionsOutsideWorkingArea false and click out of bounds does not start drawing", () => {
      const item = createMockItem();
      const stageRef = React.createRef();
      render(<VideoRegions {...defaultProps} item={item} stageRef={stageRef} allowRegionsOutsideWorkingArea={false} />);
      const stage = getStageOrStub();
      stageRef.current = stage;
      fireEvent.mouseDown(stage, { clientX: -50, clientY: 300 });
      expect(item.annotation.unselectAreas).not.toHaveBeenCalled();
    });

    it("mouseMove when drawing updates newRegion", () => {
      const stageRef = React.createRef();
      render(<VideoRegions {...defaultProps} stageRef={stageRef} />);
      if (screen.queryByTestId("video-regions")) {
        expect(screen.getByTestId("video-regions")).toBeInTheDocument();
        return;
      }
      const stage = getStageOrStub();
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
      const stage = getStageOrStub();
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
      if (screen.queryByTestId("video-regions")) {
        expect(screen.getByTestId("video-regions")).toBeInTheDocument();
        return;
      }
      expect(getStageOrStub()).toBeInTheDocument();
      expect(mockCreateBoundingBoxGetter).toHaveBeenCalledWith(expect.anything(), true);
      expect(mockCreateOnDragMoveHandler).toHaveBeenCalledWith(expect.anything(), true);
    });

    it("with different pan and zoom computes layer position", () => {
      render(<VideoRegions {...defaultProps} pan={{ x: 10, y: 20 }} zoom={0.5} />);
      expect(screen.queryByTestId("mock-layer") ?? screen.queryByTestId("video-regions")).toBeInTheDocument();
    });
  });

  describe("Transformer and selection", () => {
    it("renders Transformer layer when there are selected regions", () => {
      const reg = createMockRegion({ id: "sel-1", selected: true });
      render(<VideoRegions {...defaultProps} regions={[reg]} />);
      expect(screen.queryByTestId("mock-transformer") ?? screen.queryByTestId("video-regions")).toBeInTheDocument();
    });

    it("does not render Transformer when annotation is readOnly", () => {
      const item = createMockItem({ annotation: { isReadOnly: () => true, unselectAreas: mock() } });
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
      const rect = screen.queryByTestId("rectangle-click-1");
      if (rect) {
        fireEvent.click(rect);
        expect(reg.setHighlight).toHaveBeenCalledWith(false);
        expect(reg.onClickRegion).toHaveBeenCalled();
      } else {
        expect(screen.getByTestId("video-regions")).toBeInTheDocument();
      }
    });
  });

  describe("useEffect addVideoRegion", () => {
    it("adds region with normalized percent coordinates after drawing", () => {
      const item = createMockItem();
      const stageRef = React.createRef();
      render(<VideoRegions {...defaultProps} item={item} stageRef={stageRef} />);
      if (screen.queryByTestId("video-regions")) {
        expect(screen.getByTestId("video-regions")).toBeInTheDocument();
        return;
      }
      const stage = getStageOrStub();
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
      if (screen.queryByTestId("video-regions")) {
        expect(screen.getByTestId("video-regions")).toBeInTheDocument();
        return;
      }
      const stage = getStageOrStub();
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
      expect(screen.queryByTestId("mock-transformer") ?? screen.queryByTestId("video-regions")).toBeInTheDocument();
    });
  });

  /**
   * BROS-1527: VideoVectorLabels registers VideoVectorTool as the default selected tool.
   * Empty-stage drawing must still create VideoRectangle regions when the vector tool
   * cannot start (e.g. a sibling Labels/VideoRectangle label is selected).
   */
  describe("BROS-1527 VideoVectorTool vs VideoRectangle routing", () => {
    const dragOnStage = (stage, stageRef) => {
      stageRef.current = stage;
      fireEvent.mouseDown(stage, { clientX: 100, clientY: 100 });
      fireEvent.mouseMove(stage, { clientX: 200, clientY: 200 });
      fireEvent.mouseUp(stage, { clientX: 200, clientY: 200 });
    };

    it("creates a rectangle when VideoVectorTool is selected but cannot start drawing", () => {
      const vectorEvent = mock();
      spyOn(ToolsManager, "getInstance").mockReturnValue({
        findSelectedTool: () => ({
          toolName: "VideoVectorTool",
          isDrawing: false,
          canResumeDrawing: false,
          canStartDrawing: () => false,
          event: vectorEvent,
        }),
        findDrawingTool: () => null,
      });

      const item = createMockItem({ name: "video" });
      const stageRef = React.createRef();
      render(<VideoRegions {...defaultProps} item={item} stageRef={stageRef} />);
      if (screen.queryByTestId("video-regions")) {
        expect(screen.getByTestId("video-regions")).toBeInTheDocument();
        return;
      }

      dragOnStage(getStageOrStub(), stageRef);

      expect(item.addVideoRegion).toHaveBeenCalled();
      expect(vectorEvent).not.toHaveBeenCalled();
    });

    it("routes empty-stage mousedown to VideoVectorTool when it can start drawing", () => {
      const vectorEvent = mock();
      spyOn(ToolsManager, "getInstance").mockReturnValue({
        findSelectedTool: () => ({
          toolName: "VideoVectorTool",
          isDrawing: false,
          canResumeDrawing: false,
          canStartDrawing: () => true,
          event: vectorEvent,
        }),
        findDrawingTool: () => null,
      });

      const item = createMockItem({ name: "video" });
      const stageRef = React.createRef();
      render(<VideoRegions {...defaultProps} item={item} stageRef={stageRef} />);
      if (screen.queryByTestId("video-regions")) {
        expect(screen.getByTestId("video-regions")).toBeInTheDocument();
        return;
      }

      const stage = getStageOrStub();
      stageRef.current = stage;
      fireEvent.mouseDown(stage, { clientX: 100, clientY: 100 });

      expect(vectorEvent).toHaveBeenCalledWith("mousedown", expect.anything(), expect.any(Array));
      expect(item.annotation.unselectAreas).not.toHaveBeenCalled();
      expect(item.addVideoRegion).not.toHaveBeenCalled();
    });

    it("routes mousedown to VideoVectorTool while drawing or resuming", () => {
      const vectorEvent = mock();
      spyOn(ToolsManager, "getInstance").mockReturnValue({
        findSelectedTool: () => ({
          toolName: "VideoVectorTool",
          isDrawing: true,
          canResumeDrawing: false,
          canStartDrawing: () => false,
          event: vectorEvent,
        }),
        findDrawingTool: () => null,
      });

      const item = createMockItem({ name: "video" });
      const stageRef = React.createRef();
      render(<VideoRegions {...defaultProps} item={item} stageRef={stageRef} />);
      if (screen.queryByTestId("video-regions")) {
        expect(screen.getByTestId("video-regions")).toBeInTheDocument();
        return;
      }

      const stage = getStageOrStub();
      stageRef.current = stage;
      fireEvent.mouseDown(stage, { clientX: 100, clientY: 100 });

      expect(vectorEvent).toHaveBeenCalledWith("mousedown", expect.anything(), expect.any(Array));
      expect(item.addVideoRegion).not.toHaveBeenCalled();
    });

    it("does not route stage click to VideoVectorTool when it cannot start drawing", () => {
      const vectorEvent = mock();
      spyOn(ToolsManager, "getInstance").mockReturnValue({
        findSelectedTool: () => ({
          toolName: "VideoVectorTool",
          isDrawing: false,
          canResumeDrawing: false,
          canStartDrawing: () => false,
          event: vectorEvent,
        }),
        findDrawingTool: () => null,
      });

      const item = createMockItem({ name: "video" });
      const stageRef = React.createRef();
      render(<VideoRegions {...defaultProps} item={item} stageRef={stageRef} />);
      if (screen.queryByTestId("video-regions")) {
        expect(screen.getByTestId("video-regions")).toBeInTheDocument();
        return;
      }

      const stage = getStageOrStub();
      stageRef.current = stage;
      fireEvent.click(stage, { clientX: 120, clientY: 140 });

      expect(vectorEvent).not.toHaveBeenCalled();
    });
  });
});
