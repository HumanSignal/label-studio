import type Konva from "konva";
import { useState, useRef, forwardRef, useImperativeHandle, useEffect, useMemo, useCallback } from "react";
import { Group, Shape } from "react-konva";
import {
  ControlPoints,
  GhostLine,
  GhostPoint,
  VectorPoints,
  VectorShape,
  VectorTransformer,
  ProxyNodes,
} from "./components";
import { createEventHandlers } from "./eventHandlers";
import { convertPoint } from "./pointManagement";
import { normalizePoints, convertBezierToSimplePoints, isPointInPolygon } from "./utils";
import { findClosestPointOnPath, getDistance } from "./eventHandlers/utils";
import { PointCreationManager } from "./pointCreationManager";
import { VectorSelectionTracker, type VectorInstance } from "./VectorSelectionTracker";
import { calculateShapeBoundingBox } from "./utils/bezierBoundingBox";
import { shouldClosePathOnPointClick, isActivePointEligibleForClosing } from "./eventHandlers/pointSelection";
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
 *   disabled={true} // Disable editing but allow selection
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
    disabled = false,
    transformMode = false,
    isMultiRegionSelected = false,
    pointRadius,
    pointFill = DEFAULT_POINT_FILL,
    pointStroke = DEFAULT_POINT_STROKE,
    pointStrokeSelected = DEFAULT_POINT_STROKE_SELECTED,
    pointStrokeWidth = DEFAULT_POINT_STROKE_WIDTH,
  } = props;

  // Normalize input points to BezierPoint format
  const [initialPoints, setInitialPoints] = useState(() => normalizePoints(rawInitialPoints));

  // Update initialPoints when rawInitialPoints changes
  useEffect(() => {
    setInitialPoints(normalizePoints(rawInitialPoints));
  }, [rawInitialPoints]);

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
  const proxyRefs = useRef<{ [key: number]: Konva.Rect | null }>({});
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
      if (e.key === "Shift") {
        setIsShiftKeyHeld(true);
        setIsDisconnectedMode(true);
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === "Shift") {
        setIsShiftKeyHeld(false);
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

  const [draggedPointIndex, setDraggedPointIndex] = useState<number | null>(null);
  const [isShiftKeyHeld, setIsShiftKeyHeld] = useState(false);
  const [draggedControlPoint, setDraggedControlPoint] = useState<{
    pointIndex: number;
    controlIndex: number;
  } | null>(null);
  const [isDisconnectedMode, setIsDisconnectedMode] = useState(false);
  const [ghostPoint, setGhostPoint] = useState<GhostPointType | null>(null);
  const [_newPointDragIndex, setNewPointDragIndex] = useState<number | null>(null);
  const [isDraggingNewBezier, setIsDraggingNewBezier] = useState(false);
  const [ghostPointDragInfo, setGhostPointDragInfo] = useState<{
    ghostPoint: GhostPointType;
    isDragging: boolean;
    dragDistance: number;
  } | null>(null);

  const [cursorPosition, setCursorPosition] = useState<{
    x: number;
    y: number;
  } | null>(null);
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

  // Track initial transform state for delta calculation
  const initialTransformRef = useRef<{
    x: number;
    y: number;
    scaleX: number;
    scaleY: number;
    rotation: number;
  } | null>(null);

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
      console.log("📊 Captured initial transform state:", initialTransformRef.current);
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

  // Determine if drawing should be disabled based on current interaction context
  const isDrawingDisabled = () => {
    // Disable all interactions when disabled prop is true
    // Disable drawing when Shift is held (for Shift+click functionality)
    // Disable drawing when multiple points are selected or when in transform mode
    if (
      disabled ||
      isShiftKeyHeld ||
      effectiveSelectedPoints.size > SELECTION_SIZE.MULTI_SELECTION_MIN ||
      transformMode
    ) {
      return true;
    }

    // Dynamically check control point hover
    if (cursorPosition && initialPoints.length > 0) {
      const scale = transform.zoom * fitScale;
      const controlPointHitRadius = HIT_RADIUS.CONTROL_POINT / scale;

      for (let i = 0; i < initialPoints.length; i++) {
        const point = initialPoints[i];
        if (point.isBezier) {
          // Check control point 1
          if (point.controlPoint1) {
            const distance = Math.sqrt(
              (cursorPosition.x - point.controlPoint1.x) ** 2 + (cursorPosition.y - point.controlPoint1.y) ** 2,
            );
            if (distance <= controlPointHitRadius) {
              return true; // Disable drawing when hovering over control points
            }
          }
          // Check control point 2
          if (point.controlPoint2) {
            const distance = Math.sqrt(
              (cursorPosition.x - point.controlPoint2.x) ** 2 + (cursorPosition.y - point.controlPoint2.y) ** 2,
            );
            if (distance <= controlPointHitRadius) {
              return true; // Disable drawing when hovering over control points
            }
          }
        }
      }
    }

    // Dynamically check point hover
    if (cursorPosition && initialPoints.length > 0) {
      const scale = transform.zoom * fitScale;
      const selectionHitRadius = HIT_RADIUS.SELECTION / scale;

      for (let i = 0; i < initialPoints.length; i++) {
        const point = initialPoints[i];
        const distance = Math.sqrt((cursorPosition.x - point.x) ** 2 + (cursorPosition.y - point.y) ** 2);
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
    if (cursorPosition && initialPoints.length >= 2) {
      const scale = transform.zoom * fitScale;
      const segmentHitRadius = HIT_RADIUS.SEGMENT / scale; // Slightly larger than point hit radius

      // Use the same logic as findClosestPointOnPath for consistent Bezier curve detection
      const closestPathPoint = findClosestPointOnPath(cursorPosition, initialPoints, allowClose, finalIsPathClosed);

      if (closestPathPoint && getDistance(cursorPosition, closestPathPoint.point) <= segmentHitRadius) {
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

  // Stabilize functions for tracker registration
  const getPoints = useCallback(() => initialPoints, [initialPoints]);
  const updatePoints = useCallback(
    (points: BezierPoint[]) => {
      setInitialPoints(points);
      onPointsChange?.(points);
    },
    [onPointsChange],
  );
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

  // Clear selection when component is disabled
  useEffect(() => {
    if (disabled) {
      setSelectedPointIndex(null);
      setSelectedPoints(new Set());
      setVisibleControlPoints(new Set());
      setDraggedControlPoint(null);
      setGhostPoint(null);
      setGhostPointDragInfo(null);
      setIsDraggingNewBezier(false);
      setNewPointDragIndex(null);
      // Hide all Bezier control points when disabled
      setVisibleControlPoints(new Set());
    }
  }, [disabled]);
  const lastPos = useRef<{ x: number; y: number } | null>(null);

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
    });
  }, [
    pointCreationManager,
    initialPoints,
    allowBezier,
    pixelSnapping,
    width,
    height,
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
      setVisibleControlPoints((prev) => new Set([...prev, pointIndex]));
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
      for (const index of selectedPoints) {
        if (index < initialPoints.length) {
          selectedIds.push(initialPoints[index].id);
        }
      }
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
    commitMultiRegionTransform: () => {
      if (!isMultiRegionSelected || !transformableGroupRef.current || !initialTransformRef.current) {
        console.log("🔄 commitMultiRegionTransform: Early return - not multi-region or missing refs");
        return;
      }

      console.log("🔄 KonvaVector.commitMultiRegionTransform called");

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

      console.log("📊 Transform deltas:", {
        dx,
        dy,
        scaleX,
        scaleY,
        rotation,
        initial,
        current: { x: currentX, y: currentY, scaleX: currentScaleX, scaleY: currentScaleY, rotation: currentRotation },
      });

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

        console.log("🔍 Transform constraints applied:", {
          original: { dx, dy, scaleX, scaleY },
          constrained: { dx: constrainedDx, dy: constrainedDy, scaleX: constrainedScaleX, scaleY: constrainedScaleY },
          bounds: `${imageWidth}x${imageHeight}`,
          shapeBounds: `(${minX.toFixed(1)}, ${minY.toFixed(1)}) to (${maxX.toFixed(1)}, ${maxY.toFixed(1)})`,
          newBounds: `(${scaledMinX.toFixed(1)}, ${scaledMinY.toFixed(1)}) to (${scaledMaxX.toFixed(1)}, ${scaledMaxY.toFixed(1)})`,
        });
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
        const result = {
          ...point,
          x: Math.max(0, Math.min(imageWidth, rx + constrainedDx)),
          y: Math.max(0, Math.min(imageHeight, ry + constrainedDy)),
        };

        // Transform control points if bezier
        if (point.isBezier) {
          if (point.controlPoint1) {
            const cp1x = point.controlPoint1.x * constrainedScaleX;
            const cp1y = point.controlPoint1.y * constrainedScaleY;
            const cp1rx = cp1x * cos - cp1y * sin;
            const cp1ry = cp1x * sin + cp1y * cos;
            result.controlPoint1 = {
              x: Math.max(0, Math.min(imageWidth, cp1rx + constrainedDx)),
              y: Math.max(0, Math.min(imageHeight, cp1ry + constrainedDy)),
            };
          }
          if (point.controlPoint2) {
            const cp2x = point.controlPoint2.x * constrainedScaleX;
            const cp2y = point.controlPoint2.y * constrainedScaleY;
            const cp2rx = cp2x * cos - cp2y * sin;
            const cp2ry = cp2x * sin + cp2y * cos;
            result.controlPoint2 = {
              x: Math.max(0, Math.min(imageWidth, cp2rx + constrainedDx)),
              y: Math.max(0, Math.min(imageHeight, cp2ry + constrainedDy)),
            };
          }
        }

        return result;
      });

      // Update the points
      onPointsChange?.(transformedVertices);

      console.log(
        "📊 Updated points:",
        transformedVertices.map((p) => ({ id: p.id, x: p.x, y: p.y })),
      );

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

      console.log("📊 Reset _transformable group transform to identity");

      // Detach and reattach the transformer to prevent resizing issues
      const stage = transformableGroup.getStage();
      if (stage) {
        const transformer = stage.findOne("Transformer");
        if (transformer) {
          // Temporarily detach the transformer
          const nodes = transformer.nodes();
          transformer.nodes([]);

          // Force a redraw
          stage.batchDraw();

          // Reattach the transformer after a brief delay
          setTimeout(() => {
            transformer.nodes(nodes);
            stage.batchDraw();
          }, 0);
        }
      }
    },
  }));

  // Clean up click timeout on unmount
  useEffect(() => {
    return () => {
      if (clickTimeoutRef.current) {
        clearTimeout(clickTimeoutRef.current);
        clickTimeoutRef.current = null;
      }
    };
  }, []);

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
      console.log("🖱 handleClickWithDebouncing called, timeout exists:", !!clickTimeoutRef.current);

      // Clear any existing timeout
      if (clickTimeoutRef.current) {
        clearTimeout(clickTimeoutRef.current);
        clickTimeoutRef.current = null;
        // This is a double-click, handle it
        console.log("🖱 Double-click detected, calling onDblClickHandler");
        doubleClickHandledRef.current = true;
        if (onDblClickHandler) {
          onDblClickHandler(e);
        }
        // Reset the flag after a short delay
        setTimeout(() => {
          doubleClickHandledRef.current = false;
        }, 100);
        return;
      }

      // Set a timeout for single-click handling
      console.log("🖱 Single-click detected, setting timeout");
      clickTimeoutRef.current = setTimeout(() => {
        clickTimeoutRef.current = null;
        console.log("🖱 Single-click timeout fired, calling onClickHandler");
        if (onClickHandler) {
          onClickHandler(e);
        }
      }, 300);
    },
    [],
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
    setCursorPosition,
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
    cursorPosition,
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
    disabled,
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
      onMouseDown={disabled ? undefined : eventHandlers.handleLayerMouseDown}
      onMouseMove={disabled ? undefined : eventHandlers.handleLayerMouseMove}
      onMouseUp={disabled ? undefined : eventHandlers.handleLayerMouseUp}
      onClick={
        disabled
          ? undefined
          : (e) => {
              // Skip if point selection was already handled by VectorPoints onClick
              if (pointSelectionHandled.current) {
                pointSelectionHandled.current = false;
                return;
              }

              // For the first point in drawing mode, we need to ensure the click handler works
              // The issue is that the flag logic is interfering with first point creation
              // Let's try calling the drawing mode click handler directly for the first point
              if (initialPoints.length === 0 && !drawingDisabled) {
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
              eventHandlers.handleLayerClick(e);
            }
      }
      onDblClick={
        disabled
          ? undefined
          : (e) => {
              console.log("🖱 Group onDblClick called, doubleClickHandled:", doubleClickHandledRef.current);
              // If we've already handled this double-click through debouncing, ignore it
              if (doubleClickHandledRef.current) {
                console.log("🖱 Ignoring Group onDblClick - already handled through debouncing");
                return;
              }
              // Otherwise, call the original onDblClick handler
              console.log("🖱 Calling original onDblClick handler");
              onDblClick?.(e);
            }
      }
    >
      {/* Invisible rectangle - always render to capture mouse events for cursor position updates */}
      {!disabled && (
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
          onDragMove={(e) => {
            // Apply image coordinate bounds for VectorRegion drag constraints
            const imageWidth = width || 0;
            const imageHeight = height || 0;

            if (imageWidth > 0 && imageHeight > 0) {
              const node = e.target;
              const { x, y } = node.position();

              // Calculate bounding box of current points
              const xs = rawInitialPoints.map((p) => p.x);
              const ys = rawInitialPoints.map((p) => p.y);
              const minX = Math.min(...xs);
              const maxX = Math.max(...xs);
              const minY = Math.min(...ys);
              const maxY = Math.max(...ys);

              // Calculate where the shape would be after this drag
              const newMinX = minX + x;
              const newMaxX = maxX + x;
              const newMinY = minY + y;
              const newMaxY = maxY + y;

              // Apply constraints
              let constrainedX = x;
              let constrainedY = y;

              if (newMinX < 0) constrainedX = x - newMinX;
              if (newMaxX > imageWidth) constrainedX = x - (newMaxX - imageWidth);
              if (newMinY < 0) constrainedY = y - newMinY;
              if (newMaxY > imageHeight) constrainedY = y - (newMaxY - imageHeight);

              // Update position if constraints were applied
              if (constrainedX !== x || constrainedY !== y) {
                // For multi-region selection, apply the same constraint to all selected shapes
                if (isMultiRegionSelected) {
                  const stage = node.getStage();
                  const allTransformableGroups = stage?.find("._transformable");
                  const allNodes = stage?.getChildren();

                  if (allTransformableGroups && allTransformableGroups.length > 1) {
                    // Calculate the constraint offset
                    const constraintOffsetX = constrainedX - x;
                    const constraintOffsetY = constrainedY - y;

                    console.log(
                      `🔍 Multi-region constraint offset: (${constraintOffsetX.toFixed(1)}, ${constraintOffsetY.toFixed(1)})`,
                    );

                    // Apply the same constraint to all other transformable groups
                    allTransformableGroups.forEach((group) => {
                      if (group !== node) {
                        const currentPos = group.position();
                        console.log(
                          `🔍 Applying constraint to group ${group.name()}: (${currentPos.x.toFixed(1)}, ${currentPos.y.toFixed(1)}) -> (${(currentPos.x + constraintOffsetX).toFixed(1)}, ${(currentPos.y + constraintOffsetY).toFixed(1)})`,
                        );
                        group.position({
                          x: currentPos.x + constraintOffsetX,
                          y: currentPos.y + constraintOffsetY,
                        });
                      }
                    });
                  }
                }

                node.position({ x: constrainedX, y: constrainedY });
              }

              console.log(
                `🔍 VectorDragConstraint: bounds=${imageWidth}x${imageHeight}, pos=(${constrainedX.toFixed(1)}, ${constrainedY.toFixed(1)})`,
              );
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
              // Check if click is on the last added point by checking cursor position
              if (cursorPosition && lastAddedPointId) {
                const lastAddedPoint = initialPoints.find((p) => p.id === lastAddedPointId);
                if (lastAddedPoint) {
                  const scale = transform.zoom * fitScale;
                  const hitRadius = 15 / scale; // Same radius as used in event handlers
                  const distance = Math.sqrt(
                    (cursorPosition.x - lastAddedPoint.x) ** 2 + (cursorPosition.y - lastAddedPoint.y) ** 2,
                  );

                  if (distance <= hitRadius) {
                    // Find the index of the last added point
                    const lastAddedPointIndex = initialPoints.findIndex((p) => p.id === lastAddedPointId);

                    // Only trigger onFinish if the last added point is already selected (second click)
                    // and no modifiers are pressed (ctrl, meta, shift, alt) and component is not disabled
                    if (lastAddedPointIndex !== -1 && effectiveSelectedPoints.has(lastAddedPointIndex) && !disabled) {
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
              handleClickWithDebouncing(e, onClick, onDblClick);
            }}
            onMouseEnter={onMouseEnter}
            onMouseLeave={onMouseLeave}
            key={`vector-shape-${initialPoints.length}-${initialPoints.map((p) => p.id).join("-")}`}
          />

          {/* Ghost line - preview from last point to cursor */}
          <GhostLine
            initialPoints={initialPoints}
            cursorPosition={cursorPosition}
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
          />

          {/* Control points - render first so lines appear under main points */}
          {!disabled && (
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
            disabled={disabled}
            pointRadius={pointRadius}
            pointFill={pointFill}
            pointStroke={pointStroke}
            pointStrokeSelected={pointStrokeSelected}
            pointStrokeWidth={pointStrokeWidth}
            onPointClick={(e, pointIndex) => {
              // Handle point selection even when disabled (similar to shape clicks)
              if (disabled) {
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
                const isLastAddedPoint = lastAddedPointId && initialPoints[pointIndex]?.id === lastAddedPointId;
                const isAlreadySelected = effectiveSelectedPoints.has(pointIndex);

                // Only fire onFinish if this is the last added point AND it was already selected (second click)
                // and no modifiers are pressed (ctrl, meta, shift, alt) and component is not disabled
                if (isLastAddedPoint && isAlreadySelected && !disabled) {
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

                // Call the original onClick handler if provided
                onClick?.(e);

                // Mark that we handled selection and prevent all other handlers from running
                pointSelectionHandled.current = true;
                e.evt.stopImmediatePropagation();
                return;
              }

              // When not disabled, let the normal event handlers handle it
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
              onPointsChange={(newPoints) => {
                // Update main path points
                onPointsChange?.(newPoints);
              }}
              onTransformStateChange={(state) => {
                transformerStateRef.current = state;
              }}
              onTransformationStart={() => {
                setIsTransforming(true);
              }}
              onTransformationEnd={() => {
                setIsTransforming(false);
              }}
            />
          )}

          {/* Ghost point */}
          <GhostPoint
            ghostPoint={ghostPoint}
            transform={transform}
            fitScale={fitScale}
            isShiftKeyHeld={isShiftKeyHeld}
            maxPoints={maxPoints}
            initialPointsLength={initialPoints.length}
            isDragging={isDragging.current}
          />
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
              // Check if click is on the last added point by checking cursor position
              if (cursorPosition && lastAddedPointId) {
                const lastAddedPoint = initialPoints.find((p) => p.id === lastAddedPointId);
                if (lastAddedPoint) {
                  const scale = transform.zoom * fitScale;
                  const hitRadius = 15 / scale; // Same radius as used in event handlers
                  const distance = Math.sqrt(
                    (cursorPosition.x - lastAddedPoint.x) ** 2 + (cursorPosition.y - lastAddedPoint.y) ** 2,
                  );

                  if (distance <= hitRadius) {
                    // Find the index of the last added point
                    const lastAddedPointIndex = initialPoints.findIndex((p) => p.id === lastAddedPointId);

                    // Only trigger onFinish if the last added point is already selected (second click)
                    // and no modifiers are pressed (ctrl, meta, shift, alt) and component is not disabled
                    if (lastAddedPointIndex !== -1 && effectiveSelectedPoints.has(lastAddedPointIndex) && !disabled) {
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
              handleClickWithDebouncing(e, onClick, onDblClick);
            }}
            onMouseEnter={onMouseEnter}
            onMouseLeave={onMouseLeave}
            key={`vector-shape-${initialPoints.length}-${initialPoints.map((p) => p.id).join("-")}`}
          />

          {/* Ghost line - preview from last point to cursor */}
          <GhostLine
            initialPoints={initialPoints}
            cursorPosition={cursorPosition}
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
          />

          {/* Control points - render first so lines appear under main points */}
          {!disabled && (
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
            disabled={disabled}
            pointRadius={pointRadius}
            pointFill={pointFill}
            pointStroke={pointStroke}
            pointStrokeSelected={pointStrokeSelected}
            pointStrokeWidth={pointStrokeWidth}
            onPointClick={(e, pointIndex) => {
              // Handle Alt+click point deletion FIRST (before other checks)
              if (e.evt.altKey && !e.evt.shiftKey && !disabled) {
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
                return; // Successfully deleted point
              }

              // Handle Shift+click point conversion (before other checks)
              if (e.evt.shiftKey && !e.evt.altKey && !disabled) {
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
                  })
                ) {
                  pointSelectionHandled.current = true;
                  return; // Successfully converted point
                }
              }

              // Handle point selection even when disabled (similar to shape clicks)
              if (disabled) {
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
              onPointsChange={onPointsChange}
              onTransformationComplete={notifyTransformationComplete}
              bounds={{ x: 0, y: 0, width, height }}
              transform={transform}
              fitScale={fitScale}
            />
          )}
        </>
      )}
    </Group>
  );
});
