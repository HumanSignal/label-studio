import {types} from "mobx-state-tree";
import {Range} from "../common/Range/Range";
import Canvas from "../utils/canvas";
import React from "react";
import {clamp} from "../utils/utilities";
import ToolMixin from "./Tool";
import BaseTool from "../tools/Base";
import {DrawingTool} from "./DrawingTool";


const MIN_SIZE = 1;
const MAX_SIZE = 50;
const MAX_CURSOR_SIZE = 120;  // Maximum value sie because any bigger than 128x128 pixels is ignored.
const STROKE_PREFIX = "stroke-tool-";


const setLocalStorageNumber = (key, value, minValue, maxValue, defaultValue, updateIfValid = true) => {

  const _key = STROKE_PREFIX + key;

  if ( isNaN(value) || value < minValue || value > maxValue) {  // Use default value if value is not valid.
    window.localStorage.setItem(_key, defaultValue.toString());
    return defaultValue;
  }

  if (updateIfValid) {
    window.localStorage.setItem(_key, value.toString());
  }

  return value;
}



const getLocalStorageNumber = (key, defaultNumber, minValue, maxValue) => {

  const parsedValue = parseFloat(window.localStorage.getItem(STROKE_PREFIX + key));

  if ( isNaN(parsedValue) || parsedValue < minValue || parsedValue > maxValue ) return defaultNumber;

  return parsedValue;
}


const getLocalStrokeWidth = (toolKey, defaultSize) => {
  return getLocalStorageNumber(toolKey + '-width', defaultSize, MIN_SIZE, MAX_SIZE);
}

const setLocalStrokeWidth = (toolKey, value) => {
  return setLocalStorageNumber(toolKey + '-width', value, MIN_SIZE, MAX_SIZE, MIN_SIZE, true);
}

const getLocalActiveBrushOpacity = (toolKey) => {
  return getLocalStorageNumber(toolKey + '-opacity', 0.6, 0.0, 1.0);
}

const setLocalActiveBrushOpacity = (toolKey, value) => {
  return setLocalStorageNumber(toolKey + '-opacity', value, 0.0, 1.0, 0.6, true);
}


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

const OpacityDot = ({ opacity }) => {
  return (
    <span style={{
      display: 'block',
      width: 16,
      height: 16,
      background: `rgba(0, 0, 0, ${opacity})`,
      borderRadius: '100%',
    }}/>
  );
};


const _Tool = types
  .model('StrokeTool', {
    strokeWidth: types.optional(types.number, 10),
    strokeIncrement: types.optional(types.number, 5),
    fineStrokes: types.optional(types.array(types.number),  [10, 9, 8, 7, 6, 5, 4.5, 4, 3.5, 3, 2.5, 2, 1.5, 1]),
    controlKey: types.optional(types.string, 'tool-size'),
    unselectRegionOnToolChange: false,
    activeBrushOpacity: types.optional(types.number, -1),
    _defaultBrushOpacity: types.optional(types.number, -1)
  })
  .views(self => ({
    get controls() {
      const controls = [
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
      if (!self.annotation.store.settings.enableActiveRegionOpacity) return controls;
      // TODO change the slider opacity value based on true opacity.
      controls.unshift(
        <Range
          key={'opacity'}
          value={self.activeBrushOpacity}
          min={0.0}
          max={1.0}
          step={0.05}
          reverse
          align="vertical"
          minIcon={<OpacityDot opacity={0.1}/>}
          maxIcon={<OpacityDot opacity={0.9}/> }
          onChange={(value) => {
            self.setActiveBrushOpacity(value)
          }}
        />
      )
      return controls;

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
    },

    get useRegionOpacity () {
      return self.annotation.store.settings.enableActiveRegionOpacity;
    },

    get defaultRegionOpacity () {
      if (self._defaultBrushOpacity === -1) return 0.6;
      return self._defaultBrushOpacity;
    }

  }))
  .actions((self) => {
    return {

      updateCursor() {
        if (!self.selected || !self.obj?.stageRef) return;
        let val = self.strokeWidth;
        if (self.obj?.zoomScale) {
          val *= self.obj.zoomScale;  // Multiply val by zoom scale.
        }
        const stage = self.obj.stageRef;
        const icon = Canvas.brushSizeCircle(val);
        const cursor = ['url(\'', icon.base64, '\')', ' ', icon.x, ' ',icon.y, ', auto'];
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
        setLocalStrokeWidth(self.controlKey, strokeWidth);
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
      },

      setLastAnnotationIfNull () {
        if (self.getSelectedShape !== null) {
          return;  // No need to set annotation.
        }
        const regionStore = self.control.annotation.regionStore;

        const regions = regionStore.filteredRegions;
        let lastRegion = null;
        regions.forEach(region => {
          if (lastRegion === null || region.ouid > lastRegion.ouid) {
            lastRegion = region;
          }
        });
        if (lastRegion === null) return;  // Unable to set region.
        regionStore.selectRegionsByIds([lastRegion.id]);
      },

      setDefaultRegionOpacity (value) {
        if (self._defaultBrushOpacity !== -1) return;  // Default is already set.
        self._defaultBrushOpacity = value;
      },

      setActiveBrushOpacity (value) {
        if ( !self.useRegionOpacity ) return;
        self.activeBrushOpacity = setLocalActiveBrushOpacity(self.controlKey, value);
      },

      updateRegionOpacity (region, active) {
        if ( !self.useRegionOpacity ) return;  // Ignore.
        if ( active ) {
          self.setDefaultRegionOpacity(region.opacity);  // Store default region opacity.
          region.setOpacity(self.activeBrushOpacity);
        } else {
          region.setOpacity(self.defaultRegionOpacity);  // Restore default opacity.
        }
      }
    }
  });


const StrokeTool = types.compose(_Tool.name, ToolMixin, BaseTool, DrawingTool, _Tool);


export { StrokeTool, getLocalStrokeWidth, getLocalActiveBrushOpacity, setLocalStrokeWidth, setLocalActiveBrushOpacity};

