import { types } from "mobx-state-tree";

// export { default as Zoom } from "./Zoom";
// export { default as KeyPoint } from "./KeyPoint";

import { AudioRegionModel } from "./AudioRegion";
import { HyperTextRegionModel } from "./HyperTextRegion";
import { KeyPointRegionModel, HtxKeyPoint } from "./KeyPointRegion";
import { PolygonPoint, PolygonPointView } from "./PolygonPoint";
import { PolygonRegionModel, HtxPolygon } from "./PolygonRegion";
import { RectRegionModel, HtxRectangle } from "./RectRegion";
import { TextAreaRegionModel, HtxTextAreaRegion } from "./TextAreaRegion";
import { TextRegionModel, HtxTextRegion } from "./TextRegion";
import { BrushRegionModel, HtxBrush } from "./BrushRegion";

const AllRegionsType = types.union(
  TextRegionModel,
  RectRegionModel,
  PolygonRegionModel,
  AudioRegionModel,
  TextAreaRegionModel,
  KeyPointRegionModel,
  BrushRegionModel,
  HyperTextRegionModel,
);

export {
  AllRegionsType,
  AudioRegionModel,
  HyperTextRegionModel,
  KeyPointRegionModel,
  HtxKeyPoint,
  PolygonPoint,
  PolygonPointView,
  PolygonRegionModel,
  HtxPolygon,
  RectRegionModel,
  HtxRectangle,
  TextAreaRegionModel,
  HtxTextAreaRegion,
  TextRegionModel,
  HtxTextRegion,
  BrushRegionModel,
  HtxBrush,
};
