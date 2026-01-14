import type Konva from "konva";
import { useState, useRef, forwardRef, useImperativeHandle, useEffect, useMemo, useCallback } from "react";
import { Group, Shape } from "react-konva";
import {
  ControlPoints,
  GhostLine,
  GhostPoint,
  type GhostPointRef,
  VectorPoints,
  VectorShape,
  VectorTransformer,
  ProxyNodes,
} from "./components";
import { createEventHandlers } from "./eventHandlers";
import { convertPoint } from "./pointManagement";
import { normalizePoints, convertBezierToSimplePoints, isPointInPolygon } from "./utils";
import { findClosestPointOnPath, getDistance, snapToPixel } from "./eventHandlers/utils";
import { constrainAnchorPointsToBounds, constrainPointToBounds } from "./utils/boundsChecking";
import { stageToImageCoordinates } from "./eventHandlers/utils";
import { PointCreationManager } from "./pointCreationManager";
import { VectorSelectionTracker, type VectorInstance } from "./VectorSelectionTracker";
import { calculateShapeBoundingBox } from "./utils/bezierBoundingBox";
import {
  shouldClosePathOnPointClick,
  isActivePointEligibleForClosing,
  handlePointDeselection,
  handlePointSelection,
} from "./eventHandlers/pointSelection";
import { handlePointSelectionFromIndex } from "./eventHandlers/mouseHandlers";
import { handleShiftClickPointConversion } from "./eventHandlers/drawing";
import { deletePoint } from "./pointManagement";
import type { BezierPoint, GhostPoint as GhostPointType, KonvaVectorProps, KonvaVectorRef } from "./types";
import { ShapeType, ExportFormat, PathType } from "./types";
import {
  INSTANCE_ID_PREFIX,
  INSTANCE_ID_LENGTH,
  DEFAULT_TRANSFORM,
  DEFAULT_FIT_SCALE,
  DEFAULT_TRANSFORMER_STATE,
  DEFAULT_STROKE_COLOR,
  DEFAULT_FILL_COLOR,
  DEFAULT_POINT_FILL,
  DEFAULT_POINT_STROKE,
  DEFAULT_POINT_STROKE_SELECTED,
  DEFAULT_POINT_STROKE_WIDTH,
  HIT_RADIUS,
  TRANSFORMER_SETUP_DELAY,
  TRANSFORMER_CLEAR_DELAY,
  MIN_POINTS_FOR_CLOSING,
  MIN_POINTS_FOR_BEZIER_CLOSING,
  INVISIBLE_SHAPE_OPACITY,
  DEGREES_TO_RADIANS,
  DEFAULT_SCALE,
  DEFAULT_OFFSET,
  DEFAULT_CALLBACK_TIME,
  ARRAY_INDEX,
  SELECTION_SIZE,
  CENTER_CALCULATION_DIVISOR,
} from "./constants";

/**
 * **KonvaVector Component** - Advanced vector graphics editor with bezier curve support
 *
 * A comprehensive React component for creating and editing polylines and polygons with support for:
 * - **Dual Point Formats**: Simple `[[x,y],...]` or complex `{x,y,isBezier,...}` formats
 * - **Bezier Curves**: Create smooth curves with control points and conversion between regular/bezier points
 * - **Interactive Editing**: Point selection, dragging, multi-selection with transformer
 * - **Drawing Modes**: Click-to-add points, drag-to-create bezier curves, ghost point insertion
 * - **Path Management**: Open polylines or closed polygons with configurable constraints
 * - **Export Formats**: Export as simple coordinates or detailed format with bezier information
 *
 * ## Key Features
 *
 * ### Point Management
 * - **Add Points**: Click in drawing mode, Shift+click on path segments
 * - **Edit Points**: Drag to reposition, Alt+click to convert regular ↔ bezier
 * - **Delete Points**: Alt+click on existing points
 * - **Multi-Selection**: Select multiple points for batch transformations
 * - **Break Closed Path**: Alt+click on any segment of a closed path to break it at that specific segment (array is shifted so breaking point becomes first, point before breaking becomes active)
 *
 * ### Bezier Curves
 * - **Create**: Drag while adding points or convert existing points
 * - **Edit**: Drag control points, disconnect/reconnect control handles
 * - **Control**: `allowBezier` prop to enable/disable bezier functionality
 *
 * ### Interaction Modes
 * - **Drawing Mode**: `isDrawingMode={true}` - Click to add points, drag for bezier curves
 * - **Edit Mode**: `isDrawingMode={false}` - Select, drag, and transform existing points
 * - **Skeleton Mode**: `skeletonEnabled={true}` - Connect points to active point instead of last point
 * - **Disabled Mode**: Point selection still works for keypoint annotation - click to select points, Cmd/Ctrl+click for multi-selection
 *
 * ### Export & Import
 * - **Simple Format**: `[[x,y], [x,y], ...]` - Easy to work with
 * - **Complex Format**: `[{x,y,isBezier,controlPoint1,controlPoint2}, ...]` - Full feature support
 * - **Auto Type Detection**: Exports include `type: ShapeType.POLYGON | ShapeType.POLYLINE` based on `allowClose`
 *
 * ## Usage Examples
 *
 * ### Basic Vector Path
 * ```tsx
 * <KonvaVector
 *   initialPoints={EXAMPLE_COORDINATES.BASIC_PATH}
 *   onPointsChange={setPoints}
 *   isDrawingMode={true}
 *   allowClose={false}
 * />
 * ```
 *
 * ### Polygon with Bezier Support
 * ```tsx
 * <KonvaVector
 *   initialPoints={complexPoints}
 *   onPointsChange={setPoints}
 *   allowClose={true}
 *   allowBezier={true}
 *   minPoints={EXAMPLE_POINT_CONSTRAINTS.MIN_POINTS}
 *   maxPoints={EXAMPLE_POINT_CONSTRAINTS.MAX_POINTS}
 * />
 * ```
 *
 * ### With Export Handling
 * ```tsx
 * <KonvaVector
 *   initialPoints={points}
 *   onPointsChange={setPoints}
 *   format={ExportFormat.SIMPLE}
 *   onTransformationComplete={(data) => {

 *   }}
 * />
 * ```
 *
 * ### With Path Breaking
 * ```tsx
 * <KonvaVector
 *   initialPoints={closedPolygonPoints}
 *   onPointsChange={setPoints}
 *   allowClose={true}
 *   closed={true}
 *   // Alt+click on any segment to break the closed path at that specific segment
 *   // The points array is shifted so the breaking point becomes the first element, point before breaking becomes active
 *   onPathClosedChange={(isClosed) => {
 *     console.log('Path closed state:', isClosed);
 *   }}
 * />
 * ```
 *
 * ### With Custom Point Styling
 * ```tsx
 * <KonvaVector
 *   initialPoints={points}
 *   onPointsChange={setPoints}
 *   // Customize point appearance
 *   pointRadius={DEFAULT_POINT_RADIUS}
 *   pointFill={DEFAULT_POINT_FILL}
 *   pointStroke={DEFAULT_POINT_STROKE}
 *   pointStrokeSelected={DEFAULT_POINT_STROKE_SELECTED}
 *   pointStrokeWidth={DEFAULT_POINT_STROKE_WIDTH}
 * />
 * ```
 *
 * ### As Keypoint Annotation Tool
 * ```tsx
 * <KonvaVector
 *   initialPoints={keypoints}
 *   onPointsChange={setKeypoints}
 *   selected={false} // Disable editing but allow selection
 *   allowClose={false} // Keypoints don't form closed paths
 *   allowBezier={false} // Keypoints are simple points
 *   pointRadius={KEYPOINT_POINT_RADIUS}
 *   onPointSelected={(pointIndex) => {
 *     console.log('Selected keypoint:', pointIndex);
 *   }}
 * />
 * ```
 *
 * ## Keyboard Shortcuts
 * - **Alt + Click**: Convert point between regular ↔ bezier
 * - **Alt + Click on segment**: Break closed path at segment (when path is closed)
 * - **Click on first/last point**: Close path bidirectionally (first→last or last→first)
 * - **Shift + Click**: Add point on path segment
 * - **Shift + Drag**: Create bezier point with control handles
 *
 * ## Props Overview
 * - `initialPoints`: Points in simple or complex format
 * - `allowBezier`: Enable/disable bezier curve functionality
 * - `allowClose`: Allow path to be closed into polygon
 * - `isDrawingMode`: Enable point addition mode
 * - `skeletonEnabled`: Connect new points to active point
 * - `format`: Export format (`ExportFormat.SIMPLE` | `ExportFormat.REGULAR`)
 * - `minPoints`/`maxPoints`: Point count constraints
 * - `stroke`/`fill`: Path styling colors
 * - `pointRadius`: Configurable point sizes for enabled/disabled states
 * - `pointFill`/`pointStroke`/`pointStrokeSelected`: Point styling colors
 * - `pointStrokeWidth`: Point stroke width
 * - Event handlers for all point operations
 *
 * @component
 * @example
 * ```tsx
 * // Simple usage
 * <KonvaVector
 *   initialPoints={EXAMPLE_COORDINATES.SIMPLE_PATH}
 *   onPointsChange={handlePointsChange}
 *   allowBezier={true}
 *   allowClose={false}
 * />
 * ```
 */
export const KonvaVector = forwardRef<KonvaVectorRef, KonvaVectorProps>((props, ref) => {
  // Generate unique instance ID
  const instanceId = useMemo(
    () => `${INSTANCE_ID_PREFIX}${Math.random().toString(36).substr(2, INSTANCE_ID_LENGTH)}`,
    [],
  );

  // Flag to track programmatic selection to prevent infinite loops
  const isProgrammaticSelection = useRef(false);

  const {
    initialPoints: rawInitialPoints = [],
    onPointsChange,
    onPointAdded,
    onPointRemoved,
    onPointEdited,
    onPointRepositioned,
    onPointConverted,
    onPathShapeChanged,
    onPathClosedChange,
    onTransformationComplete,
    onPointSelected,
    onFinish,
    onGhostPointClick,
    scaleX,
    scaleY,
    x,
    y,
    imageSmoothingEnabled = false,
    transform = DEFAULT_TRANSFORM,
    fitScale = DEFAULT_FIT_SCALE,
    width,
    height,
    onMouseDown,
    onMouseMove,
    onMouseUp,
    onClick,
    onDblClick,
    onTransformStart,
    onTransformEnd,
    onMouseEnter,
    onMouseLeave,
    allowClose = false,
    closed,
    allowBezier = true,
    minPoints,
    maxPoints,
    skeletonEnabled = false,
    format = ExportFormat.REGULAR,
    stroke = DEFAULT_STROKE_COLOR,
    fill = DEFAULT_FILL_COLOR,
    pixelSnapping = false,
    selected = true,
    disabled = false,
    transformMode = false,
    isMultiRegionSelected = false,
    disableInternalPointAddition = false,
    disableGhostLine = false,
    pointRadius,
    pointFill = DEFAULT_POINT_FILL,
    pointStroke = DEFAULT_POINT_STROKE,
    pointStrokeSelected = DEFAULT_POINT_STROKE_SELECTED,
    pointStrokeWidth = DEFAULT_POINT_STROKE_WIDTH,
  } = props;

  // Normalize input points to BezierPoint format
  const [initialPoints, setInitialPoints] = useState(() => normalizePoints(rawInitialPoints));

  // Ref to track current points for immediate access during transformation
  // This ensures applyTransformationToPoints always uses the latest points
  const currentPointsRef = useRef<BezierPoint[]>(initialPoints);

  // Ref to store updatePoints function to ensure it's accessible in closures
  const updatePointsRef = useRef<((points: BezierPoint[]) => void) | null>(null);

  // Update ref whenever initialPoints state changes
  useEffect(() => {
    currentPointsRef.current = initialPoints;
  }, [initialPoints]);

  // Ref to track if we're updating points internally to prevent infinite loops
  const isInternalUpdateRef = useRef(false);
  // Ref to track the last normalized points to prevent unnecessary updates
  const lastNormalizedPointsRef = useRef<BezierPoint[]>(initialPoints);
  // Ref to track the last points we sent to parent to detect circular updates
  const lastSentToParentRef = useRef<BezierPoint[] | null>(null);

  // Helper function to compare points by their actual data (ignoring IDs)
  const arePointsEqual = useCallback((points1: BezierPoint[], points2: BezierPoint[]): boolean => {
    if (points1.length !== points2.length) return false;

    for (let i = 0; i < points1.length; i++) {
      const p1 = points1[i];
      const p2 = points2[i];

      if (
        p1.x !== p2.x ||
        p1.y !== p2.y ||
        p1.isBezier !== p2.isBezier ||
        p1.disconnected !== p2.disconnected ||
        p1.isBranching !== p2.isBranching
      ) {
        return false;
      }

      // Compare control points if bezier
      if (p1.isBezier) {
        if (!!p1.controlPoint1 !== !!p2.controlPoint1) return false;
        if (!!p1.controlPoint2 !== !!p2.controlPoint2) return false;

        if (p1.controlPoint1 && p2.controlPoint1) {
          if (p1.controlPoint1.x !== p2.controlPoint1.x || p1.controlPoint1.y !== p2.controlPoint1.y) {
            return false;
          }
        }

        if (p1.controlPoint2 && p2.controlPoint2) {
          if (p1.controlPoint2.x !== p2.controlPoint2.x || p1.controlPoint2.y !== p2.controlPoint2.y) {
            return false;
          }
        }
      }
    }

    return true;
  }, []);

  // Update initialPoints when rawInitialPoints changes (only if different)
  useEffect(() => {
    // Skip if this is an internal update
    if (isInternalUpdateRef.current) {
      return;
    }

    const normalized = normalizePoints(rawInitialPoints);

    // Skip if this matches what we just sent to parent (circular update prevention)
    if (lastSentToParentRef.current && arePointsEqual(lastSentToParentRef.current, normalized)) {
      lastSentToParentRef.current = null; // Clear after handling
      return;
    }

    // Only update if points actually changed (compare by data, not IDs)
    if (!arePointsEqual(lastNormalizedPointsRef.current, normalized)) {
      lastNormalizedPointsRef.current = normalized;
      setInitialPoints(normalized);
    }
  }, [rawInitialPoints, arePointsEqual]);

  // Initialize lastAddedPointId and activePointId when component loads with existing points
  useEffect(() => {
    if (initialPoints.length > 0) {
      const lastPoint = initialPoints[initialPoints.length - 1];
      setLastAddedPointId(lastPoint.id);
      // Only set activePointId if skeleton mode is enabled
      if (skeletonEnabled) {
        setActivePointId(lastPoint.id);
      }
    }
  }, [initialPoints.length, skeletonEnabled]); // Only run when the number of points changes or skeleton mode changes

  // Use initialPoints directly - this will update when the parent re-renders
  const [selectedPointIndex, setSelectedPointIndex] = useState<number | null>(null);
  const [selectedPoints, setSelectedPoints] = useState<Set<number>>(new Set());

  // Compute effective selected points - when transformMode is true, all points are selected
  const effectiveSelectedPoints = useMemo(() => {
    if (transformMode && initialPoints.length > 0) {
      return new Set(Array.from({ length: initialPoints.length }, (_, i) => i));
    }
    return selectedPoints;
  }, [transformMode, initialPoints.length, selectedPoints]);
  const [lastAddedPointId, setLastAddedPointId] = useState<string | null>(null);

  const transformerRef = useRef<Konva.Transformer>(null);
  const stageRef = useRef<Konva.Layer>(null);
  const pointRefs = useRef<{ [key: number]: Konva.Circle | null }>({});
  const proxyRefs = useRef<{ [key: number]: Konva.Circle | null }>({});
  // Store transformer state to preserve rotation, scale, and center when updating selection
  const transformerStateRef = useRef<{
    rotation: number;
    scaleX: number;
    scaleY: number;
    centerX: number;
    centerY: number;
  }>(DEFAULT_TRANSFORMER_STATE);

  // Handle Shift key state
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.shiftKey) {
        setIsShiftKeyHeld(true);
        setIsDisconnectedMode(true);
        // Recalculate ghost point when Shift is pressed
        // Use a small delay to ensure state is updated
        setTimeout(() => {
          if (calculateGhostPointRef.current) {
            // Pass true for shiftKeyState since Shift is being pressed
            calculateGhostPointRef.current(true);
          }
        }, 0);
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (!e.shiftKey) {
        setIsShiftKeyHeld(false);
        setIsDisconnectedMode(false);
        // Clear ghost point when Shift is released
        setGhostPoint(null);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, []);

  const [draggedPointIndex, setDraggedPointIndex] = useState<number | null>(null);
  const [isShiftKeyHeld, setIsShiftKeyHeld] = useState(false);
  const [draggedControlPoint, setDraggedControlPoint] = useState<{
    pointIndex: number;
    controlIndex: number;
  } | null>(null);
  const [isDraggingShape, setIsDraggingShape] = useState(false);
  const shapeDragStartPos = useRef<{ x: number; y: number; imageX: number; imageY: number } | null>(null);
  const originalPointsPositions = useRef<
    Array<{ x: number; y: number; controlPoint1?: { x: number; y: number }; controlPoint2?: { x: number; y: number } }>
  >([]);
  const justFinishedShapeDrag = useRef(false);
  const shapeDragDistance = useRef(0);
  const [isDisconnectedMode, setIsDisconnectedMode] = useState(false);
  const [ghostPoint, setGhostPoint] = useState<GhostPointType | null>(null);

  // Clear ghost point when conditions change that should hide it
  useEffect(() => {
    // Clear ghost point when:
    // - Shape is disabled
    // - Shape is not selected
    // - Max points reached
    // Note: Shift key release is handled in handleKeyUp, not here
    if (disabled || !selected || (maxPoints !== undefined && initialPoints.length >= maxPoints)) {
      setGhostPoint(null);
    }
  }, [disabled, selected, maxPoints, initialPoints.length]);

  const [_newPointDragIndex, setNewPointDragIndex] = useState<number | null>(null);
  const [isDraggingNewBezier, setIsDraggingNewBezier] = useState(false);
  const [ghostPointDragInfo, setGhostPointDragInfo] = useState<{
    ghostPoint: GhostPointType;
    isDragging: boolean;
    dragDistance: number;
  } | null>(null);

  const cursorPositionRef = useRef<{
    x: number;
    y: number;
  } | null>(null);
  const ghostLineRafRef = useRef<number | null>(null);
  const lastCallbackTime = useRef<number>(DEFAULT_CALLBACK_TIME);
  const [visibleControlPoints, setVisibleControlPoints] = useState<Set<number>>(new Set());
  const [activePointId, setActivePointId] = useState<string | null>(null);
  const [isTransforming, setIsTransforming] = useState(false);

  // Flag to track if point selection was handled in VectorPoints onClick
  const pointSelectionHandled = useRef(false);

  // Ref to track the _transformable group for applying transformations
  const transformableGroupRef = useRef<Konva.Group>(null);

  // Ref to track click timeout for click/double-click debouncing
  const clickTimeoutRef = useRef<number | null>(null);

  // Flag to track if we've handled a double-click through debouncing
  const doubleClickHandledRef = useRef(false);

  // Track if we're currently transforming to avoid duplicate onTransformStart calls
  const isTransformingRef = useRef(false);

  // Helper function to call onTransformStart (only if not already transforming)
  const handleTransformStart = useCallback(() => {
    if (!isTransformingRef.current) {
      isTransformingRef.current = true;
      // Always call onTransformStart if provided, even if called multiple times
      // The flag prevents duplicate calls, but we ensure it's called at least once
      onTransformStart?.();
    }
  }, [onTransformStart]);

  // Helper function to call onTransformEnd (only if currently transforming)
  const handleTransformEnd = useCallback(
    (e?: Konva.KonvaEventObject<MouseEvent>) => {
      // Always reset the flag if we were transforming
      // This ensures we don't get stuck in a transforming state
      if (isTransformingRef.current) {
        isTransformingRef.current = false;
        // Always call onTransformEnd if provided to ensure history is unfrozen
        onTransformEnd?.(e);
      }
    },
    [onTransformEnd],
  );

  // Track initial transform state for delta calculation
  const initialTransformRef = useRef<{
    x: number;
    y: number;
    scaleX: number;
    scaleY: number;
    rotation: number;
  } | null>(null);

  // Define commitMultiRegionTransform as a useCallback so we can use it in both useImperativeHandle and onDragEnd
  const commitMultiRegionTransform = useCallback(() => {
    if (!isMultiRegionSelected || !transformableGroupRef.current || !initialTransformRef.current) {
      return;
    }

    // Get the _transformable group
    const transformableGroup = transformableGroupRef.current;

    // Get the group's current transform values
    const currentX = transformableGroup.x();
    const currentY = transformableGroup.y();
    const currentScaleX = transformableGroup.scaleX();
    const currentScaleY = transformableGroup.scaleY();
    const currentRotation = transformableGroup.rotation();

    // Calculate deltas from initial state
    const initial = initialTransformRef.current;
    const dx = currentX - initial.x;
    const dy = currentY - initial.y;
    const scaleX = currentScaleX / initial.scaleX;
    const scaleY = currentScaleY / initial.scaleY;
    const rotation = currentRotation - initial.rotation;

    // Apply constraints to the transform before committing
    const imageWidth = width || 0;
    const imageHeight = height || 0;

    let constrainedDx = dx;
    let constrainedDy = dy;
    const constrainedScaleX = scaleX;
    const constrainedScaleY = scaleY;

    if (imageWidth > 0 && imageHeight > 0) {
      // Calculate bounding box of current points after transform
      const xs = initialPoints.map((p) => p.x);
      const ys = initialPoints.map((p) => p.y);
      const minX = Math.min(...xs);
      const maxX = Math.max(...xs);
      const minY = Math.min(...ys);
      const maxY = Math.max(...ys);

      // Apply scale and position to get new bounds
      const scaledMinX = minX * scaleX + dx;
      const scaledMaxX = maxX * scaleX + dx;
      const scaledMinY = minY * scaleY + dy;
      const scaledMaxY = maxY * scaleY + dy;

      // Apply constraints
      if (scaledMinX < 0) constrainedDx = dx - scaledMinX;
      if (scaledMaxX > imageWidth) constrainedDx = dx - (scaledMaxX - imageWidth);
      if (scaledMinY < 0) constrainedDy = dy - scaledMinY;
      if (scaledMaxY > imageHeight) constrainedDy = dy - (scaledMaxY - imageHeight);
    }

    // Apply the transformation exactly as the single-region onTransformEnd handler does:
    // 1. Scale around origin (0,0)
    // 2. Rotate around origin (0,0)
    // 3. Translate by (constrainedDx, constrainedDy)
    const radians = rotation * (Math.PI / 180);
    const cos = Math.cos(radians);
    const sin = Math.sin(radians);

    const transformedVertices = initialPoints.map((point) => {
      // Step 1: Scale
      const x = point.x * constrainedScaleX;
      const y = point.y * constrainedScaleY;

      // Step 2: Rotate
      const rx = x * cos - y * sin;
      const ry = x * sin + y * cos;

      // Step 3: Translate and clamp to image bounds
      const translatedPos = {
        x: Math.max(0, Math.min(imageWidth, rx + constrainedDx)),
        y: Math.max(0, Math.min(imageHeight, ry + constrainedDy)),
      };
      // Apply pixel snapping if enabled
      const snappedPos = snapToPixel(translatedPos, pixelSnapping);
      const result = {
        ...point,
        x: snappedPos.x,
        y: snappedPos.y,
      };

      // Transform control points if bezier
      if (point.isBezier) {
        if (point.controlPoint1) {
          const cp1x = point.controlPoint1.x * constrainedScaleX;
          const cp1y = point.controlPoint1.y * constrainedScaleY;
          const cp1rx = cp1x * cos - cp1y * sin;
          const cp1ry = cp1x * sin + cp1y * cos;
          const cp1Translated = {
            x: Math.max(0, Math.min(imageWidth, cp1rx + constrainedDx)),
            y: Math.max(0, Math.min(imageHeight, cp1ry + constrainedDy)),
          };
          result.controlPoint1 = snapToPixel(cp1Translated, pixelSnapping);
        }
        if (point.controlPoint2) {
          const cp2x = point.controlPoint2.x * constrainedScaleX;
          const cp2y = point.controlPoint2.y * constrainedScaleY;
          const cp2rx = cp2x * cos - cp2y * sin;
          const cp2ry = cp2x * sin + cp2y * cos;
          const cp2Translated = {
            x: Math.max(0, Math.min(imageWidth, cp2rx + constrainedDx)),
            y: Math.max(0, Math.min(imageHeight, cp2ry + constrainedDy)),
          };
          result.controlPoint2 = snapToPixel(cp2Translated, pixelSnapping);
        }
      }

      return result;
    });

    // Update the points
    onPointsChange?.(transformedVertices);

    // Reset the _transformable group transform to identity
    // This ensures the visual representation matches the committed data
    transformableGroup.x(0);
    transformableGroup.y(0);
    transformableGroup.scaleX(1);
    transformableGroup.scaleY(1);
    transformableGroup.rotation(0);

    // Update the initial transform state to reflect the reset
    initialTransformRef.current = {
      x: 0,
      y: 0,
      scaleX: 1,
      scaleY: 1,
      rotation: 0,
    };

    // Detach and reattach the transformer to prevent resizing issues
    // BUT: Delay this when multiple regions are selected to allow other regions'
    // onTransformEnd handlers to fire first (e.g., PolygonRegion's Line onTransformEnd)
    const stage = transformableGroup.getStage();
    if (stage) {
      const transformer = stage.findOne("Transformer") as Konva.Transformer | undefined;
      if (transformer) {
        // Check if there are multiple nodes attached (multiple regions selected)
        const nodes = transformer.nodes();
        const hasMultipleRegions = nodes.length > 1;

        // If multiple regions, delay the detach/reattach to allow other onTransformEnd handlers to fire
        const delay = hasMultipleRegions ? 50 : 0;

        setTimeout(() => {
          // Temporarily detach the transformer
          transformer.nodes([]);

          // Force a redraw
          stage.batchDraw();

          // Reattach the transformer after a brief delay
          setTimeout(() => {
            transformer.nodes(nodes);
            stage.batchDraw();
          }, 0);
        }, delay);
      }
    }
  }, [isMultiRegionSelected, initialPoints, width, height, onPointsChange]);

  // Capture initial transform state when group is created
  useEffect(() => {
    if (isMultiRegionSelected && transformableGroupRef.current && !initialTransformRef.current) {
      const group = transformableGroupRef.current;
      initialTransformRef.current = {
        x: group.x(),
        y: group.y(),
        scaleX: group.scaleX(),
        scaleY: group.scaleY(),
        rotation: group.rotation(),
      };
    } else if (!isMultiRegionSelected) {
      // Reset when not in multi-region mode
      initialTransformRef.current = null;
    }
  }, [isMultiRegionSelected]);

  // Initialize PointCreationManager instance
  const pointCreationManager = useMemo(() => new PointCreationManager(), []);

  // Initialize VectorSelectionTracker
  const tracker = useMemo(() => VectorSelectionTracker.getInstance(), []);

  // Compute if path is closed based on point references
  // A path is closed if the first point's prevPointId points to the last point
  const isPathClosed = useMemo(() => {
    if (!allowClose || initialPoints.length < 2) {
      return false;
    }

    const firstPoint = initialPoints[0];
    const lastPoint = initialPoints[initialPoints.length - 1];

    // Path is closed if the first point's prevPointId points to the last point
    return firstPoint.prevPointId === lastPoint.id;
  }, [allowClose, initialPoints]);

  // Use external closed prop when provided, otherwise use computed value
  const finalIsPathClosed = allowClose && closed !== undefined ? closed : isPathClosed;

  // Debug logging for path closure state
  useEffect(() => {
    if (allowClose && initialPoints.length >= 2) {
      const firstPoint = initialPoints[0];
      const lastPoint = initialPoints[initialPoints.length - 1];
    }
  }, [allowClose, initialPoints, isPathClosed, finalIsPathClosed]);

  // Setter for path closed state - used when path is closed/opened programmatically
  const setIsPathClosed = useCallback(
    (closed: boolean) => {
      if (allowClose) {
        // Always notify parent when path closure state changes programmatically
        onPathClosedChange?.(closed);
      }
    },
    [allowClose, onPathClosedChange],
  );

  const isDragging = useRef(false);
  const [stageReadyRetry, setStageReadyRetry] = useState(0);
  const calculateGhostPointRef = useRef<
    ((shiftKeyState?: boolean, eventPos?: { x: number; y: number }) => void) | null
  >(null);
  const ghostPointRef = useRef<GhostPointRef | null>(null);

  // Ref to prevent effect from running multiple times
  const handlersAttachedRef = useRef(false);

  // Refs to access current values in event handlers without recreating them
  const currentValuesRef = useRef({
    initialPoints,
    effectiveSelectedPoints,
    allowClose,
    finalIsPathClosed,
    pixelSnapping,
    isDraggingNewBezier,
    ghostPointDragInfo,
    draggedPointIndex,
    draggedControlPoint,
    isDraggingShape,
    instanceId,
    transform,
    fitScale,
    x,
    y,
    width,
    height,
    skeletonEnabled,
    activePointId,
    lastAddedPointId,
    selected,
    disabled,
    onFinish,
    isShiftKeyHeld,
  });

  // Update refs on every render
  currentValuesRef.current = {
    initialPoints,
    effectiveSelectedPoints,
    allowClose,
    finalIsPathClosed,
    pixelSnapping,
    isDraggingNewBezier,
    ghostPointDragInfo,
    draggedPointIndex,
    draggedControlPoint,
    isDraggingShape,
    instanceId,
    transform,
    fitScale,
    x,
    y,
    width,
    height,
    skeletonEnabled,
    activePointId,
    lastAddedPointId,
    selected,
    disabled,
    onFinish,
    isShiftKeyHeld,
  };

  // Determine if drawing should be disabled based on current interaction context
  const isDrawingDisabled = () => {
    // Disable all interactions when disabled prop is true
    // Disable all interactions when selected prop is false
    // Disable drawing when Shift is held (for Shift+click functionality)
    // Disable drawing when multiple points are selected or when in transform mode
    if (
      disabled ||
      !selected ||
      isShiftKeyHeld ||
      effectiveSelectedPoints.size > SELECTION_SIZE.MULTI_SELECTION_MIN ||
      transformMode
    ) {
      return true;
    }

    // Dynamically check control point hover
    if (cursorPositionRef.current && initialPoints.length > 0) {
      const scale = transform.zoom * fitScale;
      const controlPointHitRadius = HIT_RADIUS.CONTROL_POINT / scale;

      for (let i = 0; i < initialPoints.length; i++) {
        const point = initialPoints[i];
        if (point.isBezier) {
          // Check control point 1
          if (point.controlPoint1) {
            const distance = Math.sqrt(
              (cursorPositionRef.current.x - point.controlPoint1.x) ** 2 +
                (cursorPositionRef.current.y - point.controlPoint1.y) ** 2,
            );
            if (distance <= controlPointHitRadius) {
              return true; // Disable drawing when hovering over control points
            }
          }
          // Check control point 2
          if (point.controlPoint2) {
            const distance = Math.sqrt(
              (cursorPositionRef.current.x - point.controlPoint2.x) ** 2 +
                (cursorPositionRef.current.y - point.controlPoint2.y) ** 2,
            );
            if (distance <= controlPointHitRadius) {
              return true; // Disable drawing when hovering over control points
            }
          }
        }
      }
    }

    // Dynamically check point hover
    if (cursorPositionRef.current && initialPoints.length > 0) {
      const scale = transform.zoom * fitScale;
      const selectionHitRadius = HIT_RADIUS.SELECTION / scale;

      for (let i = 0; i < initialPoints.length; i++) {
        const point = initialPoints[i];
        const distance = Math.sqrt(
          (cursorPositionRef.current.x - point.x) ** 2 + (cursorPositionRef.current.y - point.y) ** 2,
        );
        if (distance <= selectionHitRadius) {
          // If exactly one point is selected and this is that point, allow drawing
          if (selectedPoints.size === SELECTION_SIZE.MULTI_SELECTION_MIN && selectedPoints.has(i)) {
            continue; // Don't disable drawing for the selected point
          }

          // Don't disable drawing when hovering over the last point in the path
          // (so you can continue drawing from it)
          if (i === initialPoints.length - ARRAY_INDEX.LAST_OFFSET) {
            continue; // Don't disable drawing for the last point
          }

          // Don't disable drawing when hovering over the first point if path closing is possible
          // (so you can see the closing indicator)
          if (i === ARRAY_INDEX.FIRST && allowClose && !finalIsPathClosed) {
            continue; // Don't disable drawing for the first point when closing is possible
          }

          return true; // Disable drawing when hovering over other points
        }
      }
    }

    // Dynamically check segment hover (to hide ghost line when hovering over path segments)
    if (cursorPositionRef.current && initialPoints.length >= 2) {
      const scale = transform.zoom * fitScale;
      const segmentHitRadius = HIT_RADIUS.SEGMENT / scale; // Slightly larger than point hit radius

      // Use the same logic as findClosestPointOnPath for consistent Bezier curve detection
      const closestPathPoint = findClosestPointOnPath(
        cursorPositionRef.current,
        initialPoints,
        allowClose,
        finalIsPathClosed,
      );

      if (closestPathPoint && getDistance(cursorPositionRef.current, closestPathPoint.point) <= segmentHitRadius) {
        return true; // Disable drawing when hovering over segments
      }
    }

    return false; // Drawing is enabled
  };

  const drawingDisabled = isDrawingDisabled();

  // Notify parent when path closure state changes (only when not using external state)
  useEffect(() => {
    if (!(allowClose && closed !== undefined)) {
      onPathClosedChange?.(finalIsPathClosed);
    }
  }, [finalIsPathClosed, closed, allowClose, onPathClosedChange]);

  // Handle drawing mode changes
  useEffect(() => {
    if (!drawingDisabled) {
      setVisibleControlPoints(new Set());
    }
  }, [drawingDisabled]);

  // Initialize cursor position when points are available or component becomes active
  // This ensures ghost line can render immediately
  useEffect(() => {
    const group = stageRef.current;
    if (!group) return;

    const stage = group.getStage();
    if (!stage) return;

    // Try to get current mouse position and set cursor position
    const initializeCursorPosition = () => {
      const pos = stage.getPointerPosition();
      if (pos) {
        const imagePos = stageToImageCoordinates(pos, transform, fitScale, x, y);
        // Always update cursor position when points are available (not just when null)
        // This ensures ghost line can render immediately after region selection
        cursorPositionRef.current = imagePos;
        // Trigger a redraw to show ghost line
        if (ghostLineRafRef.current) {
          cancelAnimationFrame(ghostLineRafRef.current);
        }
        ghostLineRafRef.current = requestAnimationFrame(() => {
          stage.batchDraw();
        });
        return true;
      }
      return false;
    };

    // Try immediately
    const gotPosition = initializeCursorPosition();

    // Only set fallback position if this instance is active/selected and selected
    // Check if this instance is the active one using the tracker
    const isActiveInstance = tracker.getActiveInstanceId() === instanceId;
    const hasSelection = selectedPoints.size > 0 || effectiveSelectedPoints.size > 0;
    const isInstanceSelected = tracker.isInstanceSelected(instanceId);
    // Show ghost line only if not disabled AND selected AND (active OR has selection)
    const shouldShowGhostLine = !disabled && selected && (isActiveInstance || hasSelection || isInstanceSelected);

    // If we couldn't get the position and we have points, set a fallback position
    // Use the last point or center of the region as a fallback until mouse moves
    // Only do this for the active/selected instance that is selected
    if (!gotPosition && initialPoints.length > 0 && !cursorPositionRef.current && shouldShowGhostLine) {
      const lastPoint = initialPoints[initialPoints.length - 1];
      // Set cursor position to a small offset from the last point so ghost line is visible
      cursorPositionRef.current = {
        x: lastPoint.x + 50,
        y: lastPoint.y + 50,
      };
      // Trigger a redraw to show ghost line
      if (ghostLineRafRef.current) {
        cancelAnimationFrame(ghostLineRafRef.current);
      }
      ghostLineRafRef.current = requestAnimationFrame(() => {
        stage.batchDraw();
      });
    } else if (!shouldShowGhostLine && cursorPositionRef.current) {
      // Clear cursor position if this instance shouldn't show ghost line
      cursorPositionRef.current = null;
    }

    // Also try after a short delay to ensure stage is ready
    const timeout = setTimeout(() => {
      if (!cursorPositionRef.current) {
        initializeCursorPosition();
      }
    }, 0);

    // Add a one-time mousemove listener to capture cursor position immediately when mouse moves
    // This ensures we get the position even if getPointerPosition() returns null initially
    const handleOneTimeMouseMove = (e: Konva.KonvaEventObject<MouseEvent>) => {
      const pos = e.target.getStage()?.getPointerPosition();
      if (pos) {
        const imagePos = stageToImageCoordinates(pos, transform, fitScale, x, y);
        cursorPositionRef.current = imagePos;
        // Trigger a redraw to show ghost line
        if (ghostLineRafRef.current) {
          cancelAnimationFrame(ghostLineRafRef.current);
        }
        ghostLineRafRef.current = requestAnimationFrame(() => {
          stage.batchDraw();
        });
        // Remove listener after first capture
        stage.off("mousemove", handleOneTimeMouseMove);
      }
    };

    // Add one-time listener
    stage.on("mousemove", handleOneTimeMouseMove);

    return () => {
      clearTimeout(timeout);
      stage.off("mousemove", handleOneTimeMouseMove);
    };
  }, [
    initialPoints.length,
    transform,
    fitScale,
    x,
    y,
    selected,
    instanceId,
    selectedPoints.size,
    effectiveSelectedPoints.size,
  ]); // Re-run when points change, transform changes, or selection changes

  // Stabilize functions for tracker registration
  const getPoints = useCallback(() => initialPoints, [initialPoints]);
  const updatePoints = useCallback(
    (points: BezierPoint[]) => {
      // Set flag to prevent useEffect from running when we update internally
      isInternalUpdateRef.current = true;
      // Update the ref to track the last normalized points
      lastNormalizedPointsRef.current = points;
      // Update current points ref immediately for transformation callbacks
      currentPointsRef.current = points;
      setInitialPoints(points);
      // Clear flag immediately - it only needs to prevent the current useEffect run
      isInternalUpdateRef.current = false;
      // Track what we're sending to parent to detect circular updates
      lastSentToParentRef.current = points;
      onPointsChange?.(points);
    },
    [onPointsChange],
  );

  // Store updatePoints in ref for access in closures
  useEffect(() => {
    updatePointsRef.current = updatePoints;
  }, [updatePoints]);

  // Function to update current points ref - used by VectorTransformer during transformation
  const updateCurrentPointsRef = useCallback((points: BezierPoint[]) => {
    currentPointsRef.current = points;
  }, []);

  // Function to get current points ref - used by VectorTransformer during transformation
  const getCurrentPointsRef = useCallback(() => {
    return currentPointsRef.current;
  }, []);
  const setSelectedPointsStable = useCallback((selectedPoints: Set<number>) => {
    setSelectedPoints(selectedPoints);
  }, []);
  const setSelectedPointIndexStable = useCallback((index: number | null) => {
    setSelectedPointIndex(index);
  }, []);
  const getTransformStable = useCallback(() => transform, [transform]);
  const getFitScaleStable = useCallback(() => fitScale, [fitScale]);
  const getBoundsStable = useCallback(() => ({ width, height }), [width, height]);

  // Wrapper for onPointSelected to prevent infinite loops during programmatic selection
  const onPointSelectedWrapper = useCallback(
    (index: number | null) => {
      if (!isProgrammaticSelection.current && onPointSelected) {
        onPointSelected(index);
      }
    },
    [onPointSelected],
  );

  // Register instance with tracker
  useEffect(() => {
    const vectorInstance: VectorInstance = {
      id: instanceId,
      getPoints,
      updatePoints,
      setSelectedPoints: setSelectedPointsStable,
      setSelectedPointIndex: setSelectedPointIndexStable,
      onPointSelected: onPointSelectedWrapper,
      onTransformationComplete,
      getTransform: getTransformStable,
      getFitScale: getFitScaleStable,
      getBounds: getBoundsStable,
    };

    tracker.registerInstance(vectorInstance);

    return () => {
      tracker.unregisterInstance(instanceId);
    };
  }, [
    instanceId,
    tracker,
    getPoints,
    updatePoints,
    setSelectedPointsStable,
    setSelectedPointIndexStable,
    onPointSelectedWrapper,
    onTransformationComplete,
    getTransformStable,
    getFitScaleStable,
    getBoundsStable,
  ]);

  // Clear selection when component is disabled or not selected
  useEffect(() => {
    if (disabled || !selected) {
      setSelectedPointIndex(null);
      setSelectedPoints(new Set());
      setVisibleControlPoints(new Set());
      setDraggedControlPoint(null);
      setGhostPoint(null);
      setGhostPointDragInfo(null);
      setIsDraggingNewBezier(false);
      setNewPointDragIndex(null);
      // Hide all Bezier control points when not selected
      setVisibleControlPoints(new Set());
    }
  }, [selected]);
  const lastPos = useRef<{
    x: number;
    y: number;
    originalX?: number;
    originalY?: number;
    originalControlPoint1?: { x: number; y: number };
    originalControlPoint2?: { x: number; y: number };
  } | null>(null);

  // Set up Transformer nodes once when selection changes
  useEffect(() => {
    if (transformerRef.current) {
      if (effectiveSelectedPoints.size > SELECTION_SIZE.MULTI_SELECTION_MIN) {
        // Use setTimeout to ensure proxy nodes are rendered first
        setTimeout(() => {
          if (transformerRef.current) {
            // Set up proxy nodes once - transformer will manage them independently
            // Use getAllPoints() to get the correct proxy nodes for all points
            const allPoints = getAllPoints();
            const nodes = Array.from(effectiveSelectedPoints)
              .map((index) => {
                // Ensure the index is within bounds of all points
                if (index < allPoints.length) {
                  return proxyRefs.current[index];
                }
                return null;
              })
              .filter((node) => node?.getAbsoluteTransform) as Konva.Node[];

            if (nodes.length > 0) {
              // Always set the complete set of nodes - transformer will handle positioning
              transformerRef.current.nodes(nodes);
              transformerRef.current.getLayer()?.batchDraw();
            }
          }
        }, TRANSFORMER_SETUP_DELAY);
      } else {
        // Clear transformer when selection is less than minimum points for transformer
        setTimeout(() => {
          if (transformerRef.current) {
            transformerRef.current.nodes([]);
            transformerRef.current.getLayer()?.batchDraw();
          }
        }, TRANSFORMER_CLEAR_DELAY);
      }
    }
  }, [effectiveSelectedPoints]); // Depend on effectiveSelectedPoints to include transform mode

  // Note: We don't update proxy node positions during transformation
  // The transformer handles positioning the proxy nodes itself
  // This prevents conflicts and maintains the transformer's rotation state

  // Helper function to generate shape data and call transformation complete callback
  const notifyTransformationComplete = () => {
    // Get all points
    const allPoints = getAllPoints();

    if (format === ExportFormat.SIMPLE) {
      // Export in simple format
      // For simple format, we need to call a different callback or handle differently
      // since onTransformationComplete expects the complex format
    } else {
      // Export in regular format
      const exportedPoints = allPoints.map((point) => {
        const controlPoints: Array<{ x: number; y: number }> = [];

        if (point.isBezier) {
          if (point.controlPoint1) {
            controlPoints.push({
              x: point.controlPoint1.x,
              y: point.controlPoint1.y,
            });
          }
          if (point.controlPoint2) {
            controlPoints.push({
              x: point.controlPoint2.x,
              y: point.controlPoint2.y,
            });
          }
        }

        return {
          x: point.x,
          y: point.y,
          bezier: point.isBezier || false,
          controlPoints,
        };
      });

      // Check if we have enough points based on minPoints constraint
      const incomplete = minPoints !== undefined && allPoints.length < minPoints;

      const shapeData = {
        type: allowClose ? ShapeType.POLYGON : ShapeType.POLYLINE,
        isClosed: finalIsPathClosed,
        points: exportedPoints,
        incomplete,
      };

      onTransformationComplete?.(shapeData);
    }
  };

  // Helper function to check if we can add more points
  const canAddMorePoints = () => {
    return maxPoints === undefined || initialPoints.length < maxPoints;
  };

  // Update PointCreationManager props when relevant props change
  useEffect(() => {
    pointCreationManager.setProps({
      initialPoints,
      allowBezier,
      pixelSnapping,
      width,
      height,
      transform,
      fitScale,
      onPointsChange,
      onPointAdded,
      onPointEdited,
      canAddMorePoints,
      skeletonEnabled,
      lastAddedPointId,
      activePointId,
      setLastAddedPointId,
      setActivePointId,
      setVisibleControlPoints,
      setNewPointDragIndex,
      setIsDraggingNewBezier,
      ghostPoint,
      selectedPoints: effectiveSelectedPoints,
      isShiftKeyHeld,
      setGhostPoint,
    });
  }, [
    pointCreationManager,
    initialPoints,
    effectiveSelectedPoints,
    allowBezier,
    pixelSnapping,
    width,
    height,
    transform,
    fitScale,
    onPointsChange,
    onPointAdded,
    onPointEdited,
    canAddMorePoints,
    skeletonEnabled,
    lastAddedPointId,
    activePointId,
    setLastAddedPointId,
    setActivePointId,
    setVisibleControlPoints,
    setNewPointDragIndex,
    setIsDraggingNewBezier,
    ghostPoint,
    isShiftKeyHeld,
    setGhostPoint,
  ]);

  // Helper function to get all points for rendering and interactions
  const getAllPoints = () => {
    return [...initialPoints];
  };

  // Helper function to get all line segments for rendering
  const getAllLineSegments = () => {
    const segments: Array<{ from: BezierPoint; to: BezierPoint }> = [];
    const allPoints = getAllPoints();

    // In skeleton mode, we need to handle segments differently
    if (skeletonEnabled) {
      // Create a map for quick point lookup
      const pointMap = new Map<string, BezierPoint>();
      for (const point of allPoints) {
        pointMap.set(point.id, point);
      }

      // First, add all segments that have explicit prevPointId relationships
      for (const point of allPoints) {
        if (point.prevPointId) {
          const prevPoint = pointMap.get(point.prevPointId);
          if (prevPoint) {
            segments.push({ from: prevPoint, to: point });
          }
        }
      }

      // Then, handle points that don't have prevPointId but should be connected
      // These are points that were added but not yet connected to the active point
      const connectedPointIds = new Set<string>();
      segments.forEach((segment) => {
        connectedPointIds.add(segment.from.id);
        connectedPointIds.add(segment.to.id);
      });

      // Find points that aren't connected yet
      const unconnectedPoints = allPoints.filter((point) => !connectedPointIds.has(point.id));

      if (unconnectedPoints.length > 0 && activePointId) {
        const activePoint = pointMap.get(activePointId);
        if (activePoint) {
          // Connect unconnected points to the active point
          for (const unconnectedPoint of unconnectedPoints) {
            segments.push({ from: activePoint, to: unconnectedPoint });
          }
        }
      }
    } else {
      // Non-skeleton mode: use the original prevPointId logic
      // Create a map for quick point lookup
      const pointMap = new Map<string, BezierPoint>();
      for (const point of allPoints) {
        pointMap.set(point.id, point);
      }

      // Find all id-prevPointId pairs and create line segments
      for (const point of allPoints) {
        if (point.prevPointId) {
          const prevPoint = pointMap.get(point.prevPointId);
          if (prevPoint) {
            segments.push({ from: prevPoint, to: point });
          }
        }
      }
    }

    // The path closure is now determined by point references
    // If the first point has a prevPointId that references the last point,
    // the closing segment will be created automatically through the prevPointId logic above
    // No need to add an additional closing segment

    return segments;
  };

  // Helper function to get point info
  const getPointInfo = (globalIndex: number) => {
    if (globalIndex < initialPoints.length) {
      return {
        pathType: PathType.MAIN,
        pathIndex: globalIndex,
        point: initialPoints[globalIndex],
      };
    }
    return null;
  };

  // Helper function to update a point by its global index
  const updatePointByGlobalIndex = (globalIndex: number, updatedPoint: BezierPoint) => {
    // Update main path point
    if (globalIndex >= 0 && globalIndex < initialPoints.length) {
      const newPoints = [...initialPoints];
      newPoints[globalIndex] = updatedPoint;
      setInitialPoints(newPoints); // Update internal state
      onPointsChange?.(newPoints);
      return;
    }
  };

  // Convert a point between regular and Bezier
  const convertPointHandler = (pointIndex: number) => {
    const pointInfo = getPointInfo(pointIndex);
    if (!pointInfo) {
      return;
    }

    const point = pointInfo.point;

    if (point.isBezier) {
      // Convert from Bezier to regular
      convertPoint(
        pointInfo.pathIndex,
        initialPoints,
        onPointConverted,
        onPointsChange,
        onPathShapeChanged,
        setVisibleControlPoints,
        visibleControlPoints,
      );

      // Hide control points for the converted point
      setVisibleControlPoints((prev) => {
        const newSet = new Set(prev);
        newSet.delete(pointIndex);
        return newSet;
      });
    } else {
      // Check if bezier is allowed
      if (!allowBezier) {
        return;
      }

      // Convert from regular to Bezier
      // Don't convert first or last points of main path
      if (pointInfo.pathIndex === 0 || pointInfo.pathIndex === initialPoints.length - 1) {
        return;
      }

      convertPoint(
        pointInfo.pathIndex,
        initialPoints,
        onPointConverted,
        onPointsChange,
        onPathShapeChanged,
        setVisibleControlPoints,
        visibleControlPoints,
      );

      // Make control points visible for the converted point
      setVisibleControlPoints((prev) => {
        const newSet = new Set(prev);
        newSet.add(pointIndex);
        return newSet;
      });
    }

    // Notify transformation complete after point conversion
    notifyTransformationComplete();
  };

  // Expose methods through ref
  useImperativeHandle(ref, () => ({
    convertPoint: convertPointHandler,
    close: () => {
      if (!allowClose || initialPoints.length < MIN_POINTS_FOR_CLOSING) {
        return false;
      }

      // Check if we can close the path based on point count or bezier points
      const canClosePath = () => {
        // Allow closing if we have more than 2 points
        if (initialPoints.length > MIN_POINTS_FOR_BEZIER_CLOSING) {
          return true;
        }

        // Allow closing if we have at least one bezier point
        const hasBezierPoint = initialPoints.some((point) => point.isBezier);
        if (hasBezierPoint) {
          return true;
        }

        return false;
      };

      if (!canClosePath()) {
        return false;
      }

      // Additional validation: ensure we meet the minimum points requirement
      if (minPoints && initialPoints.length < minPoints) {
        return false;
      }

      // Check if path is already closed
      if (finalIsPathClosed) {
        return true;
      }

      // Close the path by setting the first point's prevPointId to the last point's ID
      const firstPoint = initialPoints[0];
      const lastPoint = initialPoints[initialPoints.length - 1];

      const updatedPoints = [...initialPoints];
      updatedPoints[0] = {
        ...firstPoint,
        prevPointId: lastPoint.id,
      };

      // Update the points and notify parent
      onPointsChange?.(updatedPoints);

      // Update the internal path closed state and notify parent
      setIsPathClosed(true);

      return true;
    },
    selectPointsByIds: (pointIds: string[]) => {
      // Check if this instance can have selection
      if (!tracker.canInstanceHaveSelection(instanceId)) {
        return; // Block the selection
      }

      // Find the indices of the points with the given IDs
      const selectedIndices = new Set<number>();
      let primarySelectedIndex: number | null = null;

      for (let i = 0; i < initialPoints.length; i++) {
        if (pointIds.includes(initialPoints[i].id)) {
          selectedIndices.add(i);
          // Set the first found point as the primary selected point
          if (primarySelectedIndex === null) {
            primarySelectedIndex = i;
          }
        }
      }

      // Use tracker for global selection management
      isProgrammaticSelection.current = true;
      tracker.selectPoints(instanceId, selectedIndices);
      setTimeout(() => {
        isProgrammaticSelection.current = false;
      }, 0);
    },
    clearSelection: () => {
      // Use tracker for global selection management
      isProgrammaticSelection.current = true;
      tracker.selectPoints(instanceId, new Set());
      setTimeout(() => {
        isProgrammaticSelection.current = false;
      }, 0);
    },
    getSelectedPointIds: () => {
      const selectedIds: string[] = [];
      selectedPoints.forEach((index) => {
        if (index < initialPoints.length) {
          selectedIds.push(initialPoints[index].id);
        }
      });
      return selectedIds;
    },
    exportShape: () => {
      const exportedPoints = initialPoints.map((point) => {
        const controlPoints: Array<{ x: number; y: number }> = [];

        if (point.isBezier) {
          if (point.controlPoint1) {
            controlPoints.push({
              x: point.controlPoint1.x,
              y: point.controlPoint1.y,
            });
          }
          if (point.controlPoint2) {
            controlPoints.push({
              x: point.controlPoint2.x,
              y: point.controlPoint2.y,
            });
          }
        }

        return {
          x: point.x,
          y: point.y,
          bezier: point.isBezier || false,
          controlPoints,
        };
      });

      // Check if we have enough points based on minPoints constraint
      const incomplete = minPoints !== undefined && initialPoints.length < minPoints;

      return {
        type: allowClose ? ShapeType.POLYGON : ShapeType.POLYLINE,
        isClosed: finalIsPathClosed,
        points: exportedPoints,
        incomplete,
      };
    },
    exportSimpleShape: () => {
      const simplePoints = convertBezierToSimplePoints(initialPoints);

      // Check if we have enough points based on minPoints constraint
      const incomplete = minPoints !== undefined && initialPoints.length < minPoints;

      return {
        type: allowClose ? ShapeType.POLYGON : ShapeType.POLYLINE,
        isClosed: finalIsPathClosed,
        points: simplePoints,
        incomplete,
      };
    },
    // Programmatic point creation methods
    startPoint: (x: number, y: number) => pointCreationManager.startPoint(x, y),
    updatePoint: (x: number, y: number) => pointCreationManager.updatePoint(x, y),
    commitPoint: (x: number, y: number) => pointCreationManager.commitPoint(x, y),
    // Programmatic point transformation methods
    translatePoints: (dx: number, dy: number, pointIds?: string[]) => {
      const pointsToTransform = pointIds ? initialPoints.filter((p) => pointIds.includes(p.id)) : initialPoints;

      const updatedPoints = initialPoints.map((point) => {
        if (pointsToTransform.some((p) => p.id === point.id)) {
          const updatedPoint = { ...point };

          // Apply translation to main point
          updatedPoint.x += dx;
          updatedPoint.y += dy;

          // Apply translation to control points if it's a bezier point
          if (updatedPoint.isBezier) {
            if (updatedPoint.controlPoint1) {
              updatedPoint.controlPoint1 = {
                ...updatedPoint.controlPoint1,
                x: updatedPoint.controlPoint1.x + dx,
                y: updatedPoint.controlPoint1.y + dy,
              };
            }
            if (updatedPoint.controlPoint2) {
              updatedPoint.controlPoint2 = {
                ...updatedPoint.controlPoint2,
                x: updatedPoint.controlPoint2.x + dx,
                y: updatedPoint.controlPoint2.y + dy,
              };
            }
          }

          return updatedPoint;
        }
        return point;
      });

      onPointsChange?.(updatedPoints);
    },
    rotatePoints: (angle: number, centerX: number, centerY: number, pointIds?: string[]) => {
      const pointsToTransform = pointIds ? initialPoints.filter((p) => pointIds.includes(p.id)) : initialPoints;

      // If no point IDs provided, calculate center of the entire shape
      let actualCenterX = centerX;
      let actualCenterY = centerY;

      if (!pointIds) {
        // Use the accurate shape bounding box calculation
        const bbox = calculateShapeBoundingBox(initialPoints);
        actualCenterX = (bbox.left + bbox.right) / CENTER_CALCULATION_DIVISOR;
        actualCenterY = (bbox.top + bbox.bottom) / CENTER_CALCULATION_DIVISOR;
      }

      const radians = angle * DEGREES_TO_RADIANS;
      const cos = Math.cos(radians);
      const sin = Math.sin(radians);

      const updatedPoints = initialPoints.map((point) => {
        if (pointsToTransform.some((p) => p.id === point.id)) {
          const updatedPoint = { ...point };

          // Apply rotation to main point
          const dx = updatedPoint.x - actualCenterX;
          const dy = updatedPoint.y - actualCenterY;
          updatedPoint.x = actualCenterX + dx * cos - dy * sin;
          updatedPoint.y = actualCenterY + dx * sin + dy * cos;

          // Apply rotation to control points if it's a bezier point
          if (updatedPoint.isBezier) {
            if (updatedPoint.controlPoint1) {
              const cp1Dx = updatedPoint.controlPoint1.x - actualCenterX;
              const cp1Dy = updatedPoint.controlPoint1.y - actualCenterY;
              updatedPoint.controlPoint1 = {
                ...updatedPoint.controlPoint1,
                x: actualCenterX + cp1Dx * cos - cp1Dy * sin,
                y: actualCenterY + cp1Dx * sin + cp1Dy * cos,
              };
            }
            if (updatedPoint.controlPoint2) {
              const cp2Dx = updatedPoint.controlPoint2.x - actualCenterX;
              const cp2Dy = updatedPoint.controlPoint2.y - actualCenterY;
              updatedPoint.controlPoint2 = {
                ...updatedPoint.controlPoint2,
                x: actualCenterX + cp2Dx * cos - cp2Dy * sin,
                y: actualCenterY + cp2Dx * sin + cp2Dy * cos,
              };
            }
          }

          return updatedPoint;
        }
        return point;
      });

      onPointsChange?.(updatedPoints);
    },
    scalePoints: (scaleX: number, scaleY: number, centerX: number, centerY: number, pointIds?: string[]) => {
      const pointsToTransform = pointIds ? initialPoints.filter((p) => pointIds.includes(p.id)) : initialPoints;

      // If no point IDs provided, calculate center of the entire shape
      let actualCenterX = centerX;
      let actualCenterY = centerY;

      if (!pointIds) {
        // Use the accurate shape bounding box calculation
        const bbox = calculateShapeBoundingBox(initialPoints);
        actualCenterX = (bbox.left + bbox.right) / CENTER_CALCULATION_DIVISOR;
        actualCenterY = (bbox.top + bbox.bottom) / CENTER_CALCULATION_DIVISOR;
      }

      const updatedPoints = initialPoints.map((point) => {
        if (pointsToTransform.some((p) => p.id === point.id)) {
          const updatedPoint = { ...point };

          // Apply scaling to main point
          const dx = updatedPoint.x - actualCenterX;
          const dy = updatedPoint.y - actualCenterY;
          updatedPoint.x = actualCenterX + dx * scaleX;
          updatedPoint.y = actualCenterY + dy * scaleY;

          // Apply scaling to control points if it's a bezier point
          if (updatedPoint.isBezier) {
            if (updatedPoint.controlPoint1) {
              const cp1Dx = updatedPoint.controlPoint1.x - actualCenterX;
              const cp1Dy = updatedPoint.controlPoint1.y - actualCenterY;
              updatedPoint.controlPoint1 = {
                ...updatedPoint.controlPoint1,
                x: actualCenterX + cp1Dx * scaleX,
                y: actualCenterY + cp1Dy * scaleY,
              };
            }
            if (updatedPoint.controlPoint2) {
              const cp2Dx = updatedPoint.controlPoint2.x - actualCenterX;
              const cp2Dy = updatedPoint.controlPoint2.y - actualCenterY;
              updatedPoint.controlPoint2 = {
                ...updatedPoint.controlPoint2,
                x: actualCenterX + cp2Dx * scaleX,
                y: actualCenterY + cp2Dy * scaleY,
              };
            }
          }

          return updatedPoint;
        }
        return point;
      });

      onPointsChange?.(updatedPoints);
    },
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
    ) => {
      const pointsToTransform = pointIds ? initialPoints.filter((p) => pointIds.includes(p.id)) : initialPoints;

      // If no point IDs provided and we need center point, calculate center of the entire shape
      let actualCenterX = transformation.centerX;
      let actualCenterY = transformation.centerY;

      if (
        !pointIds &&
        (transformation.rotation !== undefined ||
          transformation.scaleX !== undefined ||
          transformation.scaleY !== undefined)
      ) {
        // Use the accurate shape bounding box calculation
        const bbox = calculateShapeBoundingBox(initialPoints);
        actualCenterX = (bbox.left + bbox.right) / CENTER_CALCULATION_DIVISOR;
        actualCenterY = (bbox.top + bbox.bottom) / CENTER_CALCULATION_DIVISOR;
      }

      const updatedPoints = initialPoints.map((point) => {
        if (pointsToTransform.some((p) => p.id === point.id)) {
          const updatedPoint = { ...point };

          // Apply translation
          if (transformation.dx !== undefined) {
            updatedPoint.x += transformation.dx;
            updatedPoint.y += transformation.dy || DEFAULT_OFFSET;
          }

          // Apply rotation and scaling (need center point)
          if (
            (transformation.rotation !== undefined ||
              transformation.scaleX !== undefined ||
              transformation.scaleY !== undefined) &&
            actualCenterX !== undefined &&
            actualCenterY !== undefined
          ) {
            let finalX = updatedPoint.x;
            let finalY = updatedPoint.y;

            // Apply scaling
            if (transformation.scaleX !== undefined || transformation.scaleY !== undefined) {
              const scaleX = transformation.scaleX || DEFAULT_SCALE;
              const scaleY = transformation.scaleY || DEFAULT_SCALE;
              const dx = finalX - actualCenterX;
              const dy = finalY - actualCenterY;
              finalX = actualCenterX + dx * scaleX;
              finalY = actualCenterY + dy * scaleY;
            }

            // Apply rotation
            if (transformation.rotation !== undefined) {
              const radians = transformation.rotation * DEGREES_TO_RADIANS;
              const cos = Math.cos(radians);
              const sin = Math.sin(radians);
              const dx = finalX - actualCenterX;
              const dy = finalY - actualCenterY;
              finalX = actualCenterX + dx * cos - dy * sin;
              finalY = actualCenterY + dx * sin + dy * cos;
            }

            updatedPoint.x = finalX;
            updatedPoint.y = finalY;
          }

          // Apply transformations to control points if it's a bezier point
          if (updatedPoint.isBezier) {
            if (updatedPoint.controlPoint1) {
              const cp1 = { ...updatedPoint.controlPoint1 };

              // Apply translation
              if (transformation.dx !== undefined) {
                cp1.x += transformation.dx;
                cp1.y += transformation.dy || 0;
              }

              // Apply rotation and scaling
              if (
                (transformation.rotation !== undefined ||
                  transformation.scaleX !== undefined ||
                  transformation.scaleY !== undefined) &&
                actualCenterX !== undefined &&
                actualCenterY !== undefined
              ) {
                let finalCp1X = cp1.x;
                let finalCp1Y = cp1.y;

                // Apply scaling
                if (transformation.scaleX !== undefined || transformation.scaleY !== undefined) {
                  const scaleX = transformation.scaleX || 1;
                  const scaleY = transformation.scaleY || 1;
                  const dx = finalCp1X - actualCenterX;
                  const dy = finalCp1Y - actualCenterY;
                  finalCp1X = actualCenterX + dx * scaleX;
                  finalCp1Y = actualCenterY + dy * scaleY;
                }

                // Apply rotation
                if (transformation.rotation !== undefined) {
                  const radians = transformation.rotation * DEGREES_TO_RADIANS;
                  const cos = Math.cos(radians);
                  const sin = Math.sin(radians);
                  const dx = finalCp1X - actualCenterX;
                  const dy = finalCp1Y - actualCenterY;
                  finalCp1X = actualCenterX + dx * cos - dy * sin;
                  finalCp1Y = actualCenterY + dx * sin + dy * cos;
                }

                cp1.x = finalCp1X;
                cp1.y = finalCp1Y;
              }

              updatedPoint.controlPoint1 = cp1;
            }

            if (updatedPoint.controlPoint2) {
              const cp2 = { ...updatedPoint.controlPoint2 };

              // Apply translation
              if (transformation.dx !== undefined) {
                cp2.x += transformation.dx;
                cp2.y += transformation.dy || 0;
              }

              // Apply rotation and scaling
              if (
                (transformation.rotation !== undefined ||
                  transformation.scaleX !== undefined ||
                  transformation.scaleY !== undefined) &&
                actualCenterX !== undefined &&
                actualCenterY !== undefined
              ) {
                let finalCp2X = cp2.x;
                let finalCp2Y = cp2.y;

                // Apply scaling
                if (transformation.scaleX !== undefined || transformation.scaleY !== undefined) {
                  const scaleX = transformation.scaleX || 1;
                  const scaleY = transformation.scaleY || 1;
                  const dx = finalCp2X - actualCenterX;
                  const dy = finalCp2Y - actualCenterY;
                  finalCp2X = actualCenterX + dx * scaleX;
                  finalCp2Y = actualCenterY + dy * scaleY;
                }

                // Apply rotation
                if (transformation.rotation !== undefined) {
                  const radians = transformation.rotation * DEGREES_TO_RADIANS;
                  const cos = Math.cos(radians);
                  const sin = Math.sin(radians);
                  const dx = finalCp2X - actualCenterX;
                  const dy = finalCp2Y - actualCenterY;
                  finalCp2X = actualCenterX + dx * cos - dy * sin;
                  finalCp2Y = actualCenterY + dx * sin + dy * cos;
                }

                cp2.x = finalCp2X;
                cp2.y = finalCp2Y;
              }

              updatedPoint.controlPoint2 = cp2;
            }
          }

          return updatedPoint;
        }
        return point;
      });

      onPointsChange?.(updatedPoints);
    },
    // Shape analysis methods
    getShapeBoundingBox: () => {
      return calculateShapeBoundingBox(initialPoints);
    },
    // Hit testing method
    isPointOverShape: (x: number, y: number, hitRadius = 10) => {
      // Convert screen coordinates to image coordinates
      const imageX = (x - transform.offsetX) / (fitScale * transform.zoom);
      const imageY = (y - transform.offsetY) / (fitScale * transform.zoom);
      const point = { x: imageX, y: imageY };

      // If no points, return false
      if (initialPoints.length === 0) {
        return false;
      }

      // First check if hovering over any individual point (vertices)
      for (const vertex of initialPoints) {
        const distance = getDistance(point, vertex);
        if (distance <= hitRadius / (fitScale * transform.zoom)) {
          return true; // Hovering over a vertex
        }
      }

      // For single point, we already checked above, so return false if not hit
      if (initialPoints.length === 1) {
        return false;
      }

      // For polylines and polygons, check if point is close to any segment
      const closestPathPoint = findClosestPointOnPath(point, initialPoints, allowClose, finalIsPathClosed);

      if (closestPathPoint) {
        const distance = getDistance(point, closestPathPoint.point);
        return distance <= hitRadius / (fitScale * transform.zoom);
      }

      // For closed polygons, also check if point is inside the polygon
      if (finalIsPathClosed && initialPoints.length >= 3) {
        return isPointInPolygon(point, initialPoints);
      }

      return false;
    },
    // Multi-region transformation method - applies group transform to points
    commitMultiRegionTransform,
    // Delete multiple points by their IDs
    deletePointsByIds: (pointIds: string[]) => {
      if (!pointIds || pointIds.length === 0) return;

      // Find indices of points to delete (in reverse order to maintain correct indices)
      const indicesToDelete = pointIds
        .map((id) => initialPoints.findIndex((p) => p.id === id))
        .filter((idx) => idx >= 0)
        .sort((a, b) => b - a); // Sort descending to delete from end to start

      if (indicesToDelete.length === 0) return;

      // Create a set of deleted point IDs for quick lookup
      const deletedPointIds = new Set(pointIds);

      // Delete points one by one in reverse order (from highest index to lowest)
      // This ensures indices remain valid as we delete
      let updatedPoints = [...initialPoints];
      let updatedSelectedPointIndex = selectedPointIndex;
      let updatedLastAddedPointId = lastAddedPointId;

      for (const index of indicesToDelete) {
        if (index < 0 || index >= updatedPoints.length) continue;

        const deletedPoint = updatedPoints[index];
        const newPoints = [...updatedPoints];
        newPoints.splice(index, 1);

        // Reconnect points after deletion (same logic as deletePoint function)
        // For skeleton mode: use deleted point's prevPointId
        for (let i = 0; i < newPoints.length; i++) {
          const point = newPoints[i];
          if (point.prevPointId === deletedPoint.id) {
            let newPrevPointId: string | undefined = deletedPoint.prevPointId;

            // Edge cases:
            if (index === 0) {
              // If we deleted the first point, this point becomes the new first point
              newPrevPointId = undefined;
            } else if (!deletedPoint.prevPointId) {
              // If deleted point had no prevPointId (was a root point), this point becomes a root
              newPrevPointId = undefined;
            } else if (deletedPointIds.has(deletedPoint.prevPointId)) {
              // If the previous point is also being deleted, we need to find the next valid ancestor
              // This handles cascading deletions in skeleton mode
              let ancestorId = deletedPoint.prevPointId;
              while (ancestorId && deletedPointIds.has(ancestorId)) {
                const ancestorIndex = updatedPoints.findIndex((p) => p.id === ancestorId);
                if (ancestorIndex >= 0 && ancestorIndex < updatedPoints.length) {
                  ancestorId = updatedPoints[ancestorIndex].prevPointId;
                } else {
                  ancestorId = undefined;
                  break;
                }
              }
              newPrevPointId = ancestorId;
            }
            // Otherwise, use deletedPoint.prevPointId which is correct for both linear and skeleton modes

            newPoints[i] = {
              ...point,
              prevPointId: newPrevPointId,
            };
          }
        }

        // Update selection state
        if (updatedSelectedPointIndex === index) {
          updatedSelectedPointIndex = null;
          onPointSelected?.(null);
        } else if (updatedSelectedPointIndex !== null && updatedSelectedPointIndex > index) {
          updatedSelectedPointIndex = updatedSelectedPointIndex - 1;
        }

        // Handle active point
        if (updatedLastAddedPointId === deletedPoint.id) {
          if (newPoints.length > 0) {
            const newLastPoint = newPoints[newPoints.length - 1];
            updatedLastAddedPointId = newLastPoint.id;
          } else {
            updatedLastAddedPointId = null;
          }
        }

        // Update visible control points
        setVisibleControlPoints((prev) => {
          const newSet = new Set(prev);
          newSet.delete(index);
          const adjustedSet = new Set<number>();
          for (const pointIndex of Array.from(newSet)) {
            if (pointIndex > index) {
              adjustedSet.add(pointIndex - 1);
            } else {
              adjustedSet.add(pointIndex);
            }
          }
          return adjustedSet;
        });

        onPointRemoved?.(deletedPoint, index);
        updatedPoints = newPoints;
      }

      // Clear selection after deleting all selected points
      setSelectedPointIndex(updatedSelectedPointIndex);
      setLastAddedPointId(updatedLastAddedPointId);
      tracker.selectPoints(instanceId, new Set());
      onPointsChange?.(updatedPoints);
    },
  }));

  // Ensure commitMultiRegionTransform is called when ImageTransformer's onDragEnd fires
  // ImageTransformer will call applyTransform which calls commitMultiRegionTransform
  // But we also need to ensure the Group position is preserved when selection is cleared
  // by committing the transform before the selection is cleared
  useEffect(() => {
    if (!isMultiRegionSelected && transformableGroupRef.current) {
      // When selection is cleared, commit any pending transform first
      const group = transformableGroupRef.current;
      const currentX = group.x();
      const currentY = group.y();

      // If there's a pending transform, commit it before the Group is unmounted/reset
      if ((currentX !== 0 || currentY !== 0) && initialTransformRef.current) {
        commitMultiRegionTransform();
        handleTransformEnd();
      }
    }
  }, [isMultiRegionSelected, commitMultiRegionTransform, handleTransformEnd]);

  // Clean up click timeout on unmount
  useEffect(() => {
    return () => {
      if (clickTimeoutRef.current) {
        clearTimeout(clickTimeoutRef.current);
        clickTimeoutRef.current = null;
      }
    };
  }, []);

  // Set up stage-level event listeners for cursor position, ghost point, and point dragging
  // This allows these features to work even when the invisible shape is disabled
  useEffect(() => {
    // Prevent running if handlers are already attached
    // This stops the infinite loop caused by state updates triggering re-renders
    if (handlersAttachedRef.current) {
      return () => {}; // Return empty cleanup function
    }

    const group = stageRef.current;
    if (!group) {
      // If stageRef is not available yet, try again after a short delay
      const retryTimeout = setTimeout(() => {
        if (!handlersAttachedRef.current) {
          // Force re-run by incrementing retry counter
          setStageReadyRetry((prev) => prev + 1);
        }
      }, 100);
      return () => {
        clearTimeout(retryTimeout);
      };
    }

    const stage = group.getStage();
    if (!stage) {
      // If stage is not available yet, try again after a short delay
      const retryTimeout = setTimeout(() => {
        if (!handlersAttachedRef.current) {
          // Force re-run by incrementing retry counter
          setStageReadyRetry((prev) => prev + 1);
        }
      }, 100);
      return () => {
        clearTimeout(retryTimeout);
      };
    }

    handlersAttachedRef.current = true;

    // Helper function to calculate and set ghost point based on current cursor position
    const calculateGhostPoint = (shiftKeyState?: boolean, eventPos?: { x: number; y: number }) => {
      const group = stageRef.current;
      if (!group) return;
      const stage = group.getStage();
      if (!stage) return;

      // Use event position if provided, otherwise fall back to stage.getPointerPosition()
      const pos = eventPos || stage.getPointerPosition();
      if (!pos) return;

      const {
        transform,
        fitScale,
        x,
        y,
        width,
        height,
        initialPoints,
        allowClose,
        finalIsPathClosed,
        pixelSnapping,
        isDraggingNewBezier,
        ghostPointDragInfo,
        selected,
        disabled,
        isShiftKeyHeld: refShiftState,
      } = currentValuesRef.current;

      if (disabled || !selected || isDragging.current || isDraggingNewBezier || ghostPointDragInfo?.isDragging) {
        return;
      }

      const imagePos = stageToImageCoordinates(pos, transform, fitScale, x, y);

      // Only process ghost point logic if within bounds
      if (imagePos.x >= 0 && imagePos.x <= width && imagePos.y >= 0 && imagePos.y <= height) {
        // Use provided shiftKeyState or fall back to ref value
        const currentShiftState = shiftKeyState !== undefined ? shiftKeyState : (refShiftState ?? false);

        if (initialPoints.length >= 2 && currentShiftState) {
          const scale = transform.zoom * fitScale;
          const hitRadius = HIT_RADIUS.SELECTION / scale;
          let isOverPoint = false;

          for (let i = 0; i < initialPoints.length; i++) {
            const point = initialPoints[i];
            const distance = Math.sqrt((imagePos.x - point.x) ** 2 + (imagePos.y - point.y) ** 2);

            if (distance <= hitRadius) {
              isOverPoint = true;
              break;
            }
          }

          if (isOverPoint) {
            setGhostPoint(null);
          } else {
            const closestPathPoint = findClosestPointOnPath(imagePos, initialPoints, allowClose, finalIsPathClosed);

            if (closestPathPoint) {
              const snappedGhostPoint = snapToPixel(closestPathPoint.point, pixelSnapping);

              // Always create a new ghost point object to ensure React detects the change
              let newGhostPoint: { x: number; y: number; prevPointId: string; nextPointId: string };

              if (closestPathPoint.segmentIndex === initialPoints.length) {
                const lastPoint = initialPoints[initialPoints.length - 1];
                const firstPoint = initialPoints[0];

                newGhostPoint = {
                  x: snappedGhostPoint.x,
                  y: snappedGhostPoint.y,
                  prevPointId: lastPoint.id,
                  nextPointId: firstPoint.id,
                };
              } else {
                const currentPoint = initialPoints[closestPathPoint.segmentIndex];
                const prevPoint = currentPoint?.prevPointId
                  ? initialPoints.find((p) => p.id === currentPoint.prevPointId)
                  : null;

                if (currentPoint && prevPoint) {
                  newGhostPoint = {
                    x: snappedGhostPoint.x,
                    y: snappedGhostPoint.y,
                    prevPointId: prevPoint.id,
                    nextPointId: currentPoint.id,
                  };
                } else {
                  setGhostPoint(null);
                  return;
                }
              }

              // Always update the ghost point with a new object reference
              // This ensures React detects the change and re-renders
              setGhostPoint({ ...newGhostPoint });

              // Also update directly via ref for immediate visual update
              if (ghostPointRef.current) {
                ghostPointRef.current.updatePosition(newGhostPoint.x, newGhostPoint.y);
              }
            } else {
              setGhostPoint(null);
            }
          }
        } else {
          setGhostPoint(null);
        }
      } else {
        setGhostPoint(null);
      }
    };

    // Store the function in a ref so it can be accessed from handleKeyDown
    calculateGhostPointRef.current = calculateGhostPoint;

    // Only set up stage-level dragging when disableInternalPointAddition is true
    // Otherwise, let the layer handlers handle it
    if (!disableInternalPointAddition) {
      // Still handle cursor position and ghost point
      const handleStageMouseMove = (e: Konva.KonvaEventObject<MouseEvent>) => {
        // Use stage.getPointerPosition() directly for consistent coordinate space
        const pos = stage.getPointerPosition();
        if (!pos) return;

        // Get current values from ref to avoid stale closures
        const {
          transform,
          fitScale,
          x,
          y,
          width,
          height,
          initialPoints,
          allowClose,
          finalIsPathClosed,
          pixelSnapping,
          isDraggingNewBezier,
          ghostPointDragInfo,
          selected,
        } = currentValuesRef.current;

        // Update Shift key state from the event to keep it in sync
        if (e.evt.shiftKey !== isShiftKeyHeld) {
          setIsShiftKeyHeld(e.evt.shiftKey);
        }

        // Debug: Log coordinate conversion
        const imagePos = stageToImageCoordinates(pos, transform, fitScale, x, y);

        // Always update cursor position (even outside bounds) so ghost line can work
        cursorPositionRef.current = imagePos;

        // Use RAF to batch redraw calls for performance
        if (ghostLineRafRef.current) {
          cancelAnimationFrame(ghostLineRafRef.current);
        }
        ghostLineRafRef.current = requestAnimationFrame(() => {
          stage.batchDraw();
        });

        // Recalculate ghost point using the helper function
        // Pass the event's shiftKey state and position for real-time updates
        calculateGhostPoint(e.evt.shiftKey, pos);
      };

      const handleStageMouseEnter = (e: Konva.KonvaEventObject<MouseEvent>) => {
        // Capture cursor position when mouse enters stage so ghost line can render immediately
        const pos = e.target.getStage()?.getPointerPosition();
        if (pos) {
          const { transform, fitScale, x, y } = currentValuesRef.current;
          const imagePos = stageToImageCoordinates(pos, transform, fitScale, x, y);
          cursorPositionRef.current = imagePos;
          // Trigger a redraw to show ghost line
          if (ghostLineRafRef.current) {
            cancelAnimationFrame(ghostLineRafRef.current);
          }
          ghostLineRafRef.current = requestAnimationFrame(() => {
            stage.batchDraw();
          });
        }
      };

      const handleStageMouseLeave = () => {
        cursorPositionRef.current = null;
        setGhostPoint(null);
      };

      stage.on("mousemove", handleStageMouseMove);
      stage.on("mouseenter", handleStageMouseEnter);
      stage.on("mouseleave", handleStageMouseLeave);

      // Try to initialize cursor position if mouse is already over the stage
      // This ensures ghost line can render immediately even if mouseenter didn't fire
      const tryInitializeCursorPosition = () => {
        const pos = stage.getPointerPosition();
        if (pos) {
          const { transform, fitScale, x, y } = currentValuesRef.current;
          const imagePos = stageToImageCoordinates(pos, transform, fitScale, x, y);
          cursorPositionRef.current = imagePos;
          // Trigger a redraw to show ghost line
          if (ghostLineRafRef.current) {
            cancelAnimationFrame(ghostLineRafRef.current);
          }
          ghostLineRafRef.current = requestAnimationFrame(() => {
            stage.batchDraw();
          });
        }
      };

      // Try to initialize immediately
      tryInitializeCursorPosition();

      // Also try after a short delay in case the stage isn't ready yet
      const initTimeout = setTimeout(() => {
        tryInitializeCursorPosition();
      }, 0);

      return () => {
        clearTimeout(initTimeout);
        if (ghostLineRafRef.current) {
          cancelAnimationFrame(ghostLineRafRef.current);
        }
        stage.off("mousemove", handleStageMouseMove);
        stage.off("mouseenter", handleStageMouseEnter);
        stage.off("mouseleave", handleStageMouseLeave);
      };
    }

    // When disableInternalPointAddition is true, handle point dragging at stage level
    const handleStageMouseDown = (e: Konva.KonvaEventObject<MouseEvent>) => {
      // Get current values from ref to avoid stale closures
      const {
        initialPoints,
        effectiveSelectedPoints,
        instanceId,
        transform,
        fitScale,
        x,
        y,
        skeletonEnabled,
        activePointId,
        lastAddedPointId,
        allowClose,
        finalIsPathClosed,
        selected,
        disabled,
        onFinish,
      } = currentValuesRef.current;

      // Prevent all interactions when disabled
      if (disabled) {
        return;
      }

      // Check if event target belongs to this instance's group
      const target = e.target;
      let targetGroup: Konva.Node | null = target;
      while (targetGroup && targetGroup !== group) {
        targetGroup = targetGroup.getParent();
      }
      // If target is not within our group, ignore this event
      if (targetGroup !== group) return;

      // Use e.target.getStage() to match how layer handlers get pointer position
      const pos = e.target.getStage()?.getPointerPosition();
      if (!pos) return;

      const imagePos = stageToImageCoordinates(pos, transform, fitScale, x, y);

      // Check if clicking on a point (by checking if target is a Circle with name starting with "point-")
      const targetName = target.name();
      if (targetName && targetName.startsWith("point-")) {
        // Extract point index from name (format: "point-{index}")
        const match = targetName.match(/^point-(\d+)$/);
        if (match) {
          const pointIndex = Number.parseInt(match[1], 10);
          if (pointIndex >= 0 && pointIndex < initialPoints.length) {
            const point = initialPoints[pointIndex];

            // If cmd-click, don't handle it here - let the onClick handler on the Circle component handle it
            // The onClick handler has the correct pointIndex, while this handler would need to find it by distance
            // which could select the wrong point when multiple points are close together
            if (e.evt.ctrlKey || e.evt.metaKey) {
              // Just prevent event propagation and return - let onClick handle the selection
              e.evt.stopPropagation();
              return;
            }

            // Normal click - prevent event propagation to avoid region deselection
            e.evt.stopPropagation();

            // Store the potential drag target but don't start dragging yet
            // We'll start dragging only if the mouse moves beyond a threshold
            setDraggedPointIndex(pointIndex);
            lastPos.current = {
              x: e.evt.clientX,
              y: e.evt.clientY,
              originalX: point.x,
              originalY: point.y,
              originalControlPoint1: point.isBezier ? point.controlPoint1 : undefined,
              originalControlPoint2: point.isBezier ? point.controlPoint2 : undefined,
            };
            return;
          }
        }
      }

      // Check if clicking on a control point (by checking target name)
      if (targetName && targetName.startsWith("control-point-")) {
        const match = targetName.match(/^control-point-(\d+)-(\d+)$/);
        if (match) {
          const pointIndex = Number.parseInt(match[1], 10);
          const controlIndex = Number.parseInt(match[2], 10);
          if (pointIndex >= 0 && pointIndex < initialPoints.length) {
            const point = initialPoints[pointIndex];
            if (point.isBezier && controlIndex >= 1 && controlIndex <= 2) {
              const controlPoint = controlIndex === 1 ? point.controlPoint1 : point.controlPoint2;
              if (controlPoint) {
                setDraggedControlPoint({ pointIndex, controlIndex });
                isDragging.current = true;
                handleTransformStart();
                lastPos.current = {
                  x: e.evt.clientX,
                  y: e.evt.clientY,
                  originalX: controlPoint.x,
                  originalY: controlPoint.y,
                };
                return;
              }
            }
          }
        }
      }

      // Fallback: check by distance (in case names don't match)
      const scale = transform.zoom * fitScale;
      const hitRadius = HIT_RADIUS.SELECTION / scale;

      for (let i = 0; i < initialPoints.length; i++) {
        const point = initialPoints[i];
        const distance = Math.sqrt((imagePos.x - point.x) ** 2 + (imagePos.y - point.y) ** 2);

        if (distance <= hitRadius) {
          // If cmd-click, handle selection immediately and don't set up dragging
          if (e.evt.ctrlKey || e.evt.metaKey) {
            // Prevent event from propagating to avoid region deselection
            e.evt.stopPropagation();

            // Create a mock event object for the selection handlers
            const mockEvent = {
              ...e,
              target: e.target,
              evt: e.evt,
            } as Konva.KonvaEventObject<MouseEvent>;

            // Try deselection first
            if (
              handlePointDeselection(mockEvent, {
                instanceId,
                initialPoints,
                transform,
                fitScale,
                x,
                y,
                selectedPoints: effectiveSelectedPoints,
                setSelectedPoints,
                skeletonEnabled,
                setActivePointId,
                setLastAddedPointId,
                lastAddedPointId,
                activePointId,
              } as any)
            ) {
              return;
            }
            // If not deselection, try selection (adding to multi-selection)
            if (
              handlePointSelection(mockEvent, {
                instanceId,
                initialPoints,
                transform,
                fitScale,
                x,
                y,
                selectedPoints: effectiveSelectedPoints,
                setSelectedPoints,
                setSelectedPointIndex,
                skeletonEnabled,
                setActivePointId,
                setLastAddedPointId,
                lastAddedPointId,
                activePointId,
                allowClose,
                isPathClosed: finalIsPathClosed,
                selected,
                onFinish,
              } as any)
            ) {
              return;
            }
          } else {
            // Normal click - prevent event propagation to avoid region deselection
            e.evt.stopPropagation();

            // Store the potential drag target but don't start dragging yet
            // We'll start dragging only if the mouse moves beyond a threshold
            setDraggedPointIndex(i);
            lastPos.current = {
              x: e.evt.clientX,
              y: e.evt.clientY,
              originalX: point.x,
              originalY: point.y,
              originalControlPoint1: point.isBezier ? point.controlPoint1 : undefined,
              originalControlPoint2: point.isBezier ? point.controlPoint2 : undefined,
            };
          }
          return;
        }
      }

      // Check if clicking on a control point
      for (let i = 0; i < initialPoints.length; i++) {
        const point = initialPoints[i];
        if (point.isBezier) {
          if (point.controlPoint1) {
            const distance = Math.sqrt(
              (imagePos.x - point.controlPoint1.x) ** 2 + (imagePos.y - point.controlPoint1.y) ** 2,
            );
            if (distance <= hitRadius) {
              setDraggedControlPoint({ pointIndex: i, controlIndex: 1 });
              isDragging.current = true;
              handleTransformStart();
              lastPos.current = {
                x: e.evt.clientX,
                y: e.evt.clientY,
                originalX: point.controlPoint1.x,
                originalY: point.controlPoint1.y,
              };
              return;
            }
          }

          if (point.controlPoint2) {
            const distance = Math.sqrt(
              (imagePos.x - point.controlPoint2.x) ** 2 + (imagePos.y - point.controlPoint2.y) ** 2,
            );
            if (distance <= hitRadius) {
              setDraggedControlPoint({ pointIndex: i, controlIndex: 2 });
              isDragging.current = true;
              handleTransformStart();
              lastPos.current = {
                x: e.evt.clientX,
                y: e.evt.clientY,
                originalX: point.controlPoint2.x,
                originalY: point.controlPoint2.y,
              };
              return;
            }
          }
        }
      }
    };

    const handleStageMouseMove = (e: Konva.KonvaEventObject<MouseEvent>) => {
      // Get current values from ref to avoid stale closures
      const {
        initialPoints,
        allowClose,
        finalIsPathClosed,
        pixelSnapping,
        isDraggingNewBezier,
        ghostPointDragInfo,
        draggedPointIndex,
        draggedControlPoint,
        isDraggingShape,
        effectiveSelectedPoints,
        transform,
        fitScale,
        x,
        y,
        width,
        height,
        disabled,
      } = currentValuesRef.current;

      // Prevent all interactions when disabled (but allow cursor position updates for ghost line)
      // Only block dragging and point interactions
      if (disabled && (draggedPointIndex !== null || draggedControlPoint !== null || isDraggingShape)) {
        // Stop any ongoing drags when disabled
        setDraggedPointIndex(null);
        setDraggedControlPoint(null);
        setIsDraggingShape(false);
        return;
      }

      // Always update cursor position first (for ghost line to work everywhere)
      const pos = e.target.getStage()?.getPointerPosition();
      if (!pos) return;

      // Update Shift key state from the event to keep it in sync
      if (e.evt.shiftKey !== isShiftKeyHeld) {
        setIsShiftKeyHeld(e.evt.shiftKey);
      }

      const imagePos = stageToImageCoordinates(pos, transform, fitScale, x, y);

      // Always update cursor position (even outside bounds) so ghost line can work
      cursorPositionRef.current = imagePos;

      // Use RAF to batch redraw calls for performance
      if (ghostLineRafRef.current) {
        cancelAnimationFrame(ghostLineRafRef.current);
      }
      ghostLineRafRef.current = requestAnimationFrame(() => {
        stage.batchDraw();
      });

      // Recalculate ghost point using the helper function
      // Pass the event's shiftKey state and position for real-time updates
      if (calculateGhostPointRef.current) {
        calculateGhostPointRef.current(e.evt.shiftKey, pos);
      }

      // Handle shape dragging first (if active, allow dragging to continue even outside bounds)
      // Skip individual shape dragging if disabled or in multi-region mode (ImageTransformer handles it)
      if (isDraggingShape && shapeDragStartPos.current && !disabled && !isMultiRegionSelected) {
        // Calculate delta from start position
        const deltaX = imagePos.x - shapeDragStartPos.current.imageX;
        const deltaY = imagePos.y - shapeDragStartPos.current.imageY;

        // Track drag distance
        shapeDragDistance.current = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

        // Apply delta to all points
        // IMPORTANT: Do NOT apply pixel snapping during dragging - it causes points to collapse
        // Pixel snapping will be applied when dragging ends (in handleStageMouseUp)
        const newPoints = initialPoints.map((point, index) => {
          const original = originalPointsPositions.current[index];
          if (!original) return point;

          const newX = original.x + deltaX;
          const newY = original.y + deltaY;

          const updatedPoint = {
            ...point,
            x: newX,
            y: newY,
          };

          // Move control points with the anchor point
          if (point.isBezier) {
            if (original.controlPoint1) {
              const cp1X = original.controlPoint1.x + deltaX;
              const cp1Y = original.controlPoint1.y + deltaY;
              updatedPoint.controlPoint1 = { x: cp1X, y: cp1Y };
            }
            if (original.controlPoint2) {
              const cp2X = original.controlPoint2.x + deltaX;
              const cp2Y = original.controlPoint2.y + deltaY;
              updatedPoint.controlPoint2 = { x: cp2X, y: cp2Y };
            }
          }

          return updatedPoint;
        });

        // Apply bounds checking to preserve relative positions
        const constrainedPoints = constrainAnchorPointsToBounds(newPoints as BezierPoint[], { width, height });

        // Do NOT apply pixel snapping here - it will cause points to collapse
        // Pixel snapping will be applied once when dragging ends
        onPointsChange?.(constrainedPoints as BezierPoint[]);
        return; // Don't process other logic when dragging shape
      }

      // If we're dragging a point from this instance, allow dragging to continue
      // even if mouse moves outside our group (user might drag outside bounds)
      const isDraggingFromThisInstance = draggedPointIndex !== null || draggedControlPoint !== null;

      // Check if event target belongs to this instance's group
      // This prevents ghost point snapping from working for other regions
      // But we still update cursor position above so ghost line can work
      const target = e.target;
      let targetGroup: Konva.Node | null = target;
      while (targetGroup && targetGroup !== group && targetGroup.getParent()) {
        targetGroup = targetGroup.getParent();
      }
      const isTargetInGroup = targetGroup === group;
      // Also allow when hovering over empty space (stage or layer)
      const isStageOrLayer = target === stage || target.getParent() === stage;

      // Only process ghost point snapping and dragging if:
      // - Target is in our group, OR
      // - We're hovering over empty space (stage/layer), OR
      // - We're dragging from this instance
      if (!isDraggingFromThisInstance && !isTargetInGroup && !isStageOrLayer) {
        // Clear ghost point when hovering over other regions, but keep cursor position for ghost line
        setGhostPoint(null);
        return;
      }

      // Only process ghost point and other logic if within bounds
      if (imagePos.x >= 0 && imagePos.x <= width && imagePos.y >= 0 && imagePos.y <= height) {
        // Handle ghost point when Shift is held (check event directly for real-time updates)
        // Only show ghost point when region is selected and not disabled
        if (
          e.evt.shiftKey &&
          imagePos &&
          initialPoints.length >= 2 &&
          !isDragging.current &&
          !isDraggingNewBezier &&
          !ghostPointDragInfo?.isDragging &&
          selected &&
          !disabled
        ) {
          const scale = transform.zoom * fitScale;
          const hitRadius = HIT_RADIUS.SELECTION / scale;
          let isOverPoint = false;

          for (let i = 0; i < initialPoints.length; i++) {
            const point = initialPoints[i];
            const distance = Math.sqrt((imagePos.x - point.x) ** 2 + (imagePos.y - point.y) ** 2);

            if (distance <= hitRadius) {
              isOverPoint = true;
              break;
            }
          }

          if (isOverPoint) {
            setGhostPoint(null);
          } else {
            const closestPathPoint = findClosestPointOnPath(imagePos, initialPoints, allowClose, finalIsPathClosed);

            if (closestPathPoint) {
              const snappedGhostPoint = snapToPixel(closestPathPoint.point, pixelSnapping);

              if (closestPathPoint.segmentIndex === initialPoints.length) {
                const lastPoint = initialPoints[initialPoints.length - 1];
                const firstPoint = initialPoints[0];

                const ghostPointData = {
                  x: snappedGhostPoint.x,
                  y: snappedGhostPoint.y,
                  prevPointId: lastPoint.id,
                  nextPointId: firstPoint.id,
                };
                setGhostPoint(ghostPointData);
              } else {
                const currentPoint = initialPoints[closestPathPoint.segmentIndex];
                const prevPoint = currentPoint?.prevPointId
                  ? initialPoints.find((p) => p.id === currentPoint.prevPointId)
                  : null;

                if (currentPoint && prevPoint) {
                  const ghostPointData = {
                    x: snappedGhostPoint.x,
                    y: snappedGhostPoint.y,
                    prevPointId: prevPoint.id,
                    nextPointId: currentPoint.id,
                  };
                  setGhostPoint(ghostPointData);
                }
              }
            } else {
              setGhostPoint(null);
            }
          }
        } else if (!e.evt.shiftKey) {
          setGhostPoint(null);
        }

        // Handle point dragging
        if (draggedPointIndex !== null && lastPos.current && !disabled) {
          if (effectiveSelectedPoints.size > 1) {
            return; // Don't drag when transformer is active
          }

          // Check if we should start dragging
          const dragThreshold = 5;
          const mouseDeltaX = Math.abs(e.evt.clientX - lastPos.current.x);
          const mouseDeltaY = Math.abs(e.evt.clientY - lastPos.current.y);

          if (!isDragging.current && (mouseDeltaX > dragThreshold || mouseDeltaY > dragThreshold)) {
            isDragging.current = true;
            handleTransformStart();
          }

          if (!isDragging.current) {
            return;
          }

          const newPoints = [...initialPoints];
          const draggedPoint = newPoints[draggedPointIndex];

          const originalX = lastPos.current.originalX ?? draggedPoint.x;
          const originalY = lastPos.current.originalY ?? draggedPoint.y;

          const snappedPos = snapToPixel(imagePos, pixelSnapping);
          const finalPos = constrainAnchorPointsToBounds([snappedPos], { width, height })[0];

          newPoints[draggedPointIndex] = {
            ...draggedPoint,
            x: finalPos.x,
            y: finalPos.y,
          };

          // Handle bezier control points
          if (draggedPoint.isBezier) {
            const updatedPoint = newPoints[draggedPointIndex];

            if (updatedPoint.controlPoint1 && lastPos.current.originalControlPoint1) {
              const deltaX = finalPos.x - originalX;
              const deltaY = finalPos.y - originalY;
              const cp1Pos = {
                x: lastPos.current.originalControlPoint1.x + deltaX,
                y: lastPos.current.originalControlPoint1.y + deltaY,
              };
              updatedPoint.controlPoint1 = snapToPixel(cp1Pos, pixelSnapping);
            }

            if (updatedPoint.controlPoint2 && lastPos.current.originalControlPoint2) {
              const deltaX = finalPos.x - originalX;
              const deltaY = finalPos.y - originalY;
              const cp2Pos = {
                x: lastPos.current.originalControlPoint2.x + deltaX,
                y: lastPos.current.originalControlPoint2.y + deltaY,
              };
              updatedPoint.controlPoint2 = snapToPixel(cp2Pos, pixelSnapping);
            }

            const constrainedPoint = constrainAnchorPointsToBounds([updatedPoint], { width, height })[0];
            newPoints[draggedPointIndex] = constrainedPoint;
          }

          onPointsChange?.(newPoints);
          onPointRepositioned?.(newPoints[draggedPointIndex], draggedPointIndex);
        }

        // Handle control point dragging
        if (draggedControlPoint && lastPos.current && !disabled) {
          const newPoints = [...initialPoints];
          const point = newPoints[draggedControlPoint.pointIndex];

          if (point.isBezier) {
            const snappedPos = snapToPixel(imagePos, pixelSnapping);
            const finalPos = constrainPointToBounds(snappedPos, { width, height });

            if (draggedControlPoint.controlIndex === 1) {
              point.controlPoint1 = finalPos;
            } else if (draggedControlPoint.controlIndex === 2) {
              point.controlPoint2 = finalPos;
            }

            newPoints[draggedControlPoint.pointIndex] = point;
            onPointsChange?.(newPoints);
            onPointEdited?.(point, draggedControlPoint.pointIndex);
          }
        }
      } else {
        // When outside bounds, clear ghost point but keep cursor position for ghost line
        setGhostPoint(null);
      }
    };

    const handleStageMouseUp = (e: Konva.KonvaEventObject<MouseEvent>) => {
      // Get current values from ref to avoid stale closures
      const {
        isDraggingShape,
        draggedPointIndex,
        initialPoints,
        effectiveSelectedPoints,
        instanceId,
        skeletonEnabled,
        activePointId,
        disabled,
        onFinish,
        pixelSnapping,
        width,
        height,
      } = currentValuesRef.current;

      // Prevent all interactions when disabled
      if (disabled) {
        return;
      }

      // Handle shape dragging end
      if (isDraggingShape) {
        const dragThreshold = 5; // Only prevent clicks if we actually dragged
        const actuallyDragged = shapeDragDistance.current > dragThreshold;

        setIsDraggingShape(false);
        handleTransformEnd(e);

        // Apply pixel snapping when dragging ends (if enabled)
        // CRITICAL: Snap all points while preventing collapse by preserving relative positions
        if (pixelSnapping && currentPointsRef.current.length > 0) {
          // Get the current points (they were updated during dragging without snapping)
          // Use currentPointsRef to get the latest points immediately
          const currentPoints = currentPointsRef.current;

          // Snap the first point
          const firstPoint = currentPoints[0];
          const snappedFirstPos = snapToPixel({ x: firstPoint.x, y: firstPoint.y }, pixelSnapping);

          // For all points, snap individually but check for collisions
          const snappedPoints: BezierPoint[] = [];
          const snappedPositions = new Map<number, { x: number; y: number }>(); // Track snapped positions by index

          for (let i = 0; i < currentPoints.length; i++) {
            const point = currentPoints[i];

            if (i === 0) {
              // First point - use snapped position directly
              const snappedPoint: BezierPoint = {
                ...point,
                x: snappedFirstPos.x,
                y: snappedFirstPos.y,
              };

              // Snap control points if bezier
              if (point.isBezier) {
                if (point.controlPoint1) {
                  snappedPoint.controlPoint1 = snapToPixel(point.controlPoint1, pixelSnapping);
                }
                if (point.controlPoint2) {
                  snappedPoint.controlPoint2 = snapToPixel(point.controlPoint2, pixelSnapping);
                }
              }

              snappedPoints.push(snappedPoint);
              snappedPositions.set(i, { x: snappedFirstPos.x, y: snappedFirstPos.y });
            } else {
              // Subsequent points - snap individually first
              let snappedPos = snapToPixel({ x: point.x, y: point.y }, pixelSnapping);

              // Check if this snapped position would collide with any previously snapped point
              let wouldCollapse = false;
              for (let j = 0; j < i; j++) {
                const prevSnapped = snappedPositions.get(j);
                if (prevSnapped) {
                  const snappedDistance = Math.sqrt(
                    (snappedPos.x - prevSnapped.x) ** 2 + (snappedPos.y - prevSnapped.y) ** 2,
                  );
                  const originalDistance = Math.sqrt(
                    (point.x - currentPoints[j].x) ** 2 + (point.y - currentPoints[j].y) ** 2,
                  );

                  // If snapped positions would be the same but original positions were different,
                  // preserve relative offset to prevent collapse
                  if (snappedDistance < 0.1 && originalDistance > 0.1) {
                    wouldCollapse = true;
                    // Preserve relative offset from first point
                    const relativeX = point.x - firstPoint.x;
                    const relativeY = point.y - firstPoint.y;
                    snappedPos = {
                      x: snappedFirstPos.x + relativeX,
                      y: snappedFirstPos.y + relativeY,
                    };
                    break;
                  }
                }
              }

              const snappedPoint: BezierPoint = {
                ...point,
                x: snappedPos.x,
                y: snappedPos.y,
              };

              // Snap control points if bezier
              if (point.isBezier) {
                if (point.controlPoint1) {
                  snappedPoint.controlPoint1 = snapToPixel(point.controlPoint1, pixelSnapping);
                }
                if (point.controlPoint2) {
                  snappedPoint.controlPoint2 = snapToPixel(point.controlPoint2, pixelSnapping);
                }
              }

              snappedPoints.push(snappedPoint);
              snappedPositions.set(i, { x: snappedPos.x, y: snappedPos.y });
            }
          }

          const finalSnappedPoints = snappedPoints;

          // Apply bounds checking after snapping
          const constrainedSnappedPoints = constrainAnchorPointsToBounds(finalSnappedPoints as BezierPoint[], {
            width,
            height,
          });

          // Update points with snapped positions using updatePoints to ensure proper state management
          // Use ref to ensure we have the latest updatePoints function
          if (updatePointsRef.current) {
            updatePointsRef.current(constrainedSnappedPoints as BezierPoint[]);
          }
        }

        shapeDragStartPos.current = null;
        originalPointsPositions.current = [];

        // Only prevent click handler from adding a point if we actually dragged
        if (actuallyDragged) {
          justFinishedShapeDrag.current = true;
          // Prevent event propagation to avoid triggering click handlers
          e.evt.stopPropagation();
          e.evt.preventDefault();
          // Don't use setTimeout - let the click handlers clear the flag
        }

        shapeDragDistance.current = 0;
        return; // Don't process point selection when ending shape drag
      }

      // Handle point selection if we clicked but didn't drag
      if (draggedPointIndex !== null && !isDragging.current) {
        // Use handlePointSelectionFromIndex to properly handle selection through tracker
        handlePointSelectionFromIndex(
          draggedPointIndex,
          {
            instanceId,
            initialPoints,
            selectedPoints: effectiveSelectedPoints,
            setSelectedPoints,
            skeletonEnabled,
            setActivePointId,
            activePointId,
            onFinish,
          } as any,
          e,
        );
        onPointSelected?.(draggedPointIndex);
      }

      // Reset dragging state
      isDragging.current = false;
      handleTransformEnd(e);
      setDraggedPointIndex(null);
      setDraggedControlPoint(null);
    };

    const handleStageMouseEnter = (e: Konva.KonvaEventObject<MouseEvent>) => {
      // Capture cursor position when mouse enters stage so ghost line can render immediately
      const pos = e.target.getStage()?.getPointerPosition();
      if (pos) {
        const { transform, fitScale, x, y } = currentValuesRef.current;
        const imagePos = stageToImageCoordinates(pos, transform, fitScale, x, y);
        cursorPositionRef.current = imagePos;
        // Trigger a redraw to show ghost line
        if (ghostLineRafRef.current) {
          cancelAnimationFrame(ghostLineRafRef.current);
        }
        ghostLineRafRef.current = requestAnimationFrame(() => {
          stage.batchDraw();
        });
      }
    };

    const handleStageMouseLeave = () => {
      cursorPositionRef.current = null;
      setGhostPoint(null);
    };

    if (disableInternalPointAddition) {
      stage.on("mousedown", handleStageMouseDown);
      stage.on("mousemove", handleStageMouseMove);
      stage.on("mouseup", handleStageMouseUp);
      stage.on("mouseenter", handleStageMouseEnter);
      stage.on("mouseleave", handleStageMouseLeave);

      // Try to initialize cursor position if mouse is already over the stage
      // This ensures ghost line can render immediately even if mouseenter didn't fire
      const tryInitializeCursorPosition = () => {
        const pos = stage.getPointerPosition();
        if (pos) {
          const { transform, fitScale, x, y } = currentValuesRef.current;
          const imagePos = stageToImageCoordinates(pos, transform, fitScale, x, y);
          cursorPositionRef.current = imagePos;
          // Trigger a redraw to show ghost line
          if (ghostLineRafRef.current) {
            cancelAnimationFrame(ghostLineRafRef.current);
          }
          ghostLineRafRef.current = requestAnimationFrame(() => {
            stage.batchDraw();
          });
        }
      };

      // Try to initialize immediately
      tryInitializeCursorPosition();

      // Also try after a short delay in case the stage isn't ready yet
      const initTimeout = setTimeout(() => {
        tryInitializeCursorPosition();
      }, 0);

      return () => {
        clearTimeout(initTimeout);
        handlersAttachedRef.current = false;
        stage.off("mousedown", handleStageMouseDown);
        stage.off("mousemove", handleStageMouseMove);
        stage.off("mouseup", handleStageMouseUp);
        stage.off("mouseenter", handleStageMouseEnter);
        stage.off("mouseleave", handleStageMouseLeave);
      };
    }
    // Handle cursor position, ghost point, and shape dragging
    stage.on("mousemove", handleStageMouseMove);
    stage.on("mouseup", handleStageMouseUp);
    stage.on("mouseenter", handleStageMouseEnter);
    stage.on("mouseleave", handleStageMouseLeave);

    // Try to initialize cursor position if mouse is already over the stage
    // This ensures ghost line can render immediately even if mouseenter didn't fire
    const tryInitializeCursorPosition = () => {
      const pos = stage.getPointerPosition();
      if (pos) {
        const { transform, fitScale, x, y } = currentValuesRef.current;
        const imagePos = stageToImageCoordinates(pos, transform, fitScale, x, y);
        cursorPositionRef.current = imagePos;
        // Trigger a redraw to show ghost line
        if (ghostLineRafRef.current) {
          cancelAnimationFrame(ghostLineRafRef.current);
        }
        ghostLineRafRef.current = requestAnimationFrame(() => {
          stage.batchDraw();
        });
      }
    };

    // Try to initialize immediately
    tryInitializeCursorPosition();

    // Also try after a short delay in case the stage isn't ready yet
    const initTimeout = setTimeout(() => {
      tryInitializeCursorPosition();
    }, 0);

    return () => {
      clearTimeout(initTimeout);
      handlersAttachedRef.current = false;
      if (ghostLineRafRef.current) {
        cancelAnimationFrame(ghostLineRafRef.current);
      }
      stage.off("mousemove", handleStageMouseMove);
      stage.off("mouseup", handleStageMouseUp);
      stage.off("mouseenter", handleStageMouseEnter);
      stage.off("mouseleave", handleStageMouseLeave);
    };
  }, [disableInternalPointAddition, stageReadyRetry]); // Re-run when disableInternalPointAddition changes or when retrying

  // Handle Shift key for disconnected mode
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Shift") {
        setIsDisconnectedMode(true);
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === "Shift") {
        setIsDisconnectedMode(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, []);

  // Click handler with debouncing for single/double-click detection
  const handleClickWithDebouncing = useCallback(
    (e: any, onClickHandler?: (e: any) => void, onDblClickHandler?: (e: any) => void) => {
      // If disabled, fire onClick immediately
      if (disabled) {
        if (onClickHandler) {
          const newEvent = {
            ...e,
            evt: {
              ...e.evt,
              defaultPrevented: false,
              stopImmediatePropagation: e.evt.stopImmediatePropagation?.bind(e.evt) || (() => {}),
              stopPropagation: e.evt.stopPropagation?.bind(e.evt) || (() => {}),
              preventDefault: e.evt.preventDefault?.bind(e.evt) || (() => {}),
            },
          };
          onClickHandler(newEvent);
        }
        return;
      }

      // Clear any existing timeout (this detects a double-click)
      if (clickTimeoutRef.current) {
        clearTimeout(clickTimeoutRef.current);
        clickTimeoutRef.current = null;
        // This is a double-click, handle it
        doubleClickHandledRef.current = true;
        if (onDblClickHandler) {
          // Create a new event object to avoid defaultPrevented issues
          // Preserve all event methods by copying the original evt object and only resetting defaultPrevented
          const newEvent = {
            ...e,
            evt: {
              ...e.evt,
              defaultPrevented: false,
              // Preserve all methods from the original event
              stopImmediatePropagation: e.evt.stopImmediatePropagation?.bind(e.evt) || (() => {}),
              stopPropagation: e.evt.stopPropagation?.bind(e.evt) || (() => {}),
              preventDefault: e.evt.preventDefault?.bind(e.evt) || (() => {}),
            },
          };
          onDblClickHandler(newEvent);
        }
        // Reset the flag after a short delay
        setTimeout(() => {
          doubleClickHandledRef.current = false;
        }, 100);
        return;
      }

      // Set a timeout for single-click handling
      // This now works for both selected and unselected states to detect double-clicks
      // Reduced to 150ms for better responsiveness while still detecting double-clicks
      clickTimeoutRef.current = setTimeout(() => {
        clickTimeoutRef.current = null;
        if (onClickHandler) {
          // Create a new event object to avoid defaultPrevented issues
          // This ensures the onClick handler in VectorRegion.jsx can fire even if
          // the event was prevented elsewhere (e.g., by onFinish handler)
          // Preserve all event methods by copying the original evt object and only resetting defaultPrevented
          const newEvent = {
            ...e,
            evt: {
              ...e.evt,
              defaultPrevented: false,
              // Preserve all methods from the original event
              stopImmediatePropagation: e.evt.stopImmediatePropagation?.bind(e.evt) || (() => {}),
              stopPropagation: e.evt.stopPropagation?.bind(e.evt) || (() => {}),
              preventDefault: e.evt.preventDefault?.bind(e.evt) || (() => {}),
            },
          };
          onClickHandler(newEvent);
        }
      }, 150);
    },
    [selected, disabled],
  );

  // Create event handlers
  const eventHandlers = createEventHandlers({
    instanceId,
    initialPoints,
    width,
    height,
    pixelSnapping,
    selectedPoints: effectiveSelectedPoints,
    selectedPointIndex,
    setSelectedPointIndex,
    setSelectedPoints,
    setDraggedPointIndex,
    setDraggedControlPoint,
    setIsDisconnectedMode,
    setGhostPoint,
    setNewPointDragIndex,
    setIsDraggingNewBezier,
    setGhostPointDragInfo,
    setVisibleControlPoints,
    setIsPathClosed,
    isDragging,
    lastPos,
    lastCallbackTime,
    isDrawingMode: !drawingDisabled, // Use dynamic drawing detection
    allowClose,
    allowBezier,
    isPathClosed: finalIsPathClosed,
    transform,
    fitScale,
    x,
    y,
    ghostPoint,
    ghostPointDragInfo,
    draggedPointIndex,
    draggedControlPoint,
    isDraggingNewBezier,
    newPointDragIndex: _newPointDragIndex,
    visibleControlPoints,
    isDisconnectedMode,
    onPointsChange,
    onPointAdded,
    onPointRemoved,
    onPointEdited,
    onPointRepositioned,
    onPointConverted,
    onPathShapeChanged,
    onPointSelected,
    onFinish,
    onGhostPointClick,
    onMouseDown,
    onMouseMove,
    onMouseUp,
    onClick,
    notifyTransformationComplete,
    canAddMorePoints,
    maxPoints,
    minPoints, // Add minPoints to event handlers
    skeletonEnabled,
    getAllPoints,
    getPointInfo,
    updatePointByGlobalIndex,
    lastAddedPointId,
    setLastAddedPointId,
    activePointId,
    setActivePointId,
    isTransforming,
    selected,
    disabled,
    transformMode,
    disableInternalPointAddition,
    handleTransformStart,
    handleTransformEnd,
    pointCreationManager,
  });

  return (
    <Group
      ref={stageRef}
      scaleX={scaleX}
      scaleY={scaleY}
      x={x}
      y={y}
      imageSmoothingEnabled={imageSmoothingEnabled}
      onMouseDown={selected && !disabled ? eventHandlers.handleLayerMouseDown : undefined}
      onMouseMove={selected && !disabled ? eventHandlers.handleLayerMouseMove : undefined}
      onMouseUp={selected && !disabled ? eventHandlers.handleLayerMouseUp : undefined}
      onClick={
        !selected || transformMode
          ? undefined
          : (e) => {
              // Prevent editing when disabled, but allow selection clicks
              // Prevent all clicks when in transform mode (already checked above, but double-check)
              if (transformMode) {
                e.evt.stopPropagation();
                e.evt.preventDefault();
                e.evt.stopImmediatePropagation();
                e.cancelBubble = true;
                return;
              }

              // When disabled, only allow selection clicks - skip all editing logic
              if (disabled) {
                // Call handleClickWithDebouncing to trigger selection via onClick handler
                // This allows the shape to be selected even when disabled
                handleClickWithDebouncing(e, onClick, onDblClick);
                return;
              }

              // Don't add points if we just finished shape dragging
              if (justFinishedShapeDrag.current) {
                e.evt.stopPropagation();
                e.evt.preventDefault();
                e.cancelBubble = true; // Also set cancelBubble for Konva
                justFinishedShapeDrag.current = false; // Clear flag immediately
                return;
              }

              // Skip if point selection was already handled by VectorPoints onClick
              if (pointSelectionHandled.current) {
                pointSelectionHandled.current = false;
                // Don't prevent propagation - let the event bubble to VectorShape onClick
                return;
              }

              // For the first point in drawing mode, we need to ensure the click handler works
              // The issue is that the flag logic is interfering with first point creation
              // Let's try calling the drawing mode click handler directly for the first point
              // Skip if internal point addition is disabled
              if (initialPoints.length === 0 && !drawingDisabled && !disableInternalPointAddition) {
                // For the first point, call the drawing mode click handler directly
                const pos = e.target.getStage()?.getPointerPosition();
                if (pos) {
                  // Use the same coordinate transformation as the event handlers
                  const imagePos = {
                    x: (pos.x - x - transform.offsetX) / (scaleX * transform.zoom * fitScale),
                    y: (pos.y - y - transform.offsetY) / (scaleY * transform.zoom * fitScale),
                  };

                  // Check if we're within canvas bounds
                  if (imagePos.x >= 0 && imagePos.x <= width && imagePos.y >= 0 && imagePos.y <= height) {
                    // Create the first point directly
                    const newPoint = {
                      id: `point-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                      x: imagePos.x,
                      y: imagePos.y,
                      isBezier: false,
                    };

                    const newPoints = [...initialPoints, newPoint];
                    onPointsChange?.(newPoints);
                    onPointAdded?.(newPoint, newPoints.length - 1);

                    // Set as the last added point
                    setLastAddedPointId(newPoint.id);
                    setActivePointId(newPoint.id);

                    return;
                  }
                }
              }

              // For subsequent points, use the normal event handler
              // But don't prevent propagation - let the event bubble to VectorShape onClick
              // so that shape selection/unselection can work when clicking on segments
              eventHandlers.handleLayerClick(e);
              // Don't call preventDefault or stopPropagation here - let the event bubble
            }
      }
      onDblClick={
        disabled
          ? undefined
          : (e) => {
              // If we've already handled this double-click through debouncing, ignore it
              if (doubleClickHandledRef.current) {
                return;
              }
              // Otherwise, call the original onDblClick handler
              // This will work even when unselected - the handler in VectorRegion.jsx
              // will ensure the region is selected before entering transform mode
              onDblClick?.(e);
            }
      }
    >
      {/* Invisible rectangle - render to capture mouse events for cursor position updates */}
      {/* Disabled when disableInternalPointAddition is true, component is not selected, or disabled */}
      {selected && !disabled && !disableInternalPointAddition && (
        <Shape
          sceneFunc={(ctx, shape) => {
            ctx.beginPath();
            ctx.rect(0, 0, width, height);
            ctx.fillShape(shape);
          }}
          fill={INVISIBLE_SHAPE_OPACITY}
        />
      )}

      {/* Conditionally wrap content with _transformable group for ImageTransformer */}
      {isMultiRegionSelected ? (
        <Group
          name="_transformable"
          ref={transformableGroupRef}
          draggable={!disabled}
          onTransformEnd={(e) => {
            // Prevent transform when disabled
            if (disabled) return;
            // This is called when ImageTransformer finishes transforming the Group
            // Commit the transform immediately to prevent position reset
            if (e.target === e.currentTarget && transformableGroupRef.current && initialTransformRef.current) {
              commitMultiRegionTransform();
              handleTransformEnd(e);
            }
          }}
        >
          {/* Unified vector shape - renders all lines based on id-prevPointId relationships */}
          <VectorShape
            segments={getAllLineSegments()}
            allowClose={allowClose}
            isPathClosed={finalIsPathClosed}
            stroke={stroke}
            fill={fill}
            strokeWidth={props.strokeWidth}
            opacity={props.opacity}
            transform={transform}
            fitScale={fitScale}
            onClick={(e) => {
              // Prevent editing clicks when disabled, but allow selection clicks
              // Prevent all clicks when in transform mode
              if (transformMode) {
                e.evt.stopPropagation();
                e.evt.preventDefault();
                e.evt.stopImmediatePropagation();
                e.cancelBubble = true;
                return;
              }

              // When disabled, only allow selection clicks - skip all editing logic
              if (disabled) {
                // Allow the click to bubble for selection - don't prevent propagation
                // Use debouncing for click/double-click detection for selection
                if (!justFinishedShapeDrag.current && !e.evt.shiftKey) {
                  handleClickWithDebouncing(e, onClick, onDblClick);
                }
                return;
              }

              // CRITICAL: Handle Alt+click FIRST (for point deletion and segment breaking)
              // This must happen before any other click handling to ensure deletion works
              if (e.evt.altKey && !e.evt.shiftKey && selected) {
                // Let the event bubble to the Group onClick handler which has the Alt+click logic
                // Don't stop propagation or prevent default - let it reach createClickHandler
                return;
              }

              // Don't add points if we just finished shape dragging
              if (justFinishedShapeDrag.current) {
                e.evt.stopPropagation();
                e.evt.preventDefault();
                e.cancelBubble = true; // Also set cancelBubble for Konva
                justFinishedShapeDrag.current = false; // Clear flag immediately
                return;
              }

              // Check if click is on the last added point by checking cursor position
              if (cursorPositionRef.current && lastAddedPointId) {
                const lastAddedPoint = initialPoints.find((p) => p.id === lastAddedPointId);
                if (lastAddedPoint) {
                  const scale = transform.zoom * fitScale;
                  const hitRadius = HIT_RADIUS.SELECTION / scale; // Use constant for consistent hit detection
                  const distance = Math.sqrt(
                    (cursorPositionRef.current.x - lastAddedPoint.x) ** 2 +
                      (cursorPositionRef.current.y - lastAddedPoint.y) ** 2,
                  );

                  if (distance <= hitRadius) {
                    // Find the index of the last added point
                    const lastAddedPointIndex = initialPoints.findIndex((p) => p.id === lastAddedPointId);

                    // Only trigger onFinish if the last added point is already selected (second click)
                    // and no modifiers are pressed (ctrl, meta, shift, alt) and component is selected
                    // and not in transform mode
                    if (
                      lastAddedPointIndex !== -1 &&
                      effectiveSelectedPoints.has(lastAddedPointIndex) &&
                      selected &&
                      !transformMode
                    ) {
                      const hasModifiers = e.evt.ctrlKey || e.evt.metaKey || e.evt.shiftKey || e.evt.altKey;
                      if (!hasModifiers) {
                        e.evt.preventDefault();
                        onFinish?.(e);
                        return;
                      }
                      // If modifiers are held, skip onFinish entirely and let normal modifier handling take over
                      return;
                    }
                  }
                }
              }

              // Use debouncing for click/double-click detection
              // This will call the onClick handler from VectorRegion.jsx which handles shape selection/unselection
              // Only call if we didn't just finish dragging (to allow shape dragging to work)
              // Don't call if Shift is held (to allow shift-click for ghost point insertion without unselecting)
              if (!justFinishedShapeDrag.current && !e.evt.shiftKey) {
                // Stop propagation to prevent the Group onClick handler from also processing the click
                // This prevents the shape from being selected and then immediately unselected
                e.evt.stopPropagation();
                e.evt.preventDefault();
                e.cancelBubble = true;
                handleClickWithDebouncing(e, onClick, onDblClick);
              }
            }}
            onMouseDown={(e) => {
              // Don't start shape drag if disabled
              if (disabled) {
                return;
              }
              // Don't start shape drag if in multi-region selection mode
              // ImageTransformer will handle dragging in this case
              if (isMultiRegionSelected) {
                return;
              }

              // Don't start shape drag if we're already dragging a point or control point
              if (draggedPointIndex !== null || draggedControlPoint !== null) {
                return;
              }

              // Don't start shape drag if transformer is active
              if (effectiveSelectedPoints.size > 1) {
                return;
              }

              // Don't start shape drag if clicking on a point
              const pos = e.target.getStage()?.getPointerPosition();
              if (!pos) return;

              const imagePos = stageToImageCoordinates(pos, transform, fitScale, x, y);
              const scale = transform.zoom * fitScale;
              const hitRadius = HIT_RADIUS.SELECTION / scale;

              // Check if clicking on any point
              for (let i = 0; i < initialPoints.length; i++) {
                const point = initialPoints[i];
                const distance = Math.sqrt((imagePos.x - point.x) ** 2 + (imagePos.y - point.y) ** 2);
                if (distance <= hitRadius) {
                  return; // Let point dragging handle it
                }
              }

              // Check if clicking on any control point
              for (let i = 0; i < initialPoints.length; i++) {
                const point = initialPoints[i];
                if (point.isBezier) {
                  if (point.controlPoint1) {
                    const distance = Math.sqrt(
                      (imagePos.x - point.controlPoint1.x) ** 2 + (imagePos.y - point.controlPoint1.y) ** 2,
                    );
                    if (distance <= hitRadius) {
                      return; // Let control point dragging handle it
                    }
                  }
                  if (point.controlPoint2) {
                    const distance = Math.sqrt(
                      (imagePos.x - point.controlPoint2.x) ** 2 + (imagePos.y - point.controlPoint2.y) ** 2,
                    );
                    if (distance <= hitRadius) {
                      return; // Let control point dragging handle it
                    }
                  }
                }
              }

              // Start shape dragging (don't stop propagation yet - we'll do it on mouseup if we actually drag)
              setIsDraggingShape(true);
              handleTransformStart();
              shapeDragDistance.current = 0; // Reset drag distance
              shapeDragStartPos.current = {
                x: e.evt.clientX,
                y: e.evt.clientY,
                imageX: imagePos.x,
                imageY: imagePos.y,
              };

              // Store original positions of all points
              originalPointsPositions.current = initialPoints.map((point) => ({
                x: point.x,
                y: point.y,
                controlPoint1: point.controlPoint1 ? { x: point.controlPoint1.x, y: point.controlPoint1.y } : undefined,
                controlPoint2: point.controlPoint2 ? { x: point.controlPoint2.x, y: point.controlPoint2.y } : undefined,
              }));
            }}
            onMouseEnter={onMouseEnter}
            onMouseLeave={onMouseLeave}
            key={`vector-shape-${initialPoints.length}-${initialPoints.map((p) => p.id).join("-")}`}
          />

          {/* Ghost line - preview from last point to cursor */}
          {selected && !disabled && !disableGhostLine && (
            <GhostLine
              initialPoints={initialPoints}
              cursorPositionRef={cursorPositionRef}
              draggedControlPoint={draggedControlPoint}
              draggedPointIndex={draggedPointIndex}
              isDraggingNewBezier={isDraggingNewBezier}
              isPathClosed={finalIsPathClosed}
              allowClose={allowClose}
              transform={transform}
              fitScale={fitScale}
              maxPoints={maxPoints}
              minPoints={minPoints}
              skeletonEnabled={skeletonEnabled}
              selectedPointIndex={selectedPointIndex}
              lastAddedPointId={lastAddedPointId}
              activePointId={activePointId}
              stroke={stroke}
              pixelSnapping={pixelSnapping}
              drawingDisabled={drawingDisabled}
              isShiftKeyHeld={isShiftKeyHeld}
              transformMode={transformMode}
              effectiveSelectedPointsSize={effectiveSelectedPoints.size}
            />
          )}

          {/* Control points - render first so lines appear under main points */}
          {selected && !disabled && (
            <ControlPoints
              initialPoints={getAllPoints()}
              selectedPointIndex={selectedPointIndex}
              isDraggingNewBezier={isDraggingNewBezier}
              draggedControlPoint={draggedControlPoint}
              visibleControlPoints={visibleControlPoints}
              transform={transform}
              fitScale={fitScale}
              key={`control-points-${initialPoints.length}-${initialPoints.map((p, i) => `${i}-${p.x.toFixed(1)}-${p.y.toFixed(1)}-${p.controlPoint1?.x?.toFixed(1) || "null"}-${p.controlPoint1?.y?.toFixed(1) || "null"}-${p.controlPoint2?.x?.toFixed(1) || "null"}-${p.controlPoint2?.y?.toFixed(1) || "null"}`).join("-")}`}
            />
          )}

          {/* All vector points */}
          <VectorPoints
            initialPoints={getAllPoints()}
            selectedPointIndex={selectedPointIndex}
            selectedPoints={effectiveSelectedPoints}
            transform={transform}
            fitScale={fitScale}
            pointRefs={pointRefs}
            selected={selected}
            disabled={disabled}
            transformMode={transformMode}
            pointRadius={pointRadius}
            pointFill={pointFill}
            pointStroke={pointStroke}
            pointStrokeSelected={pointStrokeSelected}
            pointStrokeWidth={pointStrokeWidth}
            activePointId={activePointId}
            maxPoints={maxPoints}
            onPointClick={(e, pointIndex) => {
              // Prevent all clicks when disabled or in transform mode
              if (disabled || transformMode) {
                e.evt.stopPropagation();
                e.evt.preventDefault();
                e.evt.stopImmediatePropagation();
                e.cancelBubble = true;
                return;
              }

              // CRITICAL: For single-point regions, directly call onClick handler so the region can be selected
              // Single-point regions have no segments to click on, so clicking the point must trigger region selection
              // Check this FIRST before any other logic
              // BUT: Don't do this in transform mode - clicks must be completely disabled
              const isSinglePointRegion = initialPoints.length === 1;
              if (
                isSinglePointRegion &&
                !e.evt.altKey &&
                !e.evt.shiftKey &&
                !e.evt.ctrlKey &&
                !e.evt.metaKey &&
                !transformMode
              ) {
                // Select the point first
                tracker.selectPoints(instanceId, new Set([pointIndex]));
                // Directly call handleClickWithDebouncing to trigger region selection
                // This works even when selected=false (Group onClick is undefined)
                pointSelectionHandled.current = true;
                handleClickWithDebouncing(e, onClick, onDblClick);
                return;
              }

              // Handle point selection even when not selected (similar to shape clicks)
              // But never allow selection when disabled
              if (disabled) {
                return;
              }
              if (!selected) {
                // Check if this instance can have selection
                if (!tracker.canInstanceHaveSelection(instanceId)) {
                  return; // Block the selection
                }

                // Check if we're about to close the path - prevent point selection in this case
                if (
                  shouldClosePathOnPointClick(
                    pointIndex,
                    {
                      initialPoints,
                      allowClose,
                      isPathClosed: finalIsPathClosed,
                      skeletonEnabled,
                      activePointId,
                    } as any,
                    e,
                  ) &&
                  isActivePointEligibleForClosing({
                    initialPoints,
                    skeletonEnabled,
                    activePointId,
                  } as any)
                ) {
                  // Use the bidirectional closePath function
                  const success = (ref as React.MutableRefObject<KonvaVectorRef | null>)?.current?.close();
                  if (success) {
                    return; // Path was closed, don't select the point
                  }
                }

                // Handle cmd-click to select all points (only when not in transform mode)
                if (!transformMode && (e.evt.ctrlKey || e.evt.metaKey) && !e.evt.altKey && !e.evt.shiftKey) {
                  // Select all points in the path
                  const allPointIndices = Array.from({ length: initialPoints.length }, (_, i) => i);
                  tracker.selectPoints(instanceId, new Set(allPointIndices));
                  pointSelectionHandled.current = true; // Mark that we handled selection
                  e.evt.stopImmediatePropagation(); // Prevent all other handlers from running
                  return;
                }

                // Check if this is the last added point and already selected (second click)
                // Only check if the shape is selected - non-selected shapes should not trigger onFinish
                if (selected) {
                  const isLastAddedPoint = lastAddedPointId && initialPoints[pointIndex]?.id === lastAddedPointId;
                  const isAlreadySelected = effectiveSelectedPoints.has(pointIndex);

                  // Only fire onFinish if this is the last added point AND it was already selected (second click)
                  // and no modifiers are pressed (ctrl, meta, shift, alt) and we're in drawing mode
                  // and not in transform mode
                  if (isLastAddedPoint && isAlreadySelected && !drawingDisabled && !transformMode) {
                    const hasModifiers = e.evt.ctrlKey || e.evt.metaKey || e.evt.shiftKey || e.evt.altKey;
                    if (!hasModifiers) {
                      onFinish?.(e);
                      pointSelectionHandled.current = true; // Mark that we handled selection
                      e.evt.stopImmediatePropagation(); // Prevent all other handlers from running
                      return;
                    }
                    // If modifiers are held, skip onFinish entirely and let normal modifier handling take over
                    return;
                  }
                }

                // Handle regular point selection (only when not in transform mode)
                if (!transformMode) {
                  if (e.evt.ctrlKey || e.evt.metaKey) {
                    // Add to multi-selection
                    const newSelection = new Set(selectedPoints);
                    newSelection.add(pointIndex);
                    tracker.selectPoints(instanceId, newSelection);
                  } else {
                    // Select only this point
                    tracker.selectPoints(instanceId, new Set([pointIndex]));
                  }
                }

                // Don't call onClick here - clicking on points should NOT select/unselect the shape
                // Only clicking on segments should select/unselect the shape
                // EXCEPTION: Single-point regions (handled above)

                // Mark that we handled selection and prevent all other handlers from running
                // This prevents the VectorShape onClick handler from firing, which would call onFinish
                pointSelectionHandled.current = true;
                e.evt.stopImmediatePropagation();
                e.evt.stopPropagation();
                e.evt.preventDefault();
                e.cancelBubble = true;
                return;
              }

              // When selected, let the normal event handlers handle it
              // The point click will be detected by the layer-level handlers
              //
            }}
          />

          {/* Proxy nodes for Transformer (positioned at exact point centers) - only show when not in drawing mode */}
          {drawingDisabled && (
            <ProxyNodes selectedPoints={effectiveSelectedPoints} initialPoints={getAllPoints()} proxyRefs={proxyRefs} />
          )}

          {/* Transformer for multiselection - only show when not in drawing mode and not multi-region selected */}
          {drawingDisabled && !isMultiRegionSelected && (
            <VectorTransformer
              selectedPoints={selectedPoints}
              initialPoints={getAllPoints()}
              transformerRef={transformerRef}
              proxyRefs={proxyRefs}
              bounds={{
                x: 0,
                y: 0,
                width: width,
                height: height,
              }}
              scaleX={scaleX}
              scaleY={scaleY}
              transform={transform}
              fitScale={fitScale}
              getCurrentPointsRef={getCurrentPointsRef}
              updateCurrentPointsRef={updateCurrentPointsRef}
              pixelSnapping={pixelSnapping}
              onPointsChange={(newPoints) => {
                // Update main path points
                onPointsChange?.(newPoints);
              }}
              onTransformStateChange={(state) => {
                transformerStateRef.current = state;
              }}
              onTransformationStart={() => {
                setIsTransforming(true);
                handleTransformStart();
              }}
              onTransformationEnd={() => {
                setIsTransforming(false);
                handleTransformEnd();
              }}
            />
          )}
        </Group>
      ) : (
        <>
          {/* Unified vector shape - renders all lines based on id-prevPointId relationships */}
          <VectorShape
            segments={getAllLineSegments()}
            allowClose={allowClose}
            isPathClosed={finalIsPathClosed}
            stroke={stroke}
            fill={fill}
            strokeWidth={props.strokeWidth}
            opacity={props.opacity}
            transform={transform}
            fitScale={fitScale}
            onClick={(e) => {
              // Prevent editing clicks when disabled, but allow selection clicks
              // Prevent all clicks when in transform mode
              if (transformMode) {
                e.evt.stopPropagation();
                e.evt.preventDefault();
                e.evt.stopImmediatePropagation();
                e.cancelBubble = true;
                return;
              }

              // When disabled, only allow selection clicks - skip all editing logic
              if (disabled) {
                // Allow the click to bubble for selection - don't prevent propagation
                // Use debouncing for click/double-click detection for selection
                if (!justFinishedShapeDrag.current && !e.evt.shiftKey) {
                  handleClickWithDebouncing(e, onClick, onDblClick);
                }
                return;
              }

              // CRITICAL: Handle Alt+click FIRST (for point deletion and segment breaking)
              // This must happen before any other click handling to ensure deletion works
              if (e.evt.altKey && !e.evt.shiftKey && selected) {
                // Let the event bubble to the Group onClick handler which has the Alt+click logic
                // Don't stop propagation or prevent default - let it reach createClickHandler
                return;
              }

              // Don't add points if we just finished shape dragging
              if (justFinishedShapeDrag.current) {
                e.evt.stopPropagation();
                e.evt.preventDefault();
                e.cancelBubble = true; // Also set cancelBubble for Konva
                justFinishedShapeDrag.current = false; // Clear flag immediately
                return;
              }

              // Check if click is on the last added point by checking cursor position
              if (cursorPositionRef.current && lastAddedPointId) {
                const lastAddedPoint = initialPoints.find((p) => p.id === lastAddedPointId);
                if (lastAddedPoint) {
                  const scale = transform.zoom * fitScale;
                  const hitRadius = HIT_RADIUS.SELECTION / scale; // Use constant for consistent hit detection
                  const distance = Math.sqrt(
                    (cursorPositionRef.current.x - lastAddedPoint.x) ** 2 +
                      (cursorPositionRef.current.y - lastAddedPoint.y) ** 2,
                  );

                  if (distance <= hitRadius) {
                    // Find the index of the last added point
                    const lastAddedPointIndex = initialPoints.findIndex((p) => p.id === lastAddedPointId);

                    // Only trigger onFinish if the last added point is already selected (second click)
                    // and no modifiers are pressed (ctrl, meta, shift, alt) and component is selected
                    // and not in transform mode
                    if (
                      lastAddedPointIndex !== -1 &&
                      effectiveSelectedPoints.has(lastAddedPointIndex) &&
                      selected &&
                      !transformMode
                    ) {
                      const hasModifiers = e.evt.ctrlKey || e.evt.metaKey || e.evt.shiftKey || e.evt.altKey;
                      if (!hasModifiers) {
                        e.evt.preventDefault();
                        onFinish?.(e);
                        return;
                      }
                      // If modifiers are held, skip onFinish entirely and let normal modifier handling take over
                      return;
                    }
                  }
                }
              }

              // Use debouncing for click/double-click detection
              // This will call the onClick handler from VectorRegion.jsx which handles shape selection/unselection
              // Only call if we didn't just finish dragging (to allow shape dragging to work)
              // Don't call if Shift is held (to allow shift-click for ghost point insertion without unselecting)
              if (!justFinishedShapeDrag.current && !e.evt.shiftKey) {
                // Stop propagation to prevent the Group onClick handler from also processing the click
                // This prevents the shape from being selected and then immediately unselected
                e.evt.stopPropagation();
                e.evt.preventDefault();
                e.cancelBubble = true;
                handleClickWithDebouncing(e, onClick, onDblClick);
              }
            }}
            onMouseDown={(e) => {
              // Don't start shape drag if disabled
              if (disabled) {
                return;
              }
              // Don't start shape drag if in multi-region selection mode
              // ImageTransformer will handle dragging in this case
              if (isMultiRegionSelected) {
                return;
              }

              // Don't start shape drag if we're already dragging a point or control point
              if (draggedPointIndex !== null || draggedControlPoint !== null) {
                return;
              }

              // Don't start shape drag if transformer is active
              if (effectiveSelectedPoints.size > 1) {
                return;
              }

              // Don't start shape drag if clicking on a point
              const pos = e.target.getStage()?.getPointerPosition();
              if (!pos) return;

              const imagePos = stageToImageCoordinates(pos, transform, fitScale, x, y);
              const scale = transform.zoom * fitScale;
              const hitRadius = HIT_RADIUS.SELECTION / scale;

              // Check if clicking on any point
              for (let i = 0; i < initialPoints.length; i++) {
                const point = initialPoints[i];
                const distance = Math.sqrt((imagePos.x - point.x) ** 2 + (imagePos.y - point.y) ** 2);
                if (distance <= hitRadius) {
                  return; // Let point dragging handle it
                }
              }

              // Check if clicking on any control point
              for (let i = 0; i < initialPoints.length; i++) {
                const point = initialPoints[i];
                if (point.isBezier) {
                  if (point.controlPoint1) {
                    const distance = Math.sqrt(
                      (imagePos.x - point.controlPoint1.x) ** 2 + (imagePos.y - point.controlPoint1.y) ** 2,
                    );
                    if (distance <= hitRadius) {
                      return; // Let control point dragging handle it
                    }
                  }
                  if (point.controlPoint2) {
                    const distance = Math.sqrt(
                      (imagePos.x - point.controlPoint2.x) ** 2 + (imagePos.y - point.controlPoint2.y) ** 2,
                    );
                    if (distance <= hitRadius) {
                      return; // Let control point dragging handle it
                    }
                  }
                }
              }

              // Start shape dragging (don't stop propagation yet - we'll do it on mouseup if we actually drag)
              setIsDraggingShape(true);
              handleTransformStart();
              shapeDragDistance.current = 0; // Reset drag distance
              shapeDragStartPos.current = {
                x: e.evt.clientX,
                y: e.evt.clientY,
                imageX: imagePos.x,
                imageY: imagePos.y,
              };

              // Store original positions of all points
              originalPointsPositions.current = initialPoints.map((point) => ({
                x: point.x,
                y: point.y,
                controlPoint1: point.controlPoint1 ? { x: point.controlPoint1.x, y: point.controlPoint1.y } : undefined,
                controlPoint2: point.controlPoint2 ? { x: point.controlPoint2.x, y: point.controlPoint2.y } : undefined,
              }));
            }}
            onMouseEnter={onMouseEnter}
            onMouseLeave={onMouseLeave}
            key={`vector-shape-${initialPoints.length}-${initialPoints.map((p) => p.id).join("-")}`}
          />

          {/* Ghost line - preview from last point to cursor */}
          {selected && !disabled && !disableGhostLine && (
            <GhostLine
              initialPoints={initialPoints}
              cursorPositionRef={cursorPositionRef}
              draggedControlPoint={draggedControlPoint}
              draggedPointIndex={draggedPointIndex}
              isDraggingNewBezier={isDraggingNewBezier}
              isPathClosed={finalIsPathClosed}
              allowClose={allowClose}
              transform={transform}
              fitScale={fitScale}
              maxPoints={maxPoints}
              minPoints={minPoints}
              skeletonEnabled={skeletonEnabled}
              selectedPointIndex={selectedPointIndex}
              lastAddedPointId={lastAddedPointId}
              activePointId={activePointId}
              stroke={stroke}
              pixelSnapping={pixelSnapping}
              drawingDisabled={drawingDisabled}
              isShiftKeyHeld={isShiftKeyHeld}
              transformMode={transformMode}
              effectiveSelectedPointsSize={effectiveSelectedPoints.size}
            />
          )}

          {/* Control points - render first so lines appear under main points */}
          {selected && !disabled && (
            <ControlPoints
              initialPoints={getAllPoints()}
              selectedPointIndex={selectedPointIndex}
              isDraggingNewBezier={isDraggingNewBezier}
              draggedControlPoint={draggedControlPoint}
              visibleControlPoints={visibleControlPoints}
              transform={transform}
              fitScale={fitScale}
              key={`control-points-${initialPoints.length}-${initialPoints.map((p, i) => `${i}-${p.x.toFixed(1)}-${p.y.toFixed(1)}-${p.controlPoint1?.x?.toFixed(1) || "null"}-${p.controlPoint1?.y?.toFixed(1) || "null"}-${p.controlPoint2?.x?.toFixed(1) || "null"}-${p.controlPoint2?.y?.toFixed(1) || "null"}`).join("-")}`}
            />
          )}

          {/* All vector points */}
          <VectorPoints
            initialPoints={getAllPoints()}
            selectedPointIndex={selectedPointIndex}
            selectedPoints={effectiveSelectedPoints}
            transform={transform}
            fitScale={fitScale}
            pointRefs={pointRefs}
            selected={selected}
            disabled={disabled}
            transformMode={transformMode}
            pointRadius={pointRadius}
            pointFill={pointFill}
            pointStroke={pointStroke}
            pointStrokeSelected={pointStrokeSelected}
            pointStrokeWidth={pointStrokeWidth}
            activePointId={activePointId}
            maxPoints={maxPoints}
            onPointClick={(e, pointIndex) => {
              // Handle Alt+click point deletion FIRST (before other checks)
              if (e.evt.altKey && !e.evt.shiftKey && selected) {
                deletePoint(
                  pointIndex,
                  initialPoints,
                  selectedPointIndex,
                  setSelectedPointIndex,
                  setVisibleControlPoints,
                  onPointSelected,
                  onPointRemoved,
                  onPointsChange,
                  setLastAddedPointId,
                  lastAddedPointId,
                );
                pointSelectionHandled.current = true;
                // Stop event propagation to prevent point addition
                e.evt.stopPropagation();
                e.evt.preventDefault();
                e.cancelBubble = true;
                return; // Successfully deleted point
              }

              // Handle Shift+click point conversion (before other checks)
              if (e.evt.shiftKey && !e.evt.altKey && selected && !disabled) {
                if (
                  handleShiftClickPointConversion(e, {
                    initialPoints,
                    transform,
                    fitScale,
                    x,
                    y,
                    allowBezier,
                    pixelSnapping,
                    onPointsChange,
                    onPointEdited,
                    setVisibleControlPoints,
                  } as any)
                ) {
                  pointSelectionHandled.current = true;
                  return; // Successfully converted point
                }
              }

              // Handle cmd/ctrl-click for multi-selection (when selected and not disabled)
              if (selected && !disabled && (e.evt.ctrlKey || e.evt.metaKey) && !e.evt.altKey && !e.evt.shiftKey) {
                // Check if this instance can have selection
                if (!tracker.canInstanceHaveSelection(instanceId)) {
                  return; // Block the selection
                }

                // Check if this point is already selected - if so, deselect it
                if (effectiveSelectedPoints.has(pointIndex)) {
                  const newSelection = new Set(effectiveSelectedPoints);
                  newSelection.delete(pointIndex);
                  tracker.selectPoints(instanceId, newSelection);
                  pointSelectionHandled.current = true;
                  e.evt.stopImmediatePropagation();
                  return;
                }

                // If not deselection, add to multi-selection
                const newSelection = new Set(effectiveSelectedPoints);
                newSelection.add(pointIndex);
                tracker.selectPoints(instanceId, newSelection);
                pointSelectionHandled.current = true;
                e.evt.stopImmediatePropagation();
                return;
              }

              // Handle point selection even when not selected (similar to shape clicks)
              // But never allow selection when disabled
              if (disabled) {
                return;
              }
              if (!selected) {
                // Check if this instance can have selection
                if (!tracker.canInstanceHaveSelection(instanceId)) {
                  return; // Block the selection
                }

                // Check if we're about to close the path - prevent point selection in this case
                if (
                  shouldClosePathOnPointClick(
                    pointIndex,
                    {
                      initialPoints,
                      allowClose,
                      isPathClosed: finalIsPathClosed,
                      skeletonEnabled,
                      activePointId,
                    } as any,
                    e,
                  )
                ) {
                  return; // Block the selection
                }

                // For non-selected mode, still allow point selection
                tracker.selectPoints(instanceId, new Set([pointIndex]));
                pointSelectionHandled.current = true;

                // CRITICAL: For single-point regions, directly call onClick handler so the region can be selected
                // Single-point regions have no segments to click on, so clicking the point must trigger region selection
                const isSinglePointRegion = initialPoints.length === 1;
                if (isSinglePointRegion && !e.evt.altKey && !e.evt.shiftKey && !e.evt.ctrlKey && !e.evt.metaKey) {
                  // Directly call handleClickWithDebouncing to trigger region selection
                  // This works even when selected=false (Group onClick is undefined)
                  handleClickWithDebouncing(e, onClick, onDblClick);
                  return;
                }

                e.evt.stopPropagation();
                e.evt.preventDefault();
                e.cancelBubble = true;
                return;
              }

              // Handle regular point selection (when selected, not disabled, and not in transform mode)
              if (selected && !disabled && !transformMode) {
                // Check if this instance can have selection
                if (!tracker.canInstanceHaveSelection(instanceId)) {
                  return; // Block the selection
                }

                // Select only this point (single selection for regular click)
                tracker.selectPoints(instanceId, new Set([pointIndex]));
                pointSelectionHandled.current = true;

                // CRITICAL: For single-point regions, directly call onClick handler so the region can be selected
                // Single-point regions have no segments to click on, so clicking the point must trigger region selection
                const isSinglePointRegion = initialPoints.length === 1;
                if (isSinglePointRegion && !e.evt.altKey && !e.evt.shiftKey && !e.evt.ctrlKey && !e.evt.metaKey) {
                  // Directly call handleClickWithDebouncing to trigger region selection
                  // This works even when selected=false (Group onClick is undefined)
                  handleClickWithDebouncing(e, onClick, onDblClick);
                  return;
                }

                // Don't call onClick here - clicking on points should NOT select/unselect the shape
                // Only clicking on segments should select/unselect the shape
                // EXCEPTION: Single-point regions (handled above)
                // Always stop event propagation to prevent the VectorShape onClick handler from firing
                // This prevents the shape from being selected/unselected when clicking on points
                e.evt.stopImmediatePropagation();
                e.evt.stopPropagation();
                e.evt.preventDefault();
                e.cancelBubble = true;
                return;
              }

              // Mark that point selection was handled
              pointSelectionHandled.current = true;
            }}
            onPointDragStart={eventHandlers.handlePointDragStart}
            onPointDragMove={eventHandlers.handlePointDragMove}
            onPointDragEnd={eventHandlers.handlePointDragEnd}
            onPointConvert={eventHandlers.handlePointConvert}
            onControlPointDragStart={eventHandlers.handleControlPointDragStart}
            onControlPointDragMove={eventHandlers.handleControlPointDragMove}
            onControlPointDragEnd={eventHandlers.handleControlPointDragEnd}
            onControlPointConvert={eventHandlers.handleControlPointConvert}
            onSegmentClick={eventHandlers.handleSegmentClick}
            visibleControlPoints={visibleControlPoints}
            allowBezier={allowBezier}
            isTransforming={isTransforming}
            key={`vector-points-${initialPoints.length}-${initialPoints.map((p, i) => `${i}-${p.x.toFixed(1)}-${p.y.toFixed(1)}-${p.controlPoint1?.x?.toFixed(1) || "null"}-${p.controlPoint1?.y?.toFixed(1) || "null"}-${p.controlPoint2?.x?.toFixed(1) || "null"}-${p.controlPoint2?.y?.toFixed(1) || "null"}`).join("-")}`}
          />

          {/* Proxy nodes for Transformer (positioned at exact point centers) - only show when not in drawing mode and not multi-region selected */}
          {drawingDisabled && !isMultiRegionSelected && (
            <ProxyNodes selectedPoints={effectiveSelectedPoints} initialPoints={getAllPoints()} proxyRefs={proxyRefs} />
          )}

          {/* Transformer for multiselection - only show when not in drawing mode and not multi-region selected */}
          {drawingDisabled && !isMultiRegionSelected && (
            <VectorTransformer
              selectedPoints={effectiveSelectedPoints}
              initialPoints={getAllPoints()}
              transformerRef={transformerRef}
              proxyRefs={proxyRefs}
              getCurrentPointsRef={getCurrentPointsRef}
              updateCurrentPointsRef={updateCurrentPointsRef}
              pixelSnapping={pixelSnapping}
              onPointsChange={(newPoints) => {
                // Update main path points
                onPointsChange?.(newPoints);
              }}
              onTransformationComplete={notifyTransformationComplete}
              onTransformationStart={() => {
                handleTransformStart();
              }}
              onTransformationEnd={() => {
                handleTransformEnd();
              }}
              bounds={{ x: 0, y: 0, width, height }}
              transform={transform}
              fitScale={fitScale}
            />
          )}
        </>
      )}

      {/* Ghost point - ALWAYS render if ghostPoint exists, outside any conditionals */}
      <GhostPoint
        ref={ghostPointRef}
        ghostPoint={ghostPoint}
        transform={transform}
        fitScale={fitScale}
        isShiftKeyHeld={isShiftKeyHeld}
        maxPoints={maxPoints}
        initialPointsLength={initialPoints.length}
        isDragging={isDragging.current}
      />
    </Group>
  );
});
