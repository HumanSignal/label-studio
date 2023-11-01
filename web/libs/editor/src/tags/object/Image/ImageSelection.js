import { getParent, types } from 'mobx-state-tree';
import { ImageSelectionPoint } from './ImageSelectionPoint';
import { FF_DEV_3793, isFF } from '../../../utils/feature-flags';
import { RELATIVE_STAGE_HEIGHT, RELATIVE_STAGE_WIDTH } from '../../../components/ImageView/Image';

export const ImageSelection = types.model({
  start: types.maybeNull(ImageSelectionPoint),
  end: types.maybeNull(ImageSelectionPoint),
}).views(self => {
  return {
    get obj() {
      return getParent(self);
    },
    get annotation() {
      return self.obj.annotation;
    },
    get highlightedNodeExists() {
      return !!self.annotation.highlightedNode;
    },
    get isActive() {
      return self.start && self.end;
    },
    get x() {
      return Math.min((self.start.x * self.scale), (self.end.x * self.scale));
    },
    get y() {
      return Math.min((self.start.y * self.scale), (self.end.y * self.scale));
    },
    get width() {
      return Math.abs((self.end.x * self.scale) - (self.start.x * self.scale));
    },
    get height() {
      return Math.abs((self.end.y * self.scale) - (self.start.y * self.scale));
    },
    get scale() {
      return self.obj.zoomScale;
    },
    get bbox() {
      const { start, end } = self;

      return self.isActive ? {
        left: Math.min(start.x, end.x),
        top: Math.min(start.y, end.y),
        right: Math.max(start.x, end.x),
        bottom: Math.max(start.y, end.y),
      } : null;
    },
    get onCanvasBbox() {
      if (!self.isActive) return null;

      const { start, end } = self;

      return {
        left: self.obj.internalToCanvasX(Math.min(start.x, end.x)),
        top: self.obj.internalToCanvasY(Math.min(start.y, end.y)),
        right: self.obj.internalToCanvasX(Math.max(start.x, end.x)),
        bottom: self.obj.internalToCanvasY(Math.max(start.y, end.y)),
      };
    },
    get onCanvasRect() {
      if (!isFF(FF_DEV_3793)) return self;

      if (!self.isActive) return null;

      const bbox = self.onCanvasBbox;

      return {
        x: bbox.left,
        y: bbox.top,
        width: bbox.right - bbox.left,
        height: bbox.bottom - bbox.top,
      };
    },
    includesBbox(bbox) {
      if (!self.isActive || !bbox) return false;
      const isLeftOf = self.bbox.left <= bbox.left;
      const isAbove = self.bbox.top <= bbox.top;
      const isRightOf = self.bbox.right >= bbox.right;
      const isBelow = self.bbox.bottom >= bbox.bottom;
      
      return isLeftOf && isAbove && isRightOf && isBelow;
    },
    intersectsBbox(bbox) {
      if (!self.isActive || !bbox) return false;
      const selfCenterX = (self.bbox.left + self.bbox.right) / 2;
      const selfCenterY = (self.bbox.top + self.bbox.bottom) / 2;
      const selfWidth = self.bbox.right - self.bbox.left;
      const selfHeight = self.bbox.bottom - self.bbox.top;
      const targetCenterX = (bbox.left + bbox.right) / 2;
      const targetCenterY = (bbox.top + bbox.bottom) / 2;
      const targetWidth = bbox.right - bbox.left;
      const targetHeight = bbox.bottom - bbox.top;

      return (Math.abs(selfCenterX - targetCenterX) * 2 < (selfWidth + targetWidth)) &&
        (Math.abs(selfCenterY - targetCenterY) * 2 < (selfHeight + targetHeight));
    },
    get selectionBorders() {
      if (self.isActive || !self.obj.selectedRegions.length) return null;

      const initial = isFF(FF_DEV_3793)
        ? { left: RELATIVE_STAGE_WIDTH, top: RELATIVE_STAGE_HEIGHT, right: 0, bottom: 0 }
        : { left: self.obj.stageWidth, top: self.obj.stageHeight, right: 0, bottom: 0 };
      const bbox = self.obj.selectedRegions.reduce((borders, region) => {
        return region.bboxCoords ? {
          left: Math.min(borders.left, region.bboxCoords.left),
          top: Math.min(borders.top,region.bboxCoords.top),
          right: Math.max(borders.right, region.bboxCoords.right),
          bottom: Math.max(borders.bottom, region.bboxCoords.bottom),
        } : borders;
      }, initial);

      if (!isFF(FF_DEV_3793)) return bbox;

      return {
        left: self.obj.internalToCanvasX(bbox.left),
        top: self.obj.internalToCanvasY(bbox.top),
        right: self.obj.internalToCanvasX(bbox.right),
        bottom: self.obj.internalToCanvasY(bbox.bottom),
      };
    },
  };
}).actions(self => {
  return {
    setStart(point) {
      self.start = point;
    },
    setEnd(point) {
      self.end = point;
    },
  };
});
