import React, { Fragment, useContext } from 'react';
import { Circle } from 'react-konva';
import { getRoot, types } from 'mobx-state-tree';

import Registry from '../core/Registry';
import NormalizationMixin from '../mixins/Normalization';
import RegionsMixin from '../mixins/Regions';

import { ImageViewContext } from '../components/ImageView/ImageViewContext';
import { LabelOnKP } from '../components/ImageView/LabelOnRegion';
import { guidGenerator } from '../core/Helpers';
import { useRegionStyles } from '../hooks/useRegionColor';
import { AreaMixin } from '../mixins/AreaMixin';
import { KonvaRegionMixin } from '../mixins/KonvaRegion';
import { ImageModel } from '../tags/object/Image';
import { FF_DEV_3793, isFF } from '../utils/feature-flags';
import { createDragBoundFunc } from '../utils/image';
import { AliveRegion } from './AliveRegion';
import { EditableRegion } from './EditableRegion';
import { RELATIVE_STAGE_HEIGHT, RELATIVE_STAGE_WIDTH } from '../components/ImageView/Image';

const KeyPointRegionAbsoluteCoordsDEV3793 = types
  .model({
    coordstype: types.optional(types.enumeration(['px', 'perc']), 'perc'),
  })
  .volatile(() => ({
    relativeX: 0,
    relativeY: 0,
  }))
  .actions(self => ({
    afterCreate() {
      if (self.coordstype === 'perc') {
        // deserialization
        self.relativeX = self.x;
        self.relativeY = self.y;
        self.checkSizes();
      } else {
        // creation
        const { stageWidth: width, stageHeight: height } = self.parent;

        if (width && height) {
          self.relativeX = (self.x / width) * RELATIVE_STAGE_WIDTH;
          self.relativeY = (self.y / height) * RELATIVE_STAGE_HEIGHT;
        }
      }
    },

    setPosition(x, y) {
      self.x = x;
      self.y = y;

      self.relativeX = (x / self.parent.stageWidth) * RELATIVE_STAGE_WIDTH;
      self.relativeY = (y / self.parent.stageHeight) * RELATIVE_STAGE_HEIGHT;
    },

    updateImageSize(wp, hp, sw, sh) {
      if (self.coordstype === 'px') {
        self.x = (sw * self.relativeX) / RELATIVE_STAGE_WIDTH;
        self.y = (sh * self.relativeY) / RELATIVE_STAGE_HEIGHT;
      }

      if (self.coordstype === 'perc') {
        self.x = (sw * self.x) / RELATIVE_STAGE_WIDTH;
        self.y = (sh * self.y) / RELATIVE_STAGE_HEIGHT;
        self.width = (sw * self.width) / RELATIVE_STAGE_WIDTH;
        self.coordstype = 'px';
      }
    },
  }));

const Model = types
  .model({
    id: types.optional(types.identifier, guidGenerator),
    pid: types.optional(types.string, guidGenerator),
    type: 'keypointregion',
    object: types.late(() => types.reference(ImageModel)),

    x: types.number,
    y: types.number,

    width: types.number,
    negative: false,
  })
  .volatile(() => ({
    hideable: true,
    _supportsTransform: true,
    useTransformer: false,
    supportsRotate: false,
    supportsScale: false,
    editableFields: [
      { property: 'x', label: 'X' },
      { property: 'y', label: 'Y' },
    ],
  }))
  .views(self => ({
    get store() {
      return getRoot(self);
    },
    get bboxCoords() {
      return {
        left: self.x - self.width,
        top: self.y - self.width,
        right: self.x + self.width,
        bottom: self.y + self.width,
      };
    },
    get canvasX() {
      return isFF(FF_DEV_3793) ? self.parent.internalToCanvasX(self.x) : self.x;
    },
    get canvasY() {
      return isFF(FF_DEV_3793) ? self.parent.internalToCanvasY(self.y) : self.y;
    },
    get canvasWidth() {
      return isFF(FF_DEV_3793) ? self.parent.internalToCanvasX(self.width) : self.width;
    },
  }))
  .actions(self => ({
    setPosition(x, y) {
      self.x = self.parent.canvasToInternalX(x);
      self.y = self.parent.canvasToInternalY(y);
    },

    updateImageSize() {},

    /**
     * @example
     * {
     *   "original_width": 1920,
     *   "original_height": 1280,
     *   "image_rotation": 0,
     *   "value": {
     *     "x": 3.1,
     *     "y": 8.2,
     *     "width": 2,
     *     "keypointlabels": ["Car"]
     *   }
     * }
     * @typedef {Object} KeyPointRegionResult
     * @property {number} original_width width of the original image (px)
     * @property {number} original_height height of the original image (px)
     * @property {number} image_rotation rotation degree of the image (deg)
     * @property {Object} value
     * @property {number} value.x x coordinate by percentage of the image size (0-100)
     * @property {number} value.y y coordinate by percentage of the image size (0-100)
     * @property {number} value.width point size by percentage of the image size (0-100)
     */

    /**
     * @return {KeyPointRegionResult}
     */
    serialize() {
      const value = {
        x: isFF(FF_DEV_3793) ? self.x : self.convertXToPerc(self.x),
        y: isFF(FF_DEV_3793) ? self.y : self.convertYToPerc(self.y),
        width: isFF(FF_DEV_3793) ? self.width : self.convertHDimensionToPerc(self.width),
      };

      const result = self.parent.createSerializedResult(self, value);

      if (self.dynamic) {
        result.is_positive = !self.negative;
        result.value.labels = self.labels;
      }

      return result;
    },
  }));

const KeyPointRegionModel = types.compose(
  'KeyPointRegionModel',
  RegionsMixin,
  AreaMixin,
  NormalizationMixin,
  KonvaRegionMixin,
  EditableRegion,
  Model,
  ...(isFF(FF_DEV_3793) ? [] : [KeyPointRegionAbsoluteCoordsDEV3793]),
);

const HtxKeyPointView = ({ item }) => {
  const { store } = item;
  const { suggestion } = useContext(ImageViewContext) ?? {};

  const regionStyles = useRegionStyles(item, {
    includeFill: true,
    defaultFillColor: '#000',
    defaultStrokeColor: '#fff',
    defaultOpacity: (item.style ?? item.tag) ? 0.6 : 1,
    // avoid size glitching when user select/unselect region
    sameStrokeWidthForSelected: true,
  });

  const props = {
    opacity: 1,
    fill: regionStyles.fillColor,
    stroke: regionStyles.strokeColor,
    strokeWidth: Math.max(1, regionStyles.strokeWidth),
    strokeScaleEnabled: false,
    shadowBlur: 0,
  };

  const stage = item.parent.stageRef;

  return (
    <Fragment>
      <Circle
        x={item.canvasX}
        y={item.canvasY}
        ref={el => item.setShapeRef(el)}
        // keypoint should always be the same visual size
        radius={Math.max(item.canvasWidth, 2) / item.parent.zoomScale}
        // fixes performance, but opactity+borders might look not so good
        perfectDrawEnabled={false}
        // for some reason this scaling doesn't work, so moved this to radius
        // scaleX={1 / item.parent.zoomScale}
        // scaleY={1 / item.parent.zoomScale}
        name={`${item.id} _transformable`}
        onDragStart={e => {
          if (item.parent.getSkipInteractions()) {
            e.currentTarget.stopDrag(e.evt);
            return;
          }
          item.annotation.history.freeze(item.id);
        }}
        onDragEnd={e => {
          const t = e.target;

          item.setPosition(t.getAttr('x'), t.getAttr('y'));
          item.annotation.history.unfreeze(item.id);
          item.notifyDrawingFinished();
        }}
        dragBoundFunc={createDragBoundFunc(item)}
        transformsEnabled="position"
        onTransformEnd={e => {
          const t = e.target;

          item.setPosition(
            t.getAttr('x'),
            t.getAttr('y'),
          );

          t.setAttr('scaleX', 1);
          t.setAttr('scaleY', 1);
        }}
        onMouseOver={() => {
          if (store.annotationStore.selected.relationMode) {
            item.setHighlight(true);
            stage.container().style.cursor = 'crosshair';
          } else {
            stage.container().style.cursor = 'pointer';
          }
        }}
        onMouseOut={() => {
          stage.container().style.cursor = 'default';

          if (store.annotationStore.selected.relationMode) {
            item.setHighlight(false);
          }
        }}
        onClick={e => {
          if (item.parent.getSkipInteractions()) return;

          if (store.annotationStore.selected.relationMode) {
            stage.container().style.cursor = 'default';
          }

          item.setHighlight(false);
          item.onClickRegion(e);
        }}
        {...props}
        draggable={!item.isReadOnly()}
        listening={!suggestion}
      />
      <LabelOnKP item={item} color={regionStyles.strokeColor}/>
    </Fragment>
  );
};

const HtxKeyPoint = AliveRegion(HtxKeyPointView);

Registry.addTag('keypointregion', KeyPointRegionModel, HtxKeyPoint);
Registry.addRegionType(
  KeyPointRegionModel,
  'image',
  value => 'x' in value && 'y' in value && 'width' in value && !('height' in value),
);

export { KeyPointRegionModel, HtxKeyPoint };
