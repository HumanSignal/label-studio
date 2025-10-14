/**
 * Constants for KonvaVector component
 *
 * This file contains all hardcoded values used throughout the KonvaVector component
 * to ensure consistency and maintainability.
 */

// Instance ID generation
export const INSTANCE_ID_PREFIX = "konva-vector-";
export const INSTANCE_ID_LENGTH = 9;

// Default transform values
export const DEFAULT_TRANSFORM = {
  zoom: 1,
  offsetX: 0,
  offsetY: 0,
} as const;

export const DEFAULT_FIT_SCALE = 1;

// Default transformer state
export const DEFAULT_TRANSFORMER_STATE = {
  rotation: 0,
  scaleX: 1,
  scaleY: 1,
  centerX: 0,
  centerY: 0,
} as const;

// Default styling colors
export const DEFAULT_STROKE_COLOR = "#3b82f6";
export const DEFAULT_FILL_COLOR = "rgba(239, 68, 68, 0.3)";

// Default point styling
export const DEFAULT_POINT_FILL = "#ffffff";
export const DEFAULT_POINT_STROKE = "#3b82f6";
export const DEFAULT_POINT_STROKE_SELECTED = "#fbbf24";
export const DEFAULT_POINT_STROKE_WIDTH = 2;

// Default point radius values
export const DEFAULT_POINT_RADIUS = {
  enabled: 8,
  disabled: 3,
} as const;

// Keypoint annotation point radius values
export const KEYPOINT_POINT_RADIUS = {
  enabled: 6,
  disabled: 4,
} as const;

// Hit detection radii (in pixels)
export const HIT_RADIUS = {
  CONTROL_POINT: 6,
  SELECTION: 5,
  SEGMENT: 8,
} as const;

// Timing constants
export const TRANSFORMER_SETUP_DELAY = 0;
export const TRANSFORMER_CLEAR_DELAY = 10;

// Point count constraints
export const MIN_POINTS_FOR_CLOSING = 2;
export const MIN_POINTS_FOR_BEZIER_CLOSING = 2;

// Invisible shape opacity for mouse event capture
export const INVISIBLE_SHAPE_OPACITY = "rgba(255,255,255,0.001)";

// Math constants
export const DEGREES_TO_RADIANS = Math.PI / 180;

// Example coordinates for documentation
export const EXAMPLE_COORDINATES = {
  BASIC_PATH: [
    [100, 100],
    [200, 150],
    [300, 100],
  ],
  SIMPLE_PATH: [
    [0, 0],
    [100, 50],
    [200, 0],
  ],
} as const;

// Example point count constraints
export const EXAMPLE_POINT_CONSTRAINTS = {
  MIN_POINTS: 3,
  MAX_POINTS: 10,
} as const;

// Default scale values
export const DEFAULT_SCALE = 1;

// Default offset values
export const DEFAULT_OFFSET = 0;

// Default callback time
export const DEFAULT_CALLBACK_TIME = 0;

// Array index constants
export const ARRAY_INDEX = {
  FIRST: 0,
  LAST_OFFSET: 1,
} as const;

// Selection size constants
export const SELECTION_SIZE = {
  MULTI_SELECTION_MIN: 1,
  TRANSFORMER_MIN: 2,
} as const;

// Center calculation divisor
export const CENTER_CALCULATION_DIVISOR = 2;

// Control point diamond ratios
export const CONTROL_POINT_DIAMOND = {
  WIDTH_HEIGHT_MULTIPLIER: 1.6,
  OFFSET_MULTIPLIER: 0.8,
  ROTATION: 45,
} as const;

// Control point styling
export const CONTROL_POINT_STYLING = {
  LINE_STROKE: "#3b82f6",
  LINE_STROKE_WIDTH: 1,
  DIAMOND_FILL: "#ffffff",
  DIAMOND_STROKE: "#3b82f6",
  DIAMOND_STROKE_WIDTH: 2,
  CONTROL_POINT_2_OPACITY: 0.9,
} as const;

// Connection line styling
export const CONNECTION_LINE_STYLING = {
  STROKE: "#3b82f6",
  STROKE_WIDTH: 2,
  TENSION: 0,
  LINE_CAP: "round" as const,
  LINE_JOIN: "round" as const,
} as const;

// Ghost line styling and behavior
export const GHOST_LINE_STYLING = {
  STROKE_WIDTH: 2,
  DASH: [4, 4] as const,
  OPACITY: 0.6,
  CLOSING_INDICATOR_STROKE: "#10b981",
  CLOSING_INDICATOR_STROKE_WIDTH: 3,
  CLOSING_INDICATOR_DASH: [6, 6] as const,
  CLOSING_INDICATOR_OPACITY: 0.8,
  CLOSE_RADIUS: 15,
  BEZIER_CONTROL_MULTIPLIER: 0.3,
} as const;
