import { Fragment, useContext } from "react";
import { Circle } from "react-konva";
import { getRoot, types } from "mobx-state-tree";

import Registry from "../core/Registry";
import NormalizationMixin from "../mixins/Normalization";
import RegionsMixin from "../mixins/Regions";

import { ImageViewContext } from "../components/ImageView/ImageViewContext";
import { LabelOnKP } from "../components/ImageView/LabelOnRegion";
import { guidGenerator } from "../core/Helpers";
import { useRegionStyles } from "../hooks/useRegionColor";
import { AreaMixin } from "../mixins/AreaMixin";
import { KonvaRegionMixin } from "../mixins/KonvaRegion";
import { ImageModel } from "../tags/object/Image";
import { createDragBoundFunc } from "../utils/image";
import { AliveRegion } from "./AliveRegion";
import { EditableRegion } from "./EditableRegion";
import Constants from "../core/Constants";

const Model = types
  .model({
    id: types.optional(types.identifier, guidGenerator),
    pid: types.optional(types.string, guidGenerator),
    type: "keypointregion",
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
      { property: "x", label: "X" },
      { property: "y", label: "Y" },
    ],
  }))
  .views((self) => ({
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
      return self.parent?.internalToCanvasX(self.x);
    },
    get canvasY() {
      return self.parent?.internalToCanvasY(self.y);
    },
    get canvasWidth() {
      return self.parent?.internalToCanvasX(self.width);
    },
  }))
  .actions((self) => ({
    setPosition(x, y) {
      const point = self.control?.getSnappedPoint({
        x: self.parent.canvasToInternalX(x),
        y: self.parent.canvasToInternalY(y),
      });

      self.x = point.x;
      self.y = point.y;
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
        x: self.x,
        y: self.y,
        width: self.width,
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
  "KeyPointRegionModel",
  RegionsMixin,
  AreaMixin,
  NormalizationMixin,
  KonvaRegionMixin,
  EditableRegion,
  Model,
);

const HtxKeyPointView = ({ item, setShapeRef }) => {
  const { store } = item;
  const { suggestion } = useContext(ImageViewContext) ?? {};

  const regionStyles = useRegionStyles(item, {
    includeFill: true,
    defaultFillColor: "#000",
    defaultStrokeColor: "#fff",
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

  const stage = item.parent?.stageRef;

  if (!item.parent) return null;
  if (!item.inViewPort) return null;

  return (
    <Fragment>
      <Circle
        x={item.canvasX}
        y={item.canvasY}
        ref={(el) => setShapeRef(el)}
        // keypoint should always be the same visual size
        radius={Math.max(item.canvasWidth, 2) / item.parent?.zoomScale}
        // fixes performance, but opactity+borders might look not so good
        perfectDrawEnabled={false}
        // for some reason this scaling doesn't work, so moved this to radius
        // scaleX={1 / item.parent.zoomScale}
        // scaleY={1 / item.parent.zoomScale}
        name={`${item.id} _transformable`}
        onDragStart={(e) => {
          if (item.parent.getSkipInteractions()) {
            e.currentTarget.stopDrag(e.evt);
            return;
          }
          item.annotation.history.freeze(item.id);
        }}
        onDragEnd={(e) => {
          const t = e.target;

          item.setPosition(t.getAttr("x"), t.getAttr("y"));
          t.setAttr("x", item.canvasX);
          t.setAttr("y", item.canvasY);
          item.annotation.history.unfreeze(item.id);
          item.notifyDrawingFinished();
        }}
        dragBoundFunc={createDragBoundFunc(item)}
        transformsEnabled="position"
        onTransformEnd={(e) => {
          const t = e.target;

          item.setPosition(t.getAttr("x"), t.getAttr("y"));

          t.setAttr("scaleX", 1);
          t.setAttr("scaleY", 1);
        }}
        onMouseOver={() => {
          if (store.annotationStore.selected.isLinkingMode) {
            item.setHighlight(true);
          }
          item.updateCursor(true);
        }}
        onMouseOut={() => {
          if (store.annotationStore.selected.isLinkingMode) {
            item.setHighlight(false);
          }
          item.updateCursor();
        }}
        onClick={(e) => {
          if (item.parent.getSkipInteractions()) return;

          if (store.annotationStore.selected.isLinkingMode) {
            stage.container().style.cursor = Constants.DEFAULT_CURSOR;
          }

          item.setHighlight(false);
          item.onClickRegion(e);
        }}
        {...props}
        draggable={!item.isReadOnly()}
        listening={!suggestion}
      />
      <LabelOnKP item={item} color={regionStyles.strokeColor} />
    </Fragment>
  );
};

const HtxKeyPoint = AliveRegion(HtxKeyPointView);

Registry.addTag("keypointregion", KeyPointRegionModel, HtxKeyPoint);
Registry.addRegionType(
  KeyPointRegionModel,
  "image",
  (value) => "x" in value && "y" in value && "width" in value && !("height" in value),
);

export { KeyPointRegionModel, HtxKeyPoint };
