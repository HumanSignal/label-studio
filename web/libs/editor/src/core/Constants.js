/**
 * Re-export for environments where .ts is not resolved from .js (e.g. some test load paths).
 * Keep in sync with Constants.ts.
 */
export const defaultStyle = {
  fillcolor: "#666",
  opacity: 0.2,
  strokecolor: "#666",
  strokewidth: 1,
};

export default {
  FILL_COLOR: "",
  STROKE_COLOR: "",
  STROKE_WIDTH: 1,
  LABEL_BACKGROUND: "#DA935D",
  EMPTY_LABEL: "blank",
  RELATION_BACKGROUND: "#fff",
  SHOW_LABEL_FILL: "white",
  SHOW_LABEL_BACKGROUND: "black",
  HIGHLIGHTED_STROKE_COLOR: "red",
  HIGHLIGHTED_STROKE_WIDTH: 2,
  HIGHLIGHTED_CSS_BORDER: "1px dashed #00aeff",
  SUGGESTION_STROKE_WIDTH: 4,
  DEFAULT_CURSOR: "default",
  CHOOSE_CURSOR: "pointer",
  POINTER_CURSOR: "pointer",
  MOVE_CURSOR: "hand",
  LINKING_MODE_CURSOR: "crosshair",
  BRIGHTNESS_VALUE: 100,
  BRIGHTNESS_MAX: 400,
  CONTRAST_VALUE: 100,
  CONTRAST_MAX: 400,
};
