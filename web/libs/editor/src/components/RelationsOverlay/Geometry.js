/**
 * @typedef {{x: number, y: number, width: number, height: number}} BBox
 *
 * @typedef {number[]} Points Represents (x,y) flat array, meaning
 * each two numbers represent x and y accordingly. Array always starts with x
 *
 * @typedef {{
 * x1: number,
 * x2: number,
 * x3: number,
 * x4: number,
 * y1: number,
 * y2: number,
 * y3: number,
 * y4: number}} RectCoordinates Represents 4 corners coordinates of rectangle
 */
import { clamp } from '../../utils/utilities';

export class Geometry {
  /**
   * Returns RAD angle to normalized degrees meaning that it will always fit 0-360 range
   * @param {number} angle Angle in RAD
   */
  static normalizeAngle(angle) {
    return ((angle + 360) % 360) * (Math.PI / 180);
  }

  /**
   * Calculate BBox for any number of coordinates
   * @param {Points} points Input points
   * @returns {Points} Array of two (x,y) coordinates representing a BBox
   */
  static getPointsBBox(points) {
    const minmax = [null, null, null, null];

    points.forEach((num, i) => {
      const pos = Math.round(i / 2) * 2 - i;

      if (pos === 0) {
        // Calculate min and max X
        if (minmax[0] === null || minmax[0] >= num) minmax[0] = num;
        if (minmax[2] === null || minmax[2] <= num) minmax[2] = num;
      } else if (pos === 1) {
        // Calculate min and max Y
        if (minmax[1] === null || minmax[1] >= num) minmax[1] = num;
        if (minmax[3] === null || minmax[3] <= num) minmax[3] = num;
      }
    });

    return minmax;
  }

  /**
   * Calculate distance between wo points
   * @param {Points} point1
   * @param {Points} point2
   */
  static distance(point1, point2) {
    const [x1, y1] = point1;
    const [x2, y2] = point2;

    return Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
  }

  /**
   * Convert standard bbox to a set of coordinates
   * @param {BBox} bbox
   * @returns {RectCoordinates}
   */
  static toRectCoordinates(bbox) {
    const { x: x1, y: y1, width, height } = bbox;
    const [x2, y2] = [x1 + width, y1];
    const [x3, y3] = [x1 + width, y1 + height];
    const [x4, y4] = [x1, y1 + height];

    return { x1, x2, x3, x4, y1, y2, y3, y4 };
  }

  /**
   * Convert RectCoordinates to BBox
   * @param {RectCoordinates} rect
   * @returns {BBox}
   */
  static convertToRectBBox(rect) {
    return {
      x: rect.x1,
      y: rect.y1,
      width: rect.x2 - rect.x1,
      height: rect.y3 - rect.y1,
    };
  }

  /**
   * Find two closes BBoxes of two lists
   * @param {BBox[]} rectsList1
   * @param {BBox[]} rectsList2
   */
  static closestRects(rectsList1, rectsList2) {
    const result = rectsList1
      .reduce((res, rect1) => {
        const bbox1 = this.toRectCoordinates(rect1);

        rectsList2.forEach(rect2 => {
          const bbox2 = this.toRectCoordinates(rect2);

          const avgDistance =
            [
              this.distance([bbox1.x1, bbox1.y1], [bbox2.x1, bbox1.y1]),
              this.distance([bbox1.x2, bbox1.y2], [bbox2.x2, bbox1.y2]),
              this.distance([bbox1.x3, bbox1.y3], [bbox2.x3, bbox1.y3]),
              this.distance([bbox1.x4, bbox1.y4], [bbox2.x4, bbox2.y4]),
            ].reduce((d1, d2) => d1 + d2) / 4;

          res.push({
            distance: avgDistance,
            bbox: [this.convertToRectBBox(bbox1), this.convertToRectBBox(bbox2)],
          });
        });

        return res;
      }, [])
      .sort((a, b) => a.distance - b.distance);

    return result[0].bbox;
  }

  /**
   * Scale given BBox by a scale factor
   * @param {BBox} bbox Original BBox
   * @param {number} scale Scale factor
   * @returns {BBox} Scaled BBox
   */
  static scaleBBox(bbox, scale = 1) {
    return {
      ...bbox,
      x: bbox.x * scale,
      y: bbox.y * scale,
      width: bbox.width * scale,
      height: bbox.height * scale,
    };
  }

  static modifyBBoxCoords(bbox, modifier = x => x) {
    const p1 = modifier([bbox.x, bbox.y]);
    const p2 = modifier([bbox.width + bbox.x, bbox.height + bbox.y]);

    return {
      ...bbox,
      x: Math.min(p1[0], p2[0]),
      y: Math.min(p1[1], p2[1]),
      width: Math.abs(p2[0] - p1[0]),
      height: Math.abs(p2[1] - p1[1]),
    };
  }

  /**
   * Add padding to BBox
   * @param {BBox} bbox BBox to pad
   * @param {number} padding Padding size
   */
  static padding(bbox, padding = 0) {
    const paddingX = bbox.width < 1 ? 0 : padding;
    const paddingY = bbox.height < 1 ? 0 : padding;

    return {
      ...bbox,
      x: bbox.x - paddingX,
      y: bbox.y - paddingY,
      width: bbox.width + paddingX * 2,
      height: bbox.height + paddingY * 2,
    };
  }

  /**
   * Calculate ellipse BBox
   * @param {number} x Center X
   * @param {number} y Center Y
   * @param {number} rx Radius X
   * @param {number} ry Radius Y
   * @param {number} angle Angle in RAD
   * @returns {BBox[]} Dimensions of bounding box
   */
  static getEllipseBBox(x, y, rx, ry, angle) {
    const angleRad = this.normalizeAngle(angle);
    const major = Math.max(rx, ry) * 2;
    const minor = Math.min(rx, ry) * 2;

    const getXLimits = () => {
      const t = Math.atan(((-minor / 2) * Math.tan(angleRad)) / (major / 2));

      return [t, t + Math.PI]
        .map(t => {
          return x + (major / 2) * Math.cos(t) * Math.cos(angleRad) - (minor / 2) * Math.sin(t) * Math.sin(angleRad);
        })
        .sort((a, b) => b - a);
    };

    const getYLimits = () => {
      const t = Math.atan(((minor / 2) * 1.0) / Math.tan(angleRad) / (major / 2));

      return [t, t + Math.PI]
        .map(t => {
          return y + (minor / 2) * Math.sin(t) * Math.cos(angleRad) + (major / 2) * Math.cos(t) * Math.sin(angleRad);
        })
        .sort((a, b) => b - a);
    };

    const [x1, x2] = getXLimits();
    const [y1, y2] = getYLimits();
    const width = x1 - x2;
    const height = y1 - y2;

    return { x: x2, y: y2, width, height };
  }

  /**
   * Calculate rotated rect BBox
   * @param {number} x Top left X
   * @param {number} y Top left Y
   * @param {number} width Width
   * @param {number} height Height
   * @param {number} angle Angle in RAD
   * @returns {BBox[]} Dimensions of bounding box
   */
  static getRectBBox(x, y, width, height, angle) {
    const angleRad = this.normalizeAngle(angle);

    const rotate = (x1, y1) => [
      (x1 - x) * Math.cos(angleRad) - (y1 - y) * Math.sin(angleRad) + x,
      (x1 - x) * Math.sin(angleRad) + (y1 - y) * Math.cos(angleRad) + y,
    ];

    const [rx1, ry1, rx2, ry2] = this.getPointsBBox([
      x,
      y,
      ...rotate(x + width, y),
      ...rotate(x + width, y + height),
      ...rotate(x, y + height),
    ]);

    return { x: rx1, y: ry1, width: rx2 - rx1, height: ry2 - ry1 };
  }

  /**
   * Calculate BBox of polygon shape
   * @param {Points} points
   * @return {BBox[]}
   */
  static getPolygonBBox(points) {
    const coords = points.reduce((res, point) => [...res, point.x, point.y], []);
    const [x1, y1, x2, y2] = this.getPointsBBox(coords);

    return { x: x1, y: y1, width: x2 - x1, height: y2 - y1 };
  }

  /**
   * Calculate BBox of Brush region (a set of points)
   * @param {Points} points
   * @return {BBox[]}
   */
  static getBrushBBox(points) {
    const [x1, y1, x2, y2] = this.getPointsBBox(points);

    return { x: x1, y: y1, width: x2 - x1, height: y2 - y1 };
  }

  /**
   * Calculate BBox of Brush region from image data
   * @param {Uint8ClampedArray} imageData Array containing the data in the RGBA order
   * @param {Number} width
   * @param {Number} height
   * @return {BBox}
   */
  static getImageDataBBox(imageData, w, h) {
    if (imageData.length !== w * h * 4) return null;
    const min = { x: w, y: h },
      max = { x: 0, y: 0 };

    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const alphaIndex = 4 * (y * w + x) + 3;

        if (imageData[alphaIndex]) {
          if (min.x > x) min.x = x;
          if (min.y > y) min.y = y;
          if (max.x < x) max.x = x;
          if (max.y < y) max.y = y;
        }
      }
    }
    return min.x <= max.x && min.y <= max.y ? { x: min.x, y: min.y, width: max.x - min.x, height: max.y - min.y } : null;
  }
  /**
   * Combine two or more BBoxes into one
   * @param {...BBox} bboxes Bboxes to merge
   * @return {BBox}
   */
  static combineBBoxes(...bboxes) {
    const [x1, y1, x2, y2] = this.getPointsBBox(
      bboxes.reduce((points, bbox) => {
        if (bbox && bbox.x && bbox.y) {
          points.push(bbox.x);
          points.push(bbox.y);
          points.push(bbox.x + bbox.width);
          points.push(bbox.y + bbox.height);
        }
        return points;
      }, []),
    );

    return { x: x1, y: y1, width: x2 - x1, height: y2 - y1 };
  }

  static clampBBox(bbox, min, max) {
    const p1 = [clamp(bbox.x, min.x, max.x), clamp(bbox.y, min.y, max.y)];
    const p2 = [clamp(bbox.width + bbox.x, min.x, max.x), clamp(bbox.height + bbox.y, min.y, max.y)];

    return {
      x: p1[0],
      y: p1[1],
      width: p2[0] - p1[0],
      height: p2[1] - p1[1],
    };
  }

  /**
   * Get BBox of any DOM node
   * @param {HTMLElement} domNode
   * @param {boolean} single Should return all possible BBoxes or not
   * @return {BBox[]}
   */
  static getDOMBBox(domNode, single = false) {
    if (!domNode) return null;

    const bboxes = domNode.getClientRects();

    if (bboxes.length === 0) return null;

    const convertDOMRect = domRect => ({
      x: domRect.x,
      y: domRect.y,
      width: domRect.width,
      height: domRect.height,
    });

    return single ? convertDOMRect(bboxes[0]) : Array.from(domNode.getClientRects()).map(convertDOMRect);
  }
}
