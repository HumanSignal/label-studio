import { wrapArray } from "../../utils/utilities";
import { Geometry } from "./Geometry";

/**
 * @type {import("./Geometry").BBox}
 */
const DEFAULT_BBOX = { x: 0, y: 0, width: 0, height: 0 };

/**
 * Provides an abstract boudnign box for any types of regions
 */
export class BoundingBox {
  options = {};

  static bbox(region) {
    const bbox = _detect(region);

    return wrapArray(bbox).map((bbox) => Object.assign({ ...DEFAULT_BBOX }, bbox));
  }

  /**
   * Contructor
   *
   * _source_ might be any object that provides its dimensions and position
   *
   * @param {{
   * source: any,
   * getX: (any) => number,
   * getY: (any) => number,
   * getXWidth: (any) => number,
   * getHeight: (any) => number
   * }} options
   */
  constructor(options) {
    Object.assign(this.options, options);
  }

  get _source() {
    return this.options.source;
  }

  get x() {
    return this.options.getX(this._source);
  }

  get y() {
    return this.options.getY(this._source);
  }

  get width() {
    return this.options.getWidth(this._source);
  }

  get height() {
    return this.options.getHeight(this._source);
  }
}

const stageRelatedBBox = (region, bbox) => {
  // If there is no stageRef we just wait for it in the next renders
  if (!region.parent?.stageRef) return null;
  const imageBbox = Geometry.getDOMBBox(region.parent.stageRef.content, true);
  const transformedBBox = Geometry.clampBBox(
    Geometry.modifyBBoxCoords(bbox, region.parent.zoomOriginalCoords),
    { x: 0, y: 0 },
    { x: region.parent.canvasSize.width, y: region.parent.canvasSize.height },
  );

  return {
    ...transformedBBox,
    x: imageBbox.x + transformedBBox.x,
    y: imageBbox.y + transformedBBox.y,
  };
};

const videoRegionBBox = (region, getShapeBbox) => {
  const wa = region.parent?.workingArea;
  const stage = region.parent?.stageRef;
  if (!wa || !stage) return DEFAULT_BBOX;

  const shapeBbox = getShapeBbox();
  if (!shapeBbox) return DEFAULT_BBOX;

  const stageContainer = stage.content || stage.container?.();
  const stageDomBbox = Geometry.getDOMBBox(stageContainer, true);
  if (!stageDomBbox) return DEFAULT_BBOX;

  return {
    x: stageDomBbox.x + shapeBbox.left * wa.scale + wa.x,
    y: stageDomBbox.y + shapeBbox.top * wa.scale + wa.y,
    width: (shapeBbox.right - shapeBbox.left) * wa.scale,
    height: (shapeBbox.bottom - shapeBbox.top) * wa.scale,
  };
};

const _detect = (region) => {
  // that's a tricky way to detect bbox of exact result instead of whole region
  // works for global classifications and per-regions
  const isResult = !!region.from_name;
  if (isResult) {
    return Geometry.getDOMBBox(region.from_name.elementRef?.current);
  }

  switch (region.type) {
    case "textrange":
    case "richtextregion":
    case "textarearegion":
    case "paragraphs":
    case "timeseriesregion": {
      const regionBbox = Geometry.getDOMBBox(region.getRegionElement());
      const container = region.parent?.mountNodeRef?.current;

      if (container?.tagName === "IFRAME") {
        const iframeBbox = Geometry.getDOMBBox(container, true);

        return (
          regionBbox?.map((bbox) => ({
            ...bbox,
            x: bbox.x + iframeBbox.x,
            y: bbox.y + iframeBbox.y,
          })) || null
        );
      }

      return regionBbox;
    }
    case "audioregion": {
      const bbox = region.bboxCoordsCanvas;
      const stageEl = region.parent?.stageRef?.current;
      const stageBbox = Geometry.getDOMBBox(stageEl, true);

      return bbox
        ? stageBbox
          ? {
              x: stageBbox.x + bbox.left,
              y: stageBbox.y + bbox.top,
              width: bbox.right - bbox.left,
              height: bbox.bottom - bbox.top,
            }
          : bbox
        : DEFAULT_BBOX;
    }
    case "rectangleregion":
    case "ellipseregion":
    case "polygonregion":
    case "vectorregion":
    case "keypointregion":
    case "brushregion":
    case "bitmaskregion": {
      const bbox = region.bboxCoordsCanvas;

      return bbox
        ? stageRelatedBBox(region, {
            x: bbox.left,
            y: bbox.top,
            width: bbox.right - bbox.left,
            height: bbox.bottom - bbox.top,
          })
        : DEFAULT_BBOX;
    }
    case "videovectorregion": {
      return videoRegionBBox(region, () => {
        const shapeBbox = region.vectorRef?.getShapeBoundingBox?.();
        if (!shapeBbox || shapeBbox.left === undefined) return null;
        return shapeBbox;
      });
    }
    case "videoregion": {
      return videoRegionBBox(region, () => {
        const frame = region.parent?.currentFrame ?? region.parent?.frame;
        const shape = region.getShape?.(frame);
        if (!shape) return null;
        const wa = region.parent?.workingArea;
        if (!wa) return null;
        const left = (shape.x / 100) * wa.realWidth;
        const top = (shape.y / 100) * wa.realHeight;
        const right = left + (shape.width / 100) * wa.realWidth;
        const bottom = top + (shape.height / 100) * wa.realHeight;
        return { left, top, right, bottom };
      });
    }
    default: {
      console.warn(`Unknown region type: ${region.type}`);
      return { ...DEFAULT_BBOX };
    }
  }
};
