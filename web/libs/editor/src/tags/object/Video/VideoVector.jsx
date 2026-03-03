import { observer } from "mobx-react";
import { useCallback, useMemo, useRef } from "react";
import { Group, Path } from "react-konva";
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

/**
 * Build SVG path data from vertices for simple (non-interactive) rendering.
 * Supports straight lines and cubic bezier curves.
 */
const verticesToPathData = (vertices, closed) => {
  if (!vertices || vertices.length === 0) return "";

  let d = `M ${vertices[0].x} ${vertices[0].y}`;

  for (let i = 0; i < vertices.length; i++) {
    const curr = vertices[i];
    const nextIdx = (i + 1) % vertices.length;
    const next = vertices[nextIdx];

    if (nextIdx === 0 && !closed) break;

    if (curr.isBezier && curr.controlPoint2 && next.isBezier && next.controlPoint1) {
      d += ` C ${curr.controlPoint2.x} ${curr.controlPoint2.y}, ${next.controlPoint1.x} ${next.controlPoint1.y}, ${next.x} ${next.y}`;
    } else if (curr.isBezier && curr.controlPoint2) {
      const dx = next.x - curr.x;
      const dy = next.y - curr.y;

      d += ` C ${curr.controlPoint2.x} ${curr.controlPoint2.y}, ${next.x - dx * 0.3} ${next.y - dy * 0.3}, ${next.x} ${next.y}`;
    } else if (next.isBezier && next.controlPoint1) {
      const dx = next.x - curr.x;
      const dy = next.y - curr.y;

      d += ` C ${curr.x + dx * 0.3} ${curr.y + dy * 0.3}, ${next.controlPoint1.x} ${next.controlPoint1.y}, ${next.x} ${next.y}`;
    } else {
      d += ` L ${next.x} ${next.y}`;
    }
  }

  if (closed) d += " Z";

  return d;
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

/**
 * Simple path renderer for non-selected video vector regions.
 * Renders the vector shape as a Konva Path without editing capabilities.
 */
const SimpleVectorPath = observer(({ pixelVertices, closed, style, reg, scale, onClick, listening }) => {
  const pathData = useMemo(() => verticesToPathData(pixelVertices, closed), [pixelVertices, closed]);

  const bbox = useMemo(() => computeBBox(pixelVertices), [pixelVertices]);

  if (!pathData) return null;

  return (
    <Group>
      <LabelOnVideoBbox
        reg={reg}
        box={bbox}
        scale={scale}
        color={style.strokeColor}
        strokeWidth={style.strokeWidth}
        adjacent
      />
      <Path
        data={pathData}
        fill={style.fillColor ?? "transparent"}
        stroke={style.strokeColor}
        strokeWidth={style.strokeWidth}
        strokeScaleEnabled={false}
        opacity={reg.hidden ? 0 : 1}
        listening={listening}
        onClick={onClick}
        hitStrokeWidth={10}
      />
    </Group>
  );
});

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
 * Full interactive vector editor for selected video vector regions.
 * Wraps KonvaVector with percent/pixel coordinate conversion.
 */
const InteractiveVectorEditor = observer(({ reg, pixelVertices, closed, frame, workingArea, style, control }) => {
  const vectorRef = useRef(null);
  const { realWidth: waWidth, realHeight: waHeight, scale: waScale, x: waX, y: waY } = workingArea;

  const stageTransform = useMemo(
    () => ({
      zoom: 1,
      offsetX: waX,
      offsetY: waY,
    }),
    [waX, waY],
  );

  const pointRadius = useMemo(() => getPointRadiusFromSize(control), [control?.pointsize]);

  const handleRef = useCallback(
    (kv) => {
      vectorRef.current = kv;
      reg.setVectorRef(kv);
    },
    [reg],
  );

  const handlePointsChange = useCallback(
    (points) => {
      const percentPoints = pixelToPercentVertices(points, waWidth, waHeight);

      reg.updateShape({ vertices: percentPoints, closed: reg.getShape(frame)?.closed ?? false }, frame);
    },
    [reg, frame, waWidth, waHeight],
  );

  const handlePathClosedChange = useCallback(
    (isClosed) => {
      const shape = reg.getShape(frame);

      if (shape) {
        reg.updateShape({ vertices: shape.vertices, closed: isClosed }, frame);
      }
    },
    [reg, frame],
  );

  return (
    <Group>
      <KonvaVector
        ref={handleRef}
        initialPoints={Array.from(pixelVertices)}
        closed={closed}
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
        stroke={reg.selected ? "#ff0000" : style.strokeColor}
        fill={style.fillColor ?? "transparent"}
        strokeWidth={style.strokeWidth}
        opacity={Number.parseFloat(control?.opacity || "1")}
        pixelSnapping={control?.snap === "pixel"}
        selected={true}
        disabled={reg.isReadOnly()}
        pointRadius={pointRadius}
        pointFill={reg.selected ? "#ffffff" : "#f8fafc"}
        pointStroke={reg.selected ? "#ff0000" : style.strokeColor}
        pointStrokeSelected="#ff6b35"
        pointStrokeWidth={reg.selected ? 2 : 1}
        pointStyle={control?.pointstyle ?? "circle"}
        disableInternalPointAddition={true}
        onPointsChange={handlePointsChange}
        onPathClosedChange={handlePathClosedChange}
      />
    </Group>
  );
});

/**
 * VideoVector rendering component for the video overlay.
 *
 * - Non-selected regions: renders a simple Konva Path (fast, updates every frame)
 * - Selected regions: mounts full KonvaVector for interactive editing
 */
const VideoVectorPure = ({ id, reg, box, frame, workingArea, selected, draggable, listening, onDragMove, ...rest }) => {
  const style = useRegionStyles(reg, { includeFill: true });
  const { realWidth: waWidth, realHeight: waHeight, scale: waScale } = workingArea;

  const pixelVertices = useMemo(
    () => percentToPixelVertices(box.vertices || [], waWidth, waHeight),
    [box.vertices, waWidth, waHeight],
  );

  const control = reg.results?.[0]?.from_name;

  if (selected && !reg.isReadOnly()) {
    return (
      <InteractiveVectorEditor
        key={`${reg.id}-editor-${frame}`}
        reg={reg}
        pixelVertices={pixelVertices}
        closed={box.closed}
        frame={frame}
        workingArea={workingArea}
        style={style}
        control={control}
      />
    );
  }

  return (
    <SimpleVectorPath
      pixelVertices={pixelVertices}
      closed={box.closed}
      style={style}
      reg={reg}
      scale={waScale}
      listening={listening}
      onClick={rest.onClick}
    />
  );
};

export const VideoVectorShape = observer(VideoVectorPure);
