import type { KonvaEventObject } from "konva/lib/Node";
import type { BezierPoint, Point, GhostPoint } from "../types";
import type { PointType } from "../types";

export interface EventHandlerProps {
  instanceId?: string; // Add instanceId for tracker integration
  initialPoints: BezierPoint[];
  width: number;
  height: number;
  pixelSnapping?: boolean;
  selectedPoints: Set<number>;
  selectedPointIndex: number | null;
  setSelectedPointIndex: (index: number | null) => void;
  setSelectedPoints: (points: Set<number> | ((prev: Set<number>) => Set<number>)) => void;
  setDraggedPointIndex: (index: number | null) => void;
  setDraggedControlPoint: (point: { pointIndex: number; controlIndex: number } | null) => void;
  setIsDisconnectedMode: (mode: boolean) => void;
  isDisconnectedMode: boolean;
  setGhostPoint: (point: GhostPoint | null) => void;
  setNewPointDragIndex: (index: number | null) => void;
  setIsDraggingNewBezier: (dragging: boolean) => void;
  setGhostPointDragInfo: (
    info:
      | {
          ghostPoint: GhostPoint;
          isDragging: boolean;
          dragDistance: number;
        }
      | null
      | ((
          prev: {
            ghostPoint: GhostPoint;
            isDragging: boolean;
            dragDistance: number;
          } | null,
        ) => {
          ghostPoint: GhostPoint;
          isDragging: boolean;
          dragDistance: number;
        } | null),
  ) => void;
  // setCursorPosition: (position: Point | null) => void; // Removed - now handled via ref
  setVisibleControlPoints: (points: Set<number> | ((prev: Set<number>) => Set<number>)) => void;
  setIsPathClosed: (closed: boolean) => void;
  isDragging: React.MutableRefObject<boolean>;
  lastPos: React.MutableRefObject<{
    x: number;
    y: number;
    originalX?: number;
    originalY?: number;
    originalControlPoint1?: { x: number; y: number };
    originalControlPoint2?: { x: number; y: number };
  } | null>;
  lastCallbackTime: React.MutableRefObject<number>;
  isDrawingMode: boolean;
  allowClose: boolean;
  allowBezier: boolean;
  isPathClosed: boolean;
  transform: { zoom: number; offsetX: number; offsetY: number };
  fitScale: number;
  x: number;
  y: number;
  ghostPoint: GhostPoint | null;
  ghostPointDragInfo: {
    ghostPoint: GhostPoint;
    isDragging: boolean;
    dragDistance: number;
  } | null;
  draggedPointIndex: number | null;
  draggedControlPoint: { pointIndex: number; controlIndex: number } | null;
  isDraggingNewBezier: boolean;
  newPointDragIndex: number | null;
  cursorPosition: Point | null;
  visibleControlPoints: Set<number>;
  onPointsChange?: (points: BezierPoint[]) => void;
  onPointAdded?: (point: BezierPoint, index: number) => void;
  onPointRemoved?: (point: BezierPoint, index: number) => void;
  onPointEdited?: (point: BezierPoint, index: number) => void;
  onPointRepositioned?: (point: BezierPoint, index: number) => void;
  onPointConverted?: (point: BezierPoint, index: number, toBezier: boolean) => void;
  onPathShapeChanged?: (points: BezierPoint[]) => void;
  onPointSelected?: (pointIndex: number | null) => void;
  onFinish?: (e: KonvaEventObject<MouseEvent>) => void;
  onGhostPointClick?: (ghostPoint: { x: number; y: number; prevPointId: string; nextPointId: string }) => void;
  onMouseDown?: (e: KonvaEventObject<MouseEvent>) => void;
  onMouseMove?: (e: KonvaEventObject<MouseEvent>) => void;
  onMouseUp?: (e?: KonvaEventObject<MouseEvent>) => void;
  onClick?: (e: KonvaEventObject<MouseEvent>) => void;
  notifyTransformationComplete?: () => void;
  canAddMorePoints?: () => boolean;
  maxPoints?: number;
  minPoints?: number; // Add minPoints property
  skeletonEnabled?: boolean;
  getAllPoints?: () => BezierPoint[];
  getPointInfo?: (globalIndex: number) => {
    pathType: "main" | "branch" | "drawing";
    pathIndex: number;
    point: BezierPoint;
    branchId?: string;
  } | null;
  updatePointByGlobalIndex?: (globalIndex: number, updatedPoint: BezierPoint) => void;
  lastAddedPointId?: string | null;
  activePointId?: string | null;
  setActivePointId?: (id: string | null) => void;
  setLastAddedPointId?: (pointId: string | null) => void;
  isTransforming?: boolean;
  selected?: boolean;
  disabled?: boolean;
  transformMode?: boolean;
  disableInternalPointAddition?: boolean;
  handleTransformStart?: () => void;
  handleTransformEnd?: (e?: KonvaEventObject<MouseEvent>) => void;
  pointCreationManager?: {
    isCreating: () => boolean;
    createRegularPointAt: (x: number, y: number, prevPointId?: string) => boolean;
    createBezierPointAt: (
      x: number,
      y: number,
      controlPoint1?: { x: number; y: number },
      controlPoint2?: { x: number; y: number },
      prevPointId?: string,
      isDisconnected?: boolean,
    ) => boolean;
    insertPointBetween: (
      x: number,
      y: number,
      prevPointId: string,
      nextPointId: string,
      type?: PointType,
      controlPoint1?: { x: number; y: number },
      controlPoint2?: { x: number; y: number },
    ) => { success: boolean; newPointIndex?: number };
    createPointFromGhostDrag: (
      ghostPoint: { x: number; y: number; segmentIndex: number },
      dragDistance: number,
    ) => boolean;
  };
}

export interface EventHandlers {
  handleLayerMouseDown: (e: KonvaEventObject<MouseEvent>) => void;
  handleLayerClick: (e: KonvaEventObject<MouseEvent>) => void;
  handleLayerMouseMove: (e: KonvaEventObject<MouseEvent>) => void;
  handleLayerMouseUp: (e?: KonvaEventObject<MouseEvent>) => void;
}
