import { types } from 'mobx-state-tree';
import { FF_DBLCLICK_DELAY, FF_DEV_3793, FF_ZOOM_OPTIM, isFF } from '../utils/feature-flags';
export const KonvaRegionMixin = types.model({})
  .views((self) => {
    return {
      get bboxCoords() {
        console.warn('KonvaRegionMixin needs to implement bboxCoords getter in regions');
        return null;
      },
      get bboxCoordsCanvas() {
        const bbox = self.bboxCoords;

        if (!isFF(FF_DEV_3793)) return bbox;
        if (!self.parent) return null;

        return {
          left: self.parent.internalToCanvasX(bbox.left),
          top: self.parent.internalToCanvasY(bbox.top),
          right: self.parent.internalToCanvasX(bbox.right),
          bottom: self.parent.internalToCanvasY(bbox.bottom),
        };
      },
      get inViewPort() {
        if (!isFF(FF_ZOOM_OPTIM)) return true;
        return !!self && !!self.bboxCoordsCanvas && !!self.object && (
          self.bboxCoordsCanvas.right >= self.object.viewPortBBoxCoords.left
          && self.bboxCoordsCanvas.bottom >= self.object.viewPortBBoxCoords.top
          && self.bboxCoordsCanvas.left <= self.object.viewPortBBoxCoords.right
          && self.bboxCoordsCanvas.top <= self.object.viewPortBBoxCoords.bottom
        );
      },
      get control() {
        // that's a little bit tricky, but it seems that having a tools field is necessary for the region-creating control tag and it's might be a clue
        return self.results.find(result => result.from_name.tools)?.from_name;
      },
      get canRotate() {
        return self.control?.canrotate && self.supportsRotate;
      },

      get supportsTransform() {
        if (self.isReadOnly()) return false;
        return this._supportsTransform && !this.hidden;
      },
    };
  })
  .actions(self => {
    let deferredSelectId = null;

    return {
      checkSizes() {
        const { naturalWidth, naturalHeight, stageWidth: width, stageHeight: height } = self.parent;

        if (width > 1 && height > 1) {
          self.updateImageSize?.(width / naturalWidth, height / naturalHeight, width, height);
        }
      },

      selectRegion() {
        self.scrollToRegion();
      },

      /**
       * Scrolls to region if possible or scrolls to whole image if needed
       */
      scrollToRegion() {
        const zoomedIn = self.object.zoomScale > 1;
        const canvas = self.shapeRef?.parent?.canvas?._canvas;
        let viewport = canvas;

        // `.lsf-main-content` is the main scrollable container for LSF
        while (viewport && !viewport.scrollTop && !viewport.className.includes('main-content')) {
          viewport = viewport.parentElement;
        }
        if (!viewport) return;

        // minimum percent of region area to consider it visible
        const VISIBLE_AREA = 0.6;
        // infobar is positioned absolutely, covering part of UI
        const INFOBAR_HEIGHT = 36;

        const vBBox = viewport.getBoundingClientRect();
        const cBBox = canvas.getBoundingClientRect();
        // bbox inside canvas; for zoomed images calculations are tough,
        // so we use the whole image so it should be visible enough at the end
        const rBBox = zoomedIn ? { top: 0, bottom: cBBox.height } : self.bboxCoordsCanvas;
        const height = rBBox.bottom - rBBox.top;
        // comparing the closest point of region from top or bottom image edge
        // and how deep is this edge hidden behind respective edge of viewport
        const overTop = rBBox.top - (vBBox.top - cBBox.top);
        const overBottom = (canvas.clientHeight - rBBox.bottom) - (cBBox.bottom - vBBox.bottom) - INFOBAR_HEIGHT;
        // huge images should be scrolled to the closest edge, not to hidden one
        const isHuge = zoomedIn && canvas.clientHeight > viewport.clientHeight;

        // huge region or image cut off by viewport edges — do nothing
        if (overTop < 0 && overBottom < 0) return;

        if (overTop < 0 && -overTop / height > (1 - VISIBLE_AREA)) {
          // if image is still visible enough — don't scroll
          if (zoomedIn && (cBBox.bottom - vBBox.top) / viewport.clientHeight > (1 - VISIBLE_AREA)) return;
          viewport.scrollBy({ top: isHuge ? -overBottom : overTop, left: 0, behavior: 'smooth' });
        } else if (overBottom < 0 && -overBottom / height > (1 - VISIBLE_AREA)) {
          // if image is still visible enough — don't scroll
          if (zoomedIn && (vBBox.bottom - cBBox.top) / viewport.clientHeight > (1 - VISIBLE_AREA)) return;
          viewport.scrollBy({ top: isHuge ? overTop : -overBottom, left: 0, behavior: 'smooth' });
        }
      },

      onClickRegion(e) {
        const annotation = self.annotation;
        const ev = e?.evt || e;
        const additiveMode = ev?.ctrlKey || ev?.metaKey;

        if (e) e.cancelBubble = true;

        if (isFF(FF_DBLCLICK_DELAY)) {
          const isDoubleClick = ev.detail === 2;

          if (isDoubleClick) {
            self.onDoubleClickRegion();
            return;
          }
        }

        const selectAction = () => {
          self._selectArea(additiveMode);
          deferredSelectId = null;
        };

        if (!annotation.isReadOnly() && annotation.relationMode) {
          annotation.addRelation(self);
          annotation.stopRelationMode();
          annotation.regionStore.unselectAll();
        } else {
          if (isFF(FF_DBLCLICK_DELAY)) {
            self._selectArea(additiveMode);
          } else {
            // Skip double click emulation when there is nothing to focus
            if (!self.perRegionFocusTarget) {
              selectAction();
              return;
            }
            // Double click emulation
            if (deferredSelectId) {
              clearTimeout(deferredSelectId);
              self.requestPerRegionFocus();
              deferredSelectId = null;
              annotation.selectArea(self);
            } else {
              deferredSelectId = setTimeout(selectAction, 300);
            }
          }
        }
      },
      onDoubleClickRegion() {
        self.requestPerRegionFocus();
        // `selectArea` does nothing when there's a selected region already, but it should rerender to make `requestPerRegionFocus` work,
        // so it needs to use `selectAreas` instead. It contains `unselectAll` for this purpose.
        self.annotation.selectAreas([self]);
      },
    };
  });
