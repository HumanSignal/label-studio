import { observer } from "mobx-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Group } from "react-konva";
import { useRegionStyles } from "../../../hooks/useRegionColor";
import { KonvaVector } from "../../../components/KonvaVector/KonvaVector";
import { generatePointId } from "../../../components/KonvaVector/utils";
import { LabelOnVideoBbox } from "../../../components/ImageView/LabelOnRegion";
import ToolsManager from "../../../tools/Manager";

/**
 * Convert vertices from percent (0-100) to pixel coords using working area dimensions.
 */
const percentToPixelVertices = (vertices, waWidth, waHeight) => {
  return vertices.map((v) => ({
    ...v,
    x: (v.x * waWidth) / 100,
    y: (v.y * waHeight) / 100,
  }));
};

/**
 * Convert vertices from pixel coords to percent (0-100) using working area dimensions.
 */
const pixelToPercentVertices = (vertices, waWidth, waHeight) => {
  return vertices.map((v) => ({
    ...v,
    x: (v.x / waWidth) * 100,
    y: (v.y / waHeight) * 100,
  }));
};

const EPSILON = 1e-6;

/**
 * Check if two vertex arrays have the same coordinates (ignoring IDs and metadata).
 * Used to prevent spurious keyframe creation when KonvaVector re-initializes.
 */
const verticesMatch = (a, b) => {
  if (!a || !b || a.length !== b.length) return false;

  for (let i = 0; i < a.length; i++) {
    if (Math.abs(a[i].x - b[i].x) > EPSILON || Math.abs(a[i].y - b[i].y) > EPSILON) return false;
  }

  return true;
};

/**
 * Compute bounding box of pixel vertices for label positioning.
 */
const computeBBox = (vertices) => {
  if (!vertices.length) return { x: 0, y: 0, width: 0, height: 0 };

  let minX = Number.POSITIVE_INFINITY;
  let minY = Number.POSITIVE_INFINITY;
  let maxX = Number.NEGATIVE_INFINITY;
  let maxY = Number.NEGATIVE_INFINITY;

  for (const v of vertices) {
    if (v.x < minX) minX = v.x;
    if (v.y < minY) minY = v.y;
    if (v.x > maxX) maxX = v.x;
    if (v.y > maxY) maxY = v.y;
  }

  return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
};

const getPointRadiusFromSize = (control) => {
  const size = control?.pointsize ?? "small";

  switch (size) {
    case "medium":
      return { enabled: 5, disabled: 4 };
    case "large":
      return { enabled: 7, disabled: 5 };
    default:
      return { enabled: 4, disabled: 3 };
  }
};

const getMinPoints = (control) => {
  const val = control?.minpoints;
  const parsed = Number.parseInt(val);

  return Number.isFinite(parsed) ? parsed : undefined;
};

const getMaxPoints = (control) => {
  const val = control?.maxpoints;
  const parsed = Number.parseInt(val);

  return Number.isFinite(parsed) ? parsed : undefined;
};

/**
 * VideoVector rendering component for the video overlay.
 *
 * Unlike the image VectorRegion (which stores pixel coords directly), the video
 * version must convert between percent (MobX store) and pixels (KonvaVector).
 * Writing to MobX during every drag frame causes re-renders that interfere with
 * KonvaVector's internal drag state. So we defer MobX writes until drag ends.
 *
 * To prevent the "shape disappears on drag end" bug, lastCommittedRef caches the
 * exact pixel values KonvaVector gave us so that the pixel→percent→pixel roundtrip
 * doesn't cause KonvaVector to re-initialize (its arePointsEqual uses strict ===).
 */
const VideoVectorPure = ({
  id,
  reg,
  box,
  frame,
  workingArea,
  selected,
  draggable,
  listening,
  onClick: onClickProp,
  onDragMove,
  allowOutsideBounds = false,
  ...rest
}) => {
  const vectorRef = useRef(null);
  const isDraggingRef = useRef(false);
  const latestDragPixelsRef = useRef(null);
  const [dragPixels, setDragPixels] = useState(null);
  const lastCommittedRef = useRef(null);

  const style = useRegionStyles(reg, { includeFill: true });
  const { realWidth: waWidth, realHeight: waHeight, scale: waScale, x: waX, y: waY } = workingArea;

  // Keep a ref to the latest working area dims and frame so that callbacks
  // reached through stale closures (KonvaVector's stage-level event handlers
  // are set up once and never re-attached) always read fresh values.
  const commitContextRef = useRef({ waWidth, waHeight, frame });
  commitContextRef.current = { waWidth, waHeight, frame };

  const storePixelVertices = useMemo(
    () => percentToPixelVertices(box.vertices || [], waWidth, waHeight),
    [box.vertices, waWidth, waHeight],
  );

  let pixelVertices;

  if (dragPixels) {
    pixelVertices = dragPixels;
  } else if (
    lastCommittedRef.current &&
    box.vertices &&
    verticesMatch(box.vertices, lastCommittedRef.current.percent)
  ) {
    pixelVertices = lastCommittedRef.current.pixels;
  } else {
    pixelVertices = storePixelVertices;
    lastCommittedRef.current = null;
  }

  const bbox = useMemo(() => computeBBox(pixelVertices), [pixelVertices]);

  const control = reg.results?.[0]?.from_name;

  const stageTransform = useMemo(
    () => ({
      zoom: 1,
      offsetX: waX,
      offsetY: waY,
    }),
    [waX, waY],
  );

  const pointRadius = useMemo(() => getPointRadiusFromSize(control), [control?.pointsize]);
  const isReadOnly = reg.isReadOnly();

  const objectTag = reg.object;
  const manager = objectTag ? ToolsManager.getInstance({ name: objectTag.name }) : null;
  const selectedTool = manager?.findSelectedTool?.();
  const toolDisabled = selectedTool?.disabled ?? false;
  const disabled = toolDisabled || !listening || (!selected && !reg.isDrawing);
  const kvSelected = !disabled;

  const handleRef = useCallback(
    (kv) => {
      vectorRef.current = kv;
      reg.setKonvaVectorRef(kv);
    },
    [reg],
  );

  const commitPoints = useCallback(
    (points) => {
      const { waWidth: w, waHeight: h, frame: f } = commitContextRef.current;

      if (!w || !h) return;

      const percentPoints = pixelToPercentVertices(points, w, h);
      const currentShape = reg.getShape(f);

      if (currentShape?.vertices && verticesMatch(currentShape.vertices, percentPoints)) return;

      lastCommittedRef.current = { percent: percentPoints, pixels: points };
      reg.updateShape({ vertices: percentPoints, closed: currentShape?.closed ?? false }, f);
    },
    [reg],
  );

  const handlePointsChange = useCallback(
    (points) => {
      if (isDraggingRef.current) {
        latestDragPixelsRef.current = points;
        setDragPixels(points);
        return;
      }
      commitPoints(points);
    },
    [commitPoints],
  );

  // Append a single vertex on click. Reads the current vertices directly from
  // the MobX store on every call (rather than a captured React-prop snapshot),
  // so rapid clicks that arrive before a re-render each produce a point instead
  // of clobbering the previous one (BROS-1206).
  const appendVertex = useCallback(
    (px, py) => {
      if (isReadOnly) return;

      const { waWidth: w, waHeight: h, frame: f } = commitContextRef.current;
      if (!w || !h) return;

      const shape = reg.getShape(f);
      if (shape?.closed) return;

      const currentPixels = percentToPixelVertices(shape?.vertices ?? [], w, h);

      const max = getMaxPoints(control);
      if (max && currentPixels.length >= max) return;

      const last = currentPixels[currentPixels.length - 1];
      const newPoint = { id: generatePointId(), x: px, y: py, prevPointId: last?.id };

      commitPoints([...currentPixels, newPoint]);
    },
    [reg, control, commitPoints, isReadOnly],
  );

  useEffect(() => {
    reg.setAppendVertexFn(appendVertex);
    return () => reg.setAppendVertexFn(null);
  }, [reg, appendVertex]);

  const handleTransformStart = useCallback(() => {
    isDraggingRef.current = true;
    latestDragPixelsRef.current = null;
    reg.annotation?.history?.freeze?.();
  }, [reg]);

  const handleTransformEnd = useCallback(() => {
    isDraggingRef.current = false;
    if (latestDragPixelsRef.current) {
      commitPoints(latestDragPixelsRef.current);
      latestDragPixelsRef.current = null;
    }
    reg.annotation?.history?.unfreeze?.();
  }, [commitPoints, reg]);

  // Clear dragPixels once MobX store has propagated the committed values.
  // This avoids the race where clearing dragPixels immediately in handleTransformEnd
  // causes the shape to flash to old positions before MobX observer re-renders.
  useEffect(() => {
    if (dragPixels && !isDraggingRef.current && lastCommittedRef.current) {
      if (box.vertices && verticesMatch(box.vertices, lastCommittedRef.current.percent)) {
        setDragPixels(null);
      }
    }
  }, [dragPixels, box.vertices]);

  const handlePathClosedChange = useCallback(
    (isClosed) => {
      const shape = reg.getShape(frame);

      if (!shape) return;
      if (shape.closed === isClosed) return;

      reg.updateShape({ vertices: shape.vertices, closed: isClosed }, frame);
    },
    [reg, frame],
  );

  const handleFinish = useCallback(
    (e) => {
      if (isReadOnly) return;
      e.evt.stopPropagation();
      e.evt.preventDefault();

      const objTag = reg.object;

      if (!objTag) return;

      const mgr = ToolsManager.getInstance({ name: objTag.name });
      const tool = mgr?.findSelectedTool?.();

      if (tool?.currentArea) {
        tool.commitDrawingRegion?.();
      }
      tool?.complete?.();
    },
    [isReadOnly, reg],
  );

  const handleRegionClick = useCallback(
    (e) => {
      if (e.evt.defaultPrevented) return;
      if (reg.isReadOnly()) return;
      if (reg.isDrawing) return;
      if (e.evt.altKey || e.evt.ctrlKey || e.evt.shiftKey || e.evt.metaKey) return;

      e.cancelBubble = true;

      const objTag = reg.object;
      const mgr = objTag ? ToolsManager.getInstance({ name: objTag.name }) : null;
      const tool = mgr?.findSelectedTool?.();

      if (tool?.currentArea && tool.currentArea !== reg && tool.complete) {
        tool.complete();
      }

      if (typeof onClickProp === "function") {
        onClickProp(e);
      } else {
        reg.setHighlight(false);
        reg.onClickRegion(e);
      }
    },
    [reg, frame, onClickProp],
  );

  return (
    <Group
      listening={listening}
      opacity={reg.hidden ? 0 : 1}
      onClick={(e) => {
        if (!selected && !e.evt.defaultPrevented) {
          handleRegionClick(e);
        }
      }}
    >
      <KonvaVector
        key={reg.id}
        ref={handleRef}
        initialPoints={Array.from(pixelVertices)}
        isMultiRegionSelected={reg.object?.selectedRegions?.length > 1}
        closed={box.closed}
        width={waWidth}
        height={waHeight}
        scaleX={1}
        scaleY={1}
        x={0}
        y={0}
        transformMode={selected && reg.transformMode && !isReadOnly}
        transform={stageTransform}
        fitScale={waScale}
        allowClose={control?.closable ?? false}
        allowBezier={false}
        minPoints={getMinPoints(control)}
        maxPoints={getMaxPoints(control)}
        skeletonEnabled={control?.skeleton ?? false}
        stroke={selected ? "#ff0000" : style.strokeColor}
        fill={style.fillColor ?? "transparent"}
        strokeWidth={style.strokeWidth}
        opacity={Number.parseFloat(control?.opacity || "1")}
        pixelSnapping={control?.snap === "pixel"}
        selected={kvSelected}
        disabled={isReadOnly}
        pointRadius={pointRadius}
        pointFill={selected ? "#ffffff" : "#f8fafc"}
        pointStroke={selected ? "#ff0000" : style.strokeColor}
        pointStrokeSelected="#ff6b35"
        pointStrokeWidth={selected ? 2 : 1}
        pointStyle={control?.pointstyle ?? "circle"}
        disableInternalPointAddition={true}
        // Allow Shift+Click to insert a point on a segment even when the region
        // is not selected — the ghost-point handler commits straight to the store,
        // so selection isn't required to add a vertex (BROS-1200).
        allowShiftPointInsertWhenUnselected={!isReadOnly}
        disableGhostLine={isDraggingRef.current}
        allowOutsideBounds={allowOutsideBounds}
        onFinish={handleFinish}
        onPointsChange={handlePointsChange}
        onTransformStart={handleTransformStart}
        onTransformEnd={handleTransformEnd}
        onPathClosedChange={handlePathClosedChange}
        onGhostPointClick={(ghostPoint) => {
          if (reg.isReadOnly()) return;

          const max = getMaxPoints(control);
          if (max && pixelVertices.length >= max) return;

          const currentPoints = [...pixelVertices];
          const nextIdx = currentPoints.findIndex((p) => p.id === ghostPoint.nextPointId);
          if (nextIdx === -1) return;

          const newPoint = {
            id: generatePointId(),
            x: ghostPoint.x,
            y: ghostPoint.y,
            prevPointId: ghostPoint.prevPointId,
          };

          currentPoints[nextIdx] = { ...currentPoints[nextIdx], prevPointId: newPoint.id };
          currentPoints.splice(nextIdx, 0, newPoint);

          commitPoints(currentPoints);
        }}
        onClick={handleRegionClick}
        onMouseEnter={(e) => {
          reg.setHighlight(true);
          const stage = e?.target?.getStage?.();
          if (stage) stage.container().style.cursor = "pointer";
        }}
        onMouseLeave={(e) => {
          reg.setHighlight(false);
          const stage = e?.target?.getStage?.();
          if (stage) stage.container().style.cursor = "default";
        }}
      />

      {pixelVertices.length > 0 && (
        <LabelOnVideoBbox
          reg={reg}
          box={bbox}
          scale={waScale}
          color={style.strokeColor}
          strokeWidth={style.strokeWidth}
          adjacent
        />
      )}
    </Group>
  );
};

export const VideoVectorShape = observer(VideoVectorPure);
