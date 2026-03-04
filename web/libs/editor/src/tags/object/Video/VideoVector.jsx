import { observer } from "mobx-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Group } from "react-konva";
import { useRegionStyles } from "../../../hooks/useRegionColor";
import { KonvaVector } from "../../../components/KonvaVector/KonvaVector";
import { LabelOnVideoBbox } from "../../../components/ImageView/LabelOnRegion";

/**
 * Convert vertices from percent (0-100) to pixel coords using working area dimensions.
 */
const percentToPixelVertices = (vertices, waWidth, waHeight) => {
  return vertices.map((v) => {
    const result = {
      ...v,
      x: (v.x * waWidth) / 100,
      y: (v.y * waHeight) / 100,
    };

    if (v.controlPoint1) {
      result.controlPoint1 = {
        x: (v.controlPoint1.x * waWidth) / 100,
        y: (v.controlPoint1.y * waHeight) / 100,
      };
    }

    if (v.controlPoint2) {
      result.controlPoint2 = {
        x: (v.controlPoint2.x * waWidth) / 100,
        y: (v.controlPoint2.y * waHeight) / 100,
      };
    }

    return result;
  });
};

/**
 * Convert vertices from pixel coords to percent (0-100) using working area dimensions.
 */
const pixelToPercentVertices = (vertices, waWidth, waHeight) => {
  return vertices.map((v) => {
    const result = {
      ...v,
      x: (v.x / waWidth) * 100,
      y: (v.y / waHeight) * 100,
    };

    if (v.controlPoint1) {
      result.controlPoint1 = {
        x: (v.controlPoint1.x / waWidth) * 100,
        y: (v.controlPoint1.y / waHeight) * 100,
      };
    }

    if (v.controlPoint2) {
      result.controlPoint2 = {
        x: (v.controlPoint2.x / waWidth) * 100,
        y: (v.controlPoint2.y / waHeight) * 100,
      };
    }

    return result;
  });
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

    const acp1 = a[i].controlPoint1;
    const bcp1 = b[i].controlPoint1;

    if (acp1 && bcp1) {
      if (Math.abs(acp1.x - bcp1.x) > EPSILON || Math.abs(acp1.y - bcp1.y) > EPSILON) return false;
    } else if (acp1 !== bcp1 && (acp1 || bcp1)) {
      return false;
    }

    const acp2 = a[i].controlPoint2;
    const bcp2 = b[i].controlPoint2;

    if (acp2 && bcp2) {
      if (Math.abs(acp2.x - bcp2.x) > EPSILON || Math.abs(acp2.y - bcp2.y) > EPSILON) return false;
    } else if (acp2 !== bcp2 && (acp2 || bcp2)) {
      return false;
    }
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

  return val ? Number.parseInt(val) : undefined;
};

const getMaxPoints = (control) => {
  const val = control?.maxpoints;

  return val ? Number.parseInt(val) : undefined;
};

/**
 * VideoVector rendering component for the video overlay.
 * Mirrors the interaction model of the image VectorRegion (VectorRegion.jsx):
 *
 * - `selected` on KonvaVector is true when the region is selected OR being drawn
 *   (matching the image version's `!disabled` where disabled = !item.selected && !item.isDrawing)
 * - `disabled` on KonvaVector is true only when region is readonly
 * - Ghost line, control points, and group-level handlers are active only when
 *   KonvaVector `selected` is true
 * - Point/shape dragging for non-selected regions is handled by stage-level handlers
 * - Deferred commit pattern prevents MobX feedback loop during drag operations
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
  onDragMove,
  ...rest
}) => {
  const vectorRef = useRef(null);
  const isDraggingRef = useRef(false);
  const latestDragPointsRef = useRef(null);
  const [dragPixels, setDragPixels] = useState(null);
  const style = useRegionStyles(reg, { includeFill: true });
  const { realWidth: waWidth, realHeight: waHeight, scale: waScale, x: waX, y: waY } = workingArea;

  const storePixelVertices = useMemo(
    () => percentToPixelVertices(box.vertices || [], waWidth, waHeight),
    [box.vertices, waWidth, waHeight],
  );

  const pixelVertices = dragPixels || storePixelVertices;

  const bbox = useMemo(() => computeBBox(pixelVertices), [pixelVertices]);

  const control = reg.results?.[0]?.from_name;

  const stageTransform = useMemo(() => ({
    zoom: 1,
    offsetX: waX,
    offsetY: waY,
  }), [waX, waY]);

  const pointRadius = useMemo(() => getPointRadiusFromSize(control), [control?.pointsize]);
  const isReadOnly = reg.isReadOnly();

  // Only enable KonvaVector's internal drawing/editing mode while actively drawing.
  // Unlike the image version, we can't rely on frequent re-renders to keep
  // isDrawingDisabled() fresh, so we simply disable it when not drawing.
  // Points/shape drag still work through KonvaVector's stage-level handlers.
  const kvSelected = reg.isDrawing && !isReadOnly;

  const handleRef = useCallback((kv) => {
    vectorRef.current = kv;
    reg.setVectorRef(kv);
  }, [reg]);

  const commitPoints = useCallback((points) => {
    const percentPoints = pixelToPercentVertices(points, waWidth, waHeight);
    const currentShape = reg.getShape(frame);

    if (currentShape?.vertices && verticesMatch(currentShape.vertices, percentPoints)) return;

    reg.updateShape({ vertices: percentPoints, closed: currentShape?.closed ?? false }, frame);
  }, [reg, frame, waWidth, waHeight]);

  const handlePointsChange = useCallback((points) => {
    if (isDraggingRef.current) {
      latestDragPointsRef.current = points;
      setDragPixels(points);
      return;
    }
    commitPoints(points);
  }, [commitPoints]);

  const handleTransformStart = useCallback(() => {
    isDraggingRef.current = true;
    latestDragPointsRef.current = null;
  }, []);

  const handleTransformEnd = useCallback(() => {
    isDraggingRef.current = false;
    if (latestDragPointsRef.current) {
      commitPoints(latestDragPointsRef.current);
      latestDragPointsRef.current = null;
    }
  }, [commitPoints]);

  // Clear local drag state once the MobX store has caught up.
  // This avoids the flash where storePixelVertices briefly holds pre-drag
  // positions because the MobX update hasn't propagated to `box` yet.
  useEffect(() => {
    if (dragPixels && !isDraggingRef.current) {
      setDragPixels(null);
    }
  }, [storePixelVertices]);

  const handlePathClosedChange = useCallback((isClosed) => {
    const shape = reg.getShape(frame);

    if (!shape) return;
    if (shape.closed === isClosed) return;

    reg.updateShape({ vertices: shape.vertices, closed: isClosed }, frame);
  }, [reg, frame]);

  const handleFinish = useCallback((e) => {
    if (isReadOnly) return;
    e.evt.stopPropagation();
    e.evt.preventDefault();

    const tool = control?.getToolsManager?.()?.findSelectedTool?.();

    if (tool?.isDrawing) {
      tool.finishDrawing();
    }
  }, [isReadOnly, control]);

  const handleRegionClick = useCallback((e) => {
    if (e.evt.defaultPrevented) return;
    if (reg.isReadOnly()) return;
    if (reg.isDrawing) return;
    if (e.evt.altKey || e.evt.ctrlKey || e.evt.shiftKey || e.evt.metaKey) return;

    e.cancelBubble = true;

    const tool = control?.getToolsManager?.()?.findSelectedTool?.();

    if (tool?.currentArea && tool.currentArea !== reg && tool.complete) {
      tool.complete();
    }

    reg.setHighlight(false);
    reg.onClickRegion(e);
  }, [reg, control]);

  return (
    <Group>
      <KonvaVector
        key={reg.id}
        ref={handleRef}
        initialPoints={Array.from(pixelVertices)}
        closed={box.closed}
        width={waWidth}
        height={waHeight}
        scaleX={1}
        scaleY={1}
        x={0}
        y={0}
        transform={stageTransform}
        fitScale={waScale}
        allowClose={control?.closable ?? false}
        allowBezier={control?.curves ?? false}
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
        onFinish={handleFinish}
        onPointsChange={handlePointsChange}
        onTransformStart={handleTransformStart}
        onTransformEnd={handleTransformEnd}
        onPathClosedChange={handlePathClosedChange}
        onClick={handleRegionClick}
        onMouseEnter={() => {
          reg.setHighlight(true);
        }}
        onMouseLeave={() => {
          reg.setHighlight(false);
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
