import type { KonvaEventObject } from "konva/lib/Node";

// String enums for union types
export enum ShapeType {
  POLYGON = "polygon",
  POLYLINE = "polyline",
}

export enum ExportFormat {
  SIMPLE = "simple",
  REGULAR = "regular",
}

export enum PathType {
  MAIN = "main",
}

export enum PointType {
  REGULAR = "regular",
  BEZIER = "bezier",
  GHOST = "ghost",
}

export interface Point {
  x: number;
  y: number;
}

export interface BezierPoint extends Point {
  id: string; // UUID for the point
  prevPointId?: string; // Reference to the previous point in the path
  controlPoint1?: Point;
  controlPoint2?: Point;
  isBezier?: boolean;
  disconnected?: boolean;
  isBranching?: boolean;
}

// Simple point format for easier usage
export type SimplePoint = [number, number]; // [x, y]

// Union type for initialPoints prop
export type PointInput = BezierPoint | SimplePoint;

export interface KonvaVectorRef {
  convertPoint: (pointIndex: number) => void;
  selectPointsByIds: (pointIds: string[]) => void;
  clearSelection: () => void;
  getSelectedPointIds: () => string[];
  close: () => boolean;
  exportShape: () => {
    type: ShapeType;
    isClosed: boolean;
    points: Array<{
      x: number;
      y: number;
      bezier: boolean;
      controlPoints: Array<{ x: number; y: number }>;
    }>;
    incomplete: boolean;
  };
  exportSimpleShape: () => {
    type: ShapeType;
    isClosed: boolean;
    points: SimplePoint[];
    incomplete: boolean;
  };
  // Programmatic point creation methods
  startPoint: (x: number, y: number) => boolean;
  updatePoint: (x: number, y: number) => boolean;
  commitPoint: (x: number, y: number) => boolean;
  // Programmatic point transformation methods
  translatePoints: (dx: number, dy: number, pointIds?: string[]) => void;
  rotatePoints: (angle: number, centerX: number, centerY: number, pointIds?: string[]) => void;
  scalePoints: (scaleX: number, scaleY: number, centerX: number, centerY: number, pointIds?: string[]) => void;
  transformPoints: (
    transformation: {
      dx?: number;
      dy?: number;
      rotation?: number;
      scaleX?: number;
      scaleY?: number;
      centerX?: number;
      centerY?: number;
    },
    pointIds?: string[],
  ) => void;
  // Shape analysis methods
  getShapeBoundingBox: () => {
    left: number;
    top: number;
    right: number;
    bottom: number;
  };
  // Hit testing method
  isPointOverShape: (x: number, y: number, hitRadius?: number) => boolean;
  // Delete multiple points by their IDs
  deletePointsByIds: (pointIds: string[]) => void;
}

/**
 * Props for the KonvaVector component
 */
export interface KonvaVectorProps {
  /** Initial points in either simple [[x,y],...] or complex {x,y,isBezier,...} format */
  initialPoints?: PointInput[];
  /** Called when points array changes */
  onPointsChange?: (points: BezierPoint[]) => void;
  /** Called when a new point is added */
  onPointAdded?: (point: BezierPoint, index: number) => void;
  /** Called when a point is removed */
  onPointRemoved?: (point: BezierPoint, index: number) => void;
  /** Called when a point is edited */
  onPointEdited?: (point: BezierPoint, index: number) => void;
  /** Called when a point is repositioned */
  onPointRepositioned?: (point: BezierPoint, index: number) => void;
  /** Called when a point is converted between regular/bezier */
  onPointConverted?: (point: BezierPoint, index: number, toBezier: boolean) => void;
  /** Called when the path shape changes */
  onPathShapeChanged?: (points: BezierPoint[]) => void;
  /** Called when path closure state changes */
  onPathClosedChange?: (isClosed: boolean) => void;
  /** Called when transformations complete */
  onTransformationComplete?: (shapeData: {
    type: ShapeType;
    isClosed: boolean;
    points: Array<{
      x: number;
      y: number;
      bezier: boolean;
      controlPoints: Array<{ x: number; y: number }>;
    }>;
    incomplete: boolean;
  }) => void;
  /** Called when a point is selected */
  onPointSelected?: (pointIndex: number | null) => void;
  /** Called when drawing is finished (click on last point or double click on empty space) */
  onFinish?: (e: KonvaEventObject<MouseEvent>) => void;
  /** Called when shift-clicking on a ghost point (for programmatic point insertion when disableInternalPointAddition is true) */
  onGhostPointClick?: (ghostPoint: { x: number; y: number; prevPointId: string; nextPointId: string }) => void;
  /** Canvas width */
  width: number;
  /** Canvas height */
  height: number;
  /** X scale factor */
  scaleX: number;
  /** Y scale factor */
  scaleY: number;
  /** X offset */
  x: number;
  /** Y offset */
  y: number;
  /** Disable ghost line rendering */
  disableGhostLine?: boolean;
  /** Enable image smoothing */
  imageSmoothingEnabled?: boolean;

  /** Transform object with zoom and offset */
  transform?: { zoom: number; offsetX: number; offsetY: number };
  /** Fit scale factor */
  fitScale?: number;

  /** Allow path to be closed */
  allowClose?: boolean;
  /** External state for path closure (used when allowClose is true) */
  closed?: boolean;
  /** Allow bezier curve creation */
  allowBezier?: boolean;
  /** Minimum number of points required */
  minPoints?: number;
  /** Maximum number of points allowed */
  maxPoints?: number;
  /** Enable skeleton mode for point connections */
  skeletonEnabled?: boolean;
  /** Export format: "simple" or "regular" */
  format?: ExportFormat;
  /** Stroke color for the vector path */
  stroke?: string;
  /** Fill color for closed polygons */
  fill?: string;
  /** Stroke width for the vector path */
  strokeWidth?: number;
  /** Opacity for the vector path */
  opacity?: number;
  /** Enable pixel snapping for precise alignment */
  pixelSnapping?: boolean;
  /** Point styling configuration */
  pointRadius?: {
    /** Radius when component is enabled (default: 6) */
    enabled?: number;
    /** Radius when component is disabled (default: 4) */
    disabled?: number;
  };
  /** Point fill color (default: "#ffffff") */
  pointFill?: string;
  /** Point stroke color when not selected (default: "#3b82f6") */
  pointStroke?: string;
  /** Point stroke color when selected (default: "#fbbf24") */
  pointStrokeSelected?: string;
  /** Point stroke width (default: 2) */
  pointStrokeWidth?: number;
  /** Mouse down event handler */
  onMouseDown?: (e: KonvaEventObject<MouseEvent>) => void;
  /** Mouse move event handler */
  onMouseMove?: (e: KonvaEventObject<MouseEvent>) => void;
  /** Mouse up event handler */
  onMouseUp?: (e?: KonvaEventObject<MouseEvent>) => void;
  /** Click event handler */
  onClick?: (e: KonvaEventObject<MouseEvent>) => void;
  /** Double click event handler */
  onDblClick?: (e: KonvaEventObject<MouseEvent>) => void;
  /** Called when transformation starts (point dragging, multi-point transformation, etc.) */
  onTransformStart?: () => void;
  /** Called when transformation ends (point dragging, multi-point transformation, etc.) */
  /** Can be called with an optional event parameter for backward compatibility */
  onTransformEnd?: (e?: KonvaEventObject<MouseEvent>) => void;
  /** Mouse enter event handler */
  onMouseEnter?: (e: KonvaEventObject<MouseEvent>) => void;
  /** Mouse leave event handler */
  onMouseLeave?: (e: KonvaEventObject<MouseEvent>) => void;
  /** Enable all interactions when true (default: true) */
  selected?: boolean;
  /** Completely disable all interactions when true - user cannot change or move the shape at all */
  disabled?: boolean;
  /** Enable transform mode where all points are treated as selected */
  transformMode?: boolean;
  /** Whether multiple regions are currently selected (disables internal transformer) */
  isMultiRegionSelected?: boolean;
  /** Disable internal point addition - when true, prevents KonvaVector from adding points internally and disables the invisible shape */
  disableInternalPointAddition?: boolean;
  /** Name attribute for the component */
  name?: string;
  /** Ref to access component methods */
  ref?: React.RefObject<KonvaVectorRef>;
}

// Ghost point with point references
export interface GhostPoint {
  x: number;
  y: number;
  prevPointId: string; // ID of the point before this segment
  nextPointId: string; // ID of the point after this segment
}
