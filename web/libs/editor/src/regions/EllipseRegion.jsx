import { Fragment, useContext } from "react";
import { Ellipse } from "react-konva";
import { getRoot, types } from "mobx-state-tree";

import Constants from "../core/Constants";
import Registry from "../core/Registry";
import NormalizationMixin from "../mixins/Normalization";
import RegionsMixin from "../mixins/Regions";

import { ImageViewContext } from "../components/ImageView/ImageViewContext";
import { LabelOnEllipse } from "../components/ImageView/LabelOnRegion";
import { guidGenerator } from "../core/Helpers";
import { useRegionStyles } from "../hooks/useRegionColor";
import { AreaMixin } from "../mixins/AreaMixin";
import { KonvaRegionMixin } from "../mixins/KonvaRegion";
import { ImageModel } from "../tags/object/Image";
import { rotateBboxCoords } from "../utils/bboxCoords";
import { createDragBoundFunc } from "../utils/image";
import { AliveRegion } from "./AliveRegion";
import { EditableRegion } from "./EditableRegion";

/**
 * Ellipse object for Bounding Box
 *
 */
const Model = types
  .model({
    id: types.optional(types.identifier, guidGenerator),
    pid: types.optional(types.string, guidGenerator),
    type: "ellipseregion",
    object: types.late(() => types.reference(ImageModel)),

    x: types.number,
    y: types.number,
    radiusX: types.number,
    radiusY: types.number,

    rotation: 0,
  })
  .volatile(() => ({
    startX: 0,
    startY: 0,

    // @todo not used
    scaleX: 1,
    scaleY: 1,

    opacity: types.number,

    fill: true,
    fillColor: Constants.FILL_COLOR,
    fillOpacity: 0.2,

    strokeColor: Constants.STROKE_COLOR,
    strokeWidth: Constants.STROKE_WIDTH,

    _supportsTransform: true,
    hideable: true,

    editableFields: [
      { property: "x", label: "X" },
      { property: "y", label: "Y" },
      { property: "radiusX", label: "Rx" },
      { property: "radiusY", label: "Ry" },
      { property: "rotation", label: "icon:angle" },
    ],
  }))
  .volatile(() => {
    return {
      useTransformer: true,
      preferTransformer: true,
      supportsRotate: true,
      supportsScale: true,
    };
  })
  .views((self) => ({
    get store() {
      return getRoot(self);
    },
    get bboxCoords() {
      const bboxCoords = {
        left: self.x - self.radiusX,
        top: self.y - self.radiusY,
        right: self.x + self.radiusX,
        bottom: self.y + self.radiusY,
      };

      if (self.rotation === 0) return bboxCoords;

      return rotateBboxCoords(bboxCoords, self.rotation, { x: self.x, y: self.y }, self.parent.whRatio);
    },
    get canvasX() {
      return self.parent?.internalToCanvasX(self.x);
    },
    get canvasY() {
      return self.parent?.internalToCanvasY(self.y);
    },
    get canvasRadiusX() {
      return self.parent?.internalToCanvasX(self.radiusX);
    },
    get canvasRadiusY() {
      return self.parent?.internalToCanvasY(self.radiusY);
    },
  }))
  .actions((self) => ({
    afterCreate() {
      self.startX = self.x;
      self.startY = self.y;
    },

    // @todo not used
    coordsInside(x, y) {
      // check if x and y are inside the rectangle
      const a = self.radiusX;
      const b = self.radiusY;

      const cx = self.x;
      const cy = self.y;
      //going to system where center coordinates are (0,0)
      let rel_x = x - cx;
      let rel_y = y - cy;

      //going to system where our ellipse has angle 0 to X-Axis via rotate matrix
      const theta = self.rotation;

      rel_x = rel_x * Math.cos(Math.unit(theta, "deg")) - rel_y * Math.sin(Math.unit(theta, "deg"));
      rel_y = rel_x * Math.sin(Math.unit(theta, "deg")) + rel_y * Math.cos(Math.unit(theta, "deg"));

      if (Math.abs(rel_x) < a) {
        if (rel_y ** 2 < b ** 2 * (1 - rel_x ** 2 / a ** 2)) {
          return true;
        }
      } else {
        return false;
      }
    },

    setPositionInternal(x, y, radiusX, radiusY, rotation) {
      self.x = x;
      self.y = y;
      self.radiusX = radiusX;
      self.radiusY = radiusY;
      self.rotation = (rotation + 360) % 360;
    },

    /**
     * Boundg Box set position on canvas
     * @param {number} x
     * @param {number} y
     * @param {number} radiusX
     * @param {number} radiusY
     * @param {number} rotation
     */
    setPosition(x, y, radiusX, radiusY, rotation) {
      self.setPositionInternal(
        self.parent.canvasToInternalX(x),
        self.parent.canvasToInternalY(y),
        self.parent.canvasToInternalX(radiusX),
        self.parent.canvasToInternalY(radiusY),
        rotation,
      );
    },

    setScale(x, y) {
      self.scaleX = x;
      self.scaleY = y;
    },

    setFill(color) {
      self.fill = color;
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
     *     "radiusX": 20,
     *     "radiusY": 16,
     *     "ellipselabels": ["Car"]
     *   }
     * }
     * @typedef {Object} EllipseRegionResult
     * @property {number} original_width width of the original image (px)
     * @property {number} original_height height of the original image (px)
     * @property {number} image_rotation rotation degree of the image (deg)
     * @property {Object} value
     * @property {number} value.x x coordinate of the top left corner before rotation (0-100)
     * @property {number} value.y y coordinate of the top left corner before rotation (0-100)
     * @property {number} value.radiusX radius by x axis (0-100)
     * @property {number} value.radiusY radius by y axis (0-100)
     * @property {number} value.rotation rotation degree (deg)
     */

    /**
     * @return {EllipseRegionResult}
     */
    serialize() {
      const value = {
        x: self.x,
        y: self.y,
        radiusX: self.radiusX,
        radiusY: self.radiusY,
        rotation: self.rotation,
      };

      return self.parent.createSerializedResult(self, value);
    },
  }));

const EllipseRegionModel = types.compose(
  "EllipseRegionModel",
  RegionsMixin,
  AreaMixin,
  NormalizationMixin,
  KonvaRegionMixin,
  EditableRegion,
  Model,
);

const HtxEllipseView = ({ item, setShapeRef }) => {
  const { store } = item;

  const regionStyles = useRegionStyles(item);
  const stage = item.parent?.stageRef;
  const { suggestion } = useContext(ImageViewContext) ?? {};

  if (!item.parent) return null;
  if (!item.inViewPort) return null;

  return (
    <Fragment>
      <Ellipse
        x={item.canvasX}
        y={item.canvasY}
        ref={(el) => setShapeRef(el)}
        radiusX={item.canvasRadiusX}
        radiusY={item.canvasRadiusY}
        fill={regionStyles.fillColor}
        stroke={regionStyles.strokeColor}
        strokeWidth={regionStyles.strokeWidth}
        strokeScaleEnabled={false}
        perfectDrawEnabled={false}
        shadowForStrokeEnabled={false}
        shadowBlur={0}
        scaleX={item.scaleX}
        scaleY={item.scaleY}
        opacity={1}
        rotation={item.rotation}
        name={`${item.id} _transformable`}
        onTransform={({ target }) => {
          // resetting the skew makes transformations weird but predictable
          target.setAttr("skewX", 0);
          target.setAttr("skewY", 0);
        }}
        onTransformEnd={(e) => {
          const t = e.target;

          item.setPosition(
            t.getAttr("x"),
            t.getAttr("y"),
            t.getAttr("radiusX") * t.getAttr("scaleX"),
            t.getAttr("radiusY") * t.getAttr("scaleY"),
            t.getAttr("rotation"),
          );

          t.setAttr("scaleX", 1);
          t.setAttr("scaleY", 1);
          item.notifyDrawingFinished();
        }}
        onDragStart={(e) => {
          if (item.parent.getSkipInteractions()) {
            e.currentTarget.stopDrag(e.evt);
            return;
          }
          item.annotation.history.freeze(item.id);
        }}
        onDragEnd={(e) => {
          const t = e.target;

          item.setPosition(
            t.getAttr("x"),
            t.getAttr("y"),
            t.getAttr("radiusX"),
            t.getAttr("radiusY"),
            t.getAttr("rotation"),
          );
          item.setScale(t.getAttr("scaleX"), t.getAttr("scaleY"));
          item.annotation.history.unfreeze(item.id);
          item.notifyDrawingFinished();
        }}
        dragBoundFunc={createDragBoundFunc(item, { x: item.x - item.bboxCoords.left, y: item.y - item.bboxCoords.top })}
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
        draggable={!item.isReadOnly()}
        listening={!suggestion}
      />
      <LabelOnEllipse item={item} color={regionStyles.strokeColor} strokewidth={regionStyles.strokeWidth} />
    </Fragment>
  );
};

const HtxEllipse = AliveRegion(HtxEllipseView);

Registry.addTag("ellipseregion", EllipseRegionModel, HtxEllipse);
Registry.addRegionType(EllipseRegionModel, "image");

export { EllipseRegionModel, HtxEllipse };
