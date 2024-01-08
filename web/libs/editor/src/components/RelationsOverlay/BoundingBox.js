import { wrapArray } from '../../utils/utilities';
import { Geometry } from './Geometry';

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

    return wrapArray(bbox).map(bbox => Object.assign({ ...DEFAULT_BBOX }, bbox));
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

const _detect = region => {
  switch (region.type) {
    case 'textrange':
    case 'richtextregion':
    case 'textarearegion':
    case 'audioregion':
    case 'paragraphs':
    case 'timeseriesregion': {
      const regionBbox = Geometry.getDOMBBox(region.getRegionElement());
      const container = region.parent?.visibleNodeRef?.current;

      if (container?.tagName === 'IFRAME') {
        const iframeBbox = Geometry.getDOMBBox(container, true);

        return regionBbox?.map(bbox => ({
          ...bbox,
          x: bbox.x + iframeBbox.x,
          y: bbox.y + iframeBbox.y,
        })) || null;
      }

      return regionBbox;
    }
    case 'rectangleregion':
    case 'ellipseregion':
    case 'polygonregion':
    case 'keypointregion':
    case 'brushregion': {
      const bbox = region.bboxCoordsCanvas;

      return bbox ? stageRelatedBBox(
        region,
        {
          x: bbox.left,
          y: bbox.top,
          width: bbox.right - bbox.left,
          height: bbox.bottom - bbox.top,
        },
      ) : DEFAULT_BBOX;
    }
    default: {
      console.warn(`Unknown region type: ${region.type}`);
      return { ...DEFAULT_BBOX };
    }
  }
};
