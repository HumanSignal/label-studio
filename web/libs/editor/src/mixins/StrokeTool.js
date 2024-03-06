import {types} from "mobx-state-tree";
import {Range} from "../common/Range/Range";
import Canvas from "../utils/canvas";
import React from "react";
import {clamp} from "../utils/utilities";


const MIN_SIZE = 1;
const MAX_SIZE = 50;


const IconDot = ({ size }) => {
  return (
    <span style={{
      display: 'block',
      width: size,
      height: size,
      background: 'rgba(0, 0, 0, 0.25)',
      borderRadius: '100%',
    }}/>
  );
};

const StrokeTool = types
  .model('StrokeTool', {
    strokeWidth: types.optional(types.number, 10),
    strokeIncrement: types.optional(types.number, 5),
    fineStrokes: types.optional(types.array(types.number),  [10, 9, 8, 7, 6, 5, 4.5, 4, 3.5, 3, 2.5, 2, 1.5, 1]),
    controlKey: types.optional(types.string, 'tool-size'),
    unselectRegionOnToolChange: false,
  })
  .views(self => ({
    get controls() {
      return [
        <Range
          key={self.controlKey}
          value={self.strokeWidth}
          min={MIN_SIZE}
          max={MAX_SIZE}
          reverse
          align="vertical"
          minIcon={<IconDot size={8}/>}
          maxIcon={<IconDot size={16}/>}
          onChange={(value) => {
            self.setStroke(value);
          }}
        />,
      ];
    },

    get extraShortcuts() {
      return {
        '[': ['Decrease size', () => {
          self.decreaseStroke();
        }],
        ']': ['Increase size', () => {
          self.increaseStroke();
        }],
      };
    },

    get hasFineStrokes () {
      return self.fineStrokes.length > 0;
    }

  }))
  .actions(self => {

    return {

      updateCursor() {
        if (!self.selected || !self.obj?.stageRef) return;
        let val = self.strokeWidth;
        if (self.obj?.zoomScale) {
          val *= self.obj.zoomScale;  // Multiply val by zoom scale.
        }
        let dashes = 0;
        const MAX_SIZE = 120;  // Maximum value sie because any bigger and the cursor won't be set correctly.
        if (val > 120) {
          // Cap value at 120 for cursor pixels.
          dashes = Math.floor(Math.max(16, val - MAX_SIZE) / 2);
          val = MAX_SIZE;
        }
        const stage = self.obj.stageRef;
        const base64 = Canvas.brushSizeCircle(val, dashes);
        const cursor = ['url(\'', base64, '\')', ' ', Math.floor(val / 2) + 4, ' ', Math.floor(val / 2) + 4, ', auto'];
        stage.container().style.cursor = cursor.join('');
      },

      afterUpdateSelected() {
        self.updateCursor();
      },

      setStroke(val) {
        let newStrokeValue = -1;
         if (self.hasFineStrokes && val < self.fineStrokes[0]) {
          // Find the closest matching fine stroke to the given value.
          let distance = MAX_SIZE;
          for (let i = 0; i < self.fineStrokes.length; i++) {
            const stroke = self.fineStrokes[i];
            const currentDistance = Math.abs(val - stroke);
            if (currentDistance === 0) {
              newStrokeValue = stroke;  // Found the correct stroke. Break early
              break;
            } else if (currentDistance <= distance) {
              distance = currentDistance;
              newStrokeValue = stroke;
            }
          }
        } else {
          newStrokeValue = val;
        }

        const strokeWidth = clamp(newStrokeValue, MIN_SIZE, MAX_SIZE);  // Clamp stroke width
        const cursorNeedsUpdate = self.strokeWidth !== strokeWidth;
        self.strokeWidth = strokeWidth;
        if (cursorNeedsUpdate) this.updateCursor();
      },

      increaseStroke() {
        const fineStrokeIndex = self.fineStrokes.indexOf(self.strokeWidth);
        if (fineStrokeIndex <= 0) {
          self.setStroke(self.strokeWidth + self.strokeIncrement);
        } else {
          self.setStroke(self.fineStrokes[fineStrokeIndex - 1]);  // Increment stroke.
        }
      },

      decreaseStroke() {
        const fineStrokeIndex = self.fineStrokes.indexOf(self.strokeWidth);
        if (fineStrokeIndex < 0) {
          const strokeWidth = self.strokeWidth - self.strokeIncrement;
          if (self.fineStrokes.length > 0 && strokeWidth <= self.fineStrokes[0]) {
            self.setStroke(self.fineStrokes[0]);
          } else {
            self.setStroke(strokeWidth);
          }
        } else {
          self.setStroke(self.fineStrokes[Math.min(fineStrokeIndex + 1, self.fineStrokes.length - 1)]);
        }
      },

      requestCursorUpdate () {
        const cursor = self.obj?.stageRef?.container().style.cursor;
        if (cursor !== 'default') return;  // No update.
        self.updateCursor();
      }
    }
  });

export { StrokeTool };

