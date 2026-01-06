import { types } from "mobx-state-tree";
import Registry from "../core/Registry";
import { AudioRegionModel } from "./AudioRegion";
import { BrushRegionModel, HtxBrush } from "./BrushRegion";
import { BitmaskRegionModel, HtxBitmask } from "./BitmaskRegion";
import { ParagraphsRegionModel } from "./ParagraphsRegion";
import { TimeSeriesRegionModel } from "./TimeSeriesRegion";
import { HtxKeyPoint, KeyPointRegionModel } from "./KeyPointRegion";
import { PolygonPoint, PolygonPointView } from "./PolygonPoint";
import { HtxPolygon, PolygonRegionModel } from "./PolygonRegion";
import { HtxVector, VectorRegionModel } from "./VectorRegion";
import { HtxRectangle, RectRegionModel } from "./RectRegion";
import { EllipseRegionModel, HtxEllipse } from "./EllipseRegion";
import { HtxTextAreaRegion, TextAreaRegionModel } from "./TextAreaRegion";
import { RichTextRegionModel } from "./RichTextRegion";
import { TimelineRegionModel } from "./TimelineRegion";
import { VideoRectangleRegionModel } from "./VideoRectangleRegion";

const AllRegionsType = types.union(
  AudioRegionModel,
  BrushRegionModel,
  BitmaskRegionModel,
  EllipseRegionModel,
  TimeSeriesRegionModel,
  KeyPointRegionModel,
  PolygonRegionModel,
  VectorRegionModel,
  RectRegionModel,
  TextAreaRegionModel,
  RichTextRegionModel,
  TimeSeriesRegionModel,
  TimelineRegionModel,
  ParagraphsRegionModel,
  VideoRectangleRegionModel,
  ...Registry.customTags.map((t) => t.region).filter(Boolean),
);

export {
  AllRegionsType,
  AudioRegionModel,
  BrushRegionModel,
  EllipseRegionModel,
  HtxBrush,
  HtxBitmask,
  HtxEllipse,
  HtxKeyPoint,
  HtxPolygon,
  HtxVector,
  HtxRectangle,
  HtxTextAreaRegion,
  RichTextRegionModel,
  ParagraphsRegionModel,
  TimeSeriesRegionModel,
  KeyPointRegionModel,
  PolygonPoint,
  PolygonPointView,
  PolygonRegionModel,
  VectorRegionModel,
  RectRegionModel,
  TextAreaRegionModel,
  TimelineRegionModel,
  VideoRectangleRegionModel,
};
