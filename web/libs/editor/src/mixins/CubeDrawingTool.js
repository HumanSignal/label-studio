import { types } from 'mobx-state-tree';

import Utils from '../utils';
import throttle from 'lodash.throttle';
import { MIN_SIZE } from '../tools/Base';
import { FF_DEV_3666, FF_DEV_3793, isFF } from '../utils/feature-flags';
import { RELATIVE_STAGE_HEIGHT, RELATIVE_STAGE_WIDTH } from '../components/Object3DView/Object3D';

const DrawingTool = types
  .model('DrawingTool', {
    default: true,
    mode: types.optional(types.enumeration(['drawing', 'viewing']), 'viewing'),
    unselectRegionOnToolChange: true,
  })
  .volatile(() => {
    return {
      currentArea: null,
    };
  })
  .views(self => {
    return {
      createRegionOptions(opts) {
        return {
          ...opts,
          coordstype: 'px',
        };
      },
      get tagTypes() {
        console.error('Drawing tool model needs to implement tagTypes getter in views');
        return {};
      },
      isIncorrectControl() {
        return self.tagTypes.stateTypes === self.control.type && !self.control.isSelected;
      },
      isIncorrectLabel() {
        return !self.obj.checkLabels();
      },
      get isDrawing() {
        return self.mode === 'drawing';
      },
      get getActiveShape() {
        return self.currentArea;
      },
      getCurrentArea() {
        return self.currentArea;
      },
      current() {
        return self.currentArea;
      },
      canStart() {
        return !self.isDrawing && !self.annotation.isReadOnly();
      },
      get defaultDimensions() {
        console.warn('Drawing tool model needs to implement defaultDimentions getter in views');
        return {};
      },
      get MIN_SIZE() {
        if (isFF(FF_DEV_3793)) {
          return {
            X: MIN_SIZE.X / self.obj.stageScale / self.obj.stageWidth * RELATIVE_STAGE_WIDTH,
            Y: MIN_SIZE.Y / self.obj.stageScale / self.obj.stageHeight * RELATIVE_STAGE_HEIGHT,
          };
        }

        return {
          X: MIN_SIZE.X / self.obj.stageScale,
          Y: MIN_SIZE.Y / self.obj.stageScale,
        };
      },
    };
  })
  .actions(self => {
    let lastClick = {
      ts: 0,
      x: 0,
      y: 0,
    };

    return {
      event(name, ev, [x, y, canvasX, canvasY]) {
        // filter right clicks and middle clicks and shift pressed
        if (ev.button > 0 || ev.shiftKey) return;
        let fn = name + 'Ev';

        if (typeof self[fn] !== 'undefined') self[fn].call(self, ev, [x, y], [canvasX, canvasY]);

        // Emulating of dblclick event, 'cause redrawing will crush the the original one
        if (name === 'click') {
          const ts = ev.timeStamp;

          if (ts - lastClick.ts < 300 && self.comparePointsWithThreshold(lastClick, { x, y })) {
            fn = 'dbl' + fn;
            if (typeof self[fn] !== 'undefined') self[fn].call(self, ev, [x, y], [canvasX, canvasY]);
          }
          lastClick = { ts, x, y };
        }
      },

      comparePointsWithThreshold(p1, p2, threshold = { x: self.MIN_SIZE.X, y: self.MIN_SIZE.Y }) {
        if (!p1 || !p2) return;
        if (typeof threshold === 'number') threshold = { x: threshold, y: threshold };
        return Math.abs(p1.x - p2.x) < threshold.x && Math.abs(p1.y - p2.y) < threshold.y;
      },
    };
  })
  .actions(self => {
    return {
      createDrawingRegion(opts) {
        const control = self.control;
        const resultValue = control.getResultValue();

        self.currentArea = self.obj.createDrawingRegion(opts, resultValue, control, false);
        self.currentArea.setDrawing(true);

        self.applyActiveStates(self.currentArea);
        self.annotation.setIsDrawing(true);
        return self.currentArea;
      },
      resumeUnfinishedRegion(existingUnclosedPolygon) {
        self.currentArea = existingUnclosedPolygon;
        self.currentArea.setDrawing(true);
        self.annotation.regionStore.selection._updateResultsFromRegions([self.currentArea]);
        self.mode = 'drawing';
        self.annotation.setIsDrawing(true);
        self.annotation.regionStore.selection.drawingSelect(self.currentArea);
        self.listenForClose?.();
      },
      commitDrawingRegion() {
        const { currentArea, control, obj } = self;

        if (!currentArea) return;
        const source = currentArea.toJSON();
        const value = Object.keys(currentArea.serialize().value).reduce((value, key) => {
          value[key] = source[key];
          return value;
        }, { coordstype: 'px', dynamic: self.dynamic });

        const [main, ...rest] = currentArea.results;
        const newArea = self.annotation.createResult(value, main.value.toJSON(), control, obj);

        //when user is using two different labels tag to draw a region, the other labels will be added to the region
        rest.forEach(r => newArea.addResult(r.toJSON()));

        currentArea.setDrawing(false);
        self.deleteRegion();
        newArea.notifyDrawingFinished();
        return newArea;
      },
      createRegion(opts, skipAfterCreate = false) {
        const control = self.control;
        const resultValue = control.getResultValue();

        self.currentArea = self.annotation.createResult(opts, resultValue, control, self.obj, skipAfterCreate);
        self.applyActiveStates(self.currentArea);
        return self.currentArea;
      },
      deleteRegion() {
        self.currentArea = null;
        self.obj.deleteDrawingRegion();
      },
      applyActiveStates(area) {
        const activeStates = self.obj.activeStates();

        activeStates.forEach(state => {
          area.setValue(state);
        });
      },

      beforeCommitDrawing() {
        return true;
      },

      canStartDrawing() {
        return !self.isIncorrectControl()
          && (!isFF(FF_DEV_3666) || !self.isIncorrectLabel())
          && self.canStart()
          && !self.annotation.isDrawing;
      },

      startDrawing(x, y) {
        self.annotation.history.freeze();
        self.mode = 'drawing';
        self.currentArea = self.createDrawingRegion(self.createRegionOptions({ x, y }));
      },
      finishDrawing() {
        if (!self.beforeCommitDrawing()) {
          self.deleteRegion();
          if (self.control.type === self.tagTypes.stateTypes) self.annotation.unselectAll(true);
          self._resetState();
        } else {
          self._finishDrawing();
        }
      },
      _finishDrawing() {
        self.commitDrawingRegion();
        self._resetState();
      },
      _resetState() {
        self.annotation.setIsDrawing(false);
        self.annotation.history.unfreeze();
        self.mode = 'viewing';
      },
    };
  });

const TwoPointsDrawingTool = DrawingTool.named('TwoPointsDrawingTool')
  .views(self => ({
    get defaultDimensions() {
      return {
        width: self.MIN_SIZE.X,
        height: self.MIN_SIZE.Y,
      };
    },
  }))
  .actions(self => {
    const DEFAULT_MODE = 0;
    const DRAG_MODE = 1;
    const TWO_CLICKS_MODE = 2;
    let currentMode = DEFAULT_MODE;
    let modeAfterMouseMove = DEFAULT_MODE;
    let startPoint = null;
    let endPoint = { x: 0, y: 0 };
    const Super = {
      finishDrawing: self.finishDrawing,
    };

    return {
      updateDraw: throttle(function(x, y) {
        if (currentMode === DEFAULT_MODE) return;
        self.draw(x, y);
      }, 48), // 3 frames, optimized enough and not laggy yet

      draw(x, y) {
        const shape = self.getCurrentArea();

        if (!shape) return;
        const isEllipse = shape.type.includes('ellipse');
        const maxStageWidth = isFF(FF_DEV_3793) ? RELATIVE_STAGE_WIDTH : self.obj.stageWidth;
        const maxStageHeight = isFF(FF_DEV_3793) ? RELATIVE_STAGE_HEIGHT : self.obj.stageHeight;

        let { x1, y1, x2, y2 } = isEllipse ? {
          x1: shape.startX,
          y1: shape.startY,
          x2: x,
          y2: y,
        } : Utils.Object3D.reverseCoordinates({ x: shape.startX, y: shape.startY }, { x, y });

        x1 = Math.max(0, x1);
        y1 = Math.max(0, y1);
        x2 = Math.min(maxStageWidth, x2);
        y2 = Math.min(maxStageHeight, y2);

        let [distX, distY] = [x2 - x1, y2 - y1].map(Math.abs);

        if (isEllipse) {
          distX = Math.min(distX, Math.min(x1, maxStageWidth - x1));
          distY = Math.min(distY, Math.min(y1, maxStageHeight - y1));
        }

        shape.setPositionInternal(x1, y1, distX, distY, shape.rotation);
      },

      finishDrawing(x, y) {
        startPoint = null;
        Super.finishDrawing(x, y);
        currentMode = DEFAULT_MODE;
        modeAfterMouseMove = DEFAULT_MODE;
      },

      mousedownEv(_, [x, y]) {
        if (!self.canStartDrawing()) return;
        startPoint = { x, y };
        if (currentMode === DEFAULT_MODE) {
          modeAfterMouseMove = DRAG_MODE;
        }
      },

      mousemoveEv(_, [x, y]) {
        if (currentMode === DEFAULT_MODE && startPoint) {
          if (!self.comparePointsWithThreshold(startPoint, { x, y })) {
            currentMode = modeAfterMouseMove;
            if ([DRAG_MODE, TWO_CLICKS_MODE].includes(currentMode)) {
              self.startDrawing(startPoint.x, startPoint.y);
              if (!self.isDrawing) {
                currentMode = DEFAULT_MODE;
                return;
              }
            }
          }
        }
        if (!self.isDrawing) return;
        if ([DRAG_MODE, TWO_CLICKS_MODE].includes(currentMode)) {
          self.updateDraw(x, y);
        }
      },

      mouseupEv(_, [x, y]) {
        if (currentMode !== DRAG_MODE) return;
        endPoint = { x, y };
        if (!self.isDrawing) return;
        self.draw(x, y);
        self.finishDrawing(x, y);
      },

      clickEv(_, [x, y]) {
        if (!self.canStartDrawing()) return;
        // @todo: here is a potential problem with endPoint
        // it may be incorrect due to it may be not set at this moment
        if (startPoint && endPoint && !self.comparePointsWithThreshold(startPoint, endPoint)) return;
        if (currentMode === DEFAULT_MODE) {
          modeAfterMouseMove = TWO_CLICKS_MODE;
        } else if (self.isDrawing && currentMode === TWO_CLICKS_MODE) {
          self.draw(x, y);
          self.finishDrawing(x, y);
          currentMode = DEFAULT_MODE;
        }
      },

      dblclickEv(_, [x, y]) {
        if (!self.canStartDrawing()) return;

        let dX = self.defaultDimensions.width;
        let dY = self.defaultDimensions.height;

        if (isFF(FF_DEV_3793)) {
          dX = self.obj.canvasToInternalX(dX);
          dY = self.obj.canvasToInternalY(dY);
        }

        if (currentMode === DEFAULT_MODE) {
          self.startDrawing(x, y);
          if (!self.isDrawing) return;
          x += dX;
          y += dY;
          self.draw(x, y);
          self.finishDrawing(x, y);
        }
      },
    };
  });

const MultipleClicksDrawingTool = DrawingTool.named('MultipleClicksMixin')
  .views(() => ({
    canStart() {
      return !this.current();
    },
  }))
  .actions(self => {
    let startPoint = { x: 0, y: 0 };
    let pointsCount = 0;
    let lastPoint = { x: -1, y: -1 };
    let lastEvent = 0;
    const MOUSE_DOWN_EVENT = 1;
    const MOUSE_UP_EVENT = 2;
    const CLICK_EVENT = 3;
    let lastClickTs = 0;
    const Super = {
      canStartDrawing: self.canStartDrawing,
    };

    return {
      canStartDrawing() {
        return Super.canStartDrawing() && !self.annotation.regionStore.hasSelection;
      },
      nextPoint(x, y) {
        const area = self.getCurrentArea();
        const object = self.obj;

        if (area && object && object.multiObject3D && area.item_index !== object.currentObject3D) return;

        self.getCurrentArea().addPoint(x, y);
        pointsCount++;
      },
      listenForClose() {
        console.error('MultipleClicksMixin model needs to implement listenForClose method in actions');
      },
      closeCurrent() {
        console.error('MultipleClicksMixin model needs to implement closeCurrent method in actions');
      },
      finishDrawing() {
        if (!self.isDrawing) return;

        self.annotation.regionStore.selection.drawingUnselect();

        pointsCount = 0;
        self.closeCurrent();
        setTimeout(() => {
          self._finishDrawing();
        });
      },
      cleanupUncloseableShape() {
        self.deleteRegion();
        if (self.control.type === self.tagTypes.stateTypes) self.annotation.unselectAll(true);
        self._resetState();
      },
      mousedownEv(ev, [x, y]) {
        lastPoint = { x, y };
        lastEvent = MOUSE_DOWN_EVENT;
      },
      mouseupEv(ev, [x, y]) {
        if (lastEvent === MOUSE_DOWN_EVENT && self.comparePointsWithThreshold(lastPoint, { x, y })) {
          self._clickEv(ev, [x, y]);
          lastEvent = MOUSE_UP_EVENT;
        }
        lastPoint = { x: -1, y: -1 };
      },
      clickEv(ev, [x, y]) {
        if (lastEvent !== MOUSE_UP_EVENT) {
          self._clickEv(ev, [x, y]);
        }
        lastEvent = CLICK_EVENT;
        lastPoint = { x: -1, y: -1 };
      },
      _clickEv(ev, [x, y]) {
        if (self.current()) {
          if (
            pointsCount === 1 &&
            self.comparePointsWithThreshold(startPoint, { x, y }) &&
            ev.timeStamp - lastClickTs < 350
          ) {
            // dblclick
            self.drawDefault();
          } else {
            if (self.comparePointsWithThreshold(startPoint, { x, y })) {
              if (pointsCount > 2) {
                self.finishDrawing();
              }
            } else {
              self.nextPoint(x, y);
            }
          }
        } else {
          if (!self.canStartDrawing()) return;
          startPoint = { x, y };
          pointsCount = 1;
          lastClickTs = ev.timeStamp;
          self.startDrawing(x, y);
          self.listenForClose();
        }
      },

      drawDefault() {
        const { x, y } = startPoint;
        let dX = self.defaultDimensions.length;
        let dY = self.defaultDimensions.length;

        if (isFF(FF_DEV_3793)) {
          dX = self.obj.canvasToInternalX(dX);
          dY = self.obj.canvasToInternalY(dY);
        }

        self.nextPoint(x + dX, y);
        self.nextPoint(
          x + dX / 2,
          y + Math.sin(Math.PI / 3) * dY,
        );
        self.finishDrawing();
      },
    };
  });

const ThreePointsDrawingTool = DrawingTool.named('ThreePointsDrawingTool')
  .views((self) => ({
    canStart() {
      return !this.current();
    },
    get defaultDimensions() {
      return {
        width: self.MIN_SIZE.X,
        height: self.MIN_SIZE.Y,
      };
    },
  }))
  .actions(self => {
    let points = [];
    let lastEvent = 0;
    const DEFAULT_MODE = 0;
    const MOUSE_DOWN_EVENT = 1;
    const MOUSE_UP_EVENT = 2;
    const CLICK_EVENT = 3;
    const DRAG_MODE = 4;
    const DBL_CLICK_EVENT = 5;
    let currentMode = DEFAULT_MODE;
    let startPoint = null;
    const Super = {
      finishDrawing: self.finishDrawing,
    };

    return {
      canStartDrawing() {
        return !self.isIncorrectControl();
      },
      updateDraw: (x, y) => {
        if (currentMode === DEFAULT_MODE)
          self.getCurrentArea()?.draw(x, y, points);
        else if (currentMode === DRAG_MODE)
          self.draw(x, y);
      },

      nextPoint(x, y) {
        points.push({ x, y });
        self.getCurrentArea().draw(x, y, points);
      },
      draw(x, y) {
        const shape = self.getCurrentArea();

        if (!shape) return;
        const maxStageWidth = isFF(FF_DEV_3793) ? RELATIVE_STAGE_WIDTH : self.obj.stageWidth;
        const maxStageHeight = isFF(FF_DEV_3793) ? RELATIVE_STAGE_HEIGHT : self.obj.stageHeight;

        let { x1, y1, x2, y2 } = Utils.Object3D.reverseCoordinates({ x: shape.startX, y: shape.startY }, { x, y });

        x1 = Math.max(0, x1);
        y1 = Math.max(0, y1);
        x2 = Math.min(maxStageWidth, x2);
        y2 = Math.min(maxStageHeight, y2);

        shape.setPositionInternal(x1, y1, x2 - x1, y2 - y1, shape.rotation);
      },

      finishDrawing(x, y) {
        if (self.isDrawing) {
          points = [];
          startPoint = null;
          currentMode = DEFAULT_MODE;
          Super.finishDrawing(x, y);
          setTimeout(() => {
            self._finishDrawing();
          });
        } else return;
      },

      mousemoveEv(_, [x, y]) {
        if (self.isDrawing) {
          if (lastEvent === MOUSE_DOWN_EVENT) {
            currentMode = DRAG_MODE;
          }

          if (currentMode === DRAG_MODE && startPoint) {
            self.startDrawing(startPoint.x, startPoint.y);
            self.updateDraw(x, y);
          } else if (currentMode === DEFAULT_MODE) {
            self.updateDraw(x, y);
          }
        }
      },
      mousedownEv(ev, [x, y]) {
        if (!self.canStartDrawing() || self.annotation.isDrawing) return;
        lastEvent = MOUSE_DOWN_EVENT;
        startPoint = { x, y };
        self.mode = 'drawing';
      },
      mouseupEv(ev, [x, y]) {
        if (!self.canStartDrawing()) return;
        if (self.isDrawing) {
          if (currentMode === DRAG_MODE) {
            self.draw(x, y);
            self.finishDrawing(x, y);
          }
          lastEvent = MOUSE_UP_EVENT;
        }
      },
      clickEv(ev, [x, y]) {
        if (!self.canStartDrawing()) return;
        if (currentMode === DEFAULT_MODE) {
          self._clickEv(ev, [x, y]);
        }
        lastEvent = CLICK_EVENT;
      },
      _clickEv(ev, [x, y]) {
        if (points.length >= 2) {
          self.finishDrawing(x, y);
        } else if (points.length === 0) {
          points = [{ x, y }];
          self.startDrawing(x, y);
        } else {
          self.nextPoint(x, y);
        }
      },

      dblclickEv(_, [x, y]) {
        lastEvent = DBL_CLICK_EVENT;
        if (!self.canStartDrawing()) return;

        let dX = self.defaultDimensions.width;
        let dY = self.defaultDimensions.height;

        if (isFF(FF_DEV_3793)) {
          dX = self.obj.canvasToInternalX(dX);
          dY = self.obj.canvasToInternalY(dY);
        }

        if (currentMode === DEFAULT_MODE) {
          self.startDrawing(x, y);
          if (!self.isDrawing) return;
          x += dX;
          y += dY;
          self.draw(x, y);
          self.finishDrawing(x, y);
        }
      },
    };
  });

export { DrawingTool, TwoPointsDrawingTool, MultipleClicksDrawingTool };
