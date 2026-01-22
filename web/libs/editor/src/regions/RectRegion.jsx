import Konva from "konva";
import { getRoot, isAlive, types } from "mobx-state-tree";
import { useContext } from "react";
import { Rect } from "react-konva";
import { ImageViewContext } from "../components/ImageView/ImageViewContext";
import { LabelOnRect } from "../components/ImageView/LabelOnRegion";
import Constants from "../core/Constants";
import { guidGenerator } from "../core/Helpers";
import Registry from "../core/Registry";
import { useRegionStyles } from "../hooks/useRegionColor";
import { AreaMixin } from "../mixins/AreaMixin";
import { KonvaRegionMixin } from "../mixins/KonvaRegion";
import NormalizationMixin from "../mixins/Normalization";
import RegionsMixin from "../mixins/Regions";
import { ImageModel } from "../tags/object/Image";
import { rotateBboxCoords } from "../utils/bboxCoords";
import { createDragBoundFunc } from "../utils/image";
import { AliveRegion } from "./AliveRegion";
import { EditableRegion } from "./EditableRegion";
import { RegionWrapper } from "./RegionWrapper";
import { RELATIVE_STAGE_HEIGHT, RELATIVE_STAGE_WIDTH } from "../components/ImageView/Image";

/**
 * Rectangle object for Bounding Box
 *
 */
const Model = types
  .model({
    id: types.optional(types.identifier, guidGenerator),
    pid: types.optional(types.string, guidGenerator),
    type: "rectangleregion",
    object: types.late(() => types.reference(ImageModel)),

    x: types.number,
    y: types.number,

    width: types.number,
    height: types.number,

    rotation: 0,
    rotationAtCreation: 0,
  })
  .volatile(() => ({
    startX: 0,
    startY: 0,

    // @todo not used
    scaleX: 1,
    scaleY: 1,

    opacity: 1,

    fill: true,
    fillColor: "#ff8800", // Constants.FILL_COLOR,
    fillOpacity: 0.2,

    strokeColor: Constants.STROKE_COLOR,
    strokeWidth: Constants.STROKE_WIDTH,

    _supportsTransform: true,
    // depends on region and object tag; they both should correctly handle the `hidden` flag
    hideable: true,

    editableFields: [
      { property: "x", label: "X" },
      { property: "y", label: "Y" },
      { property: "width", label: "W" },
      { property: "height", label: "H" },
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
    get parent() {
      return isAlive(self) ? self.object : null;
    },
    get bboxCoords() {
      const bboxCoords = {
        left: self.x,
        top: self.y,
        right: self.x + self.width,
        bottom: self.y + self.height,
      };

      if (self.rotation === 0 || !self.parent) return bboxCoords;

      return rotateBboxCoords(bboxCoords, self.rotation, { x: self.x, y: self.y }, self.parent.whRatio);
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
    get canvasHeight() {
      return self.parent?.internalToCanvasY(self.height);
    },
  }))
  .actions((self) => ({
    afterCreate() {
      self.startX = self.x;
      self.startY = self.y;
    },

    getDistanceBetweenPoints(pointA, pointB) {
      const { x: xA, y: yA } = pointA;
      const { x: xB, y: yB } = pointB;
      const distanceX = xA - xB;
      const distanceY = yA - yB;

      return Math.sqrt(distanceX ** 2 + distanceY ** 2);
    },

    getHeightOnPerpendicular(pointA, pointB, cursor) {
      const dX = pointB.x - pointA.x;
      const dY = pointB.y - pointA.y;
      const s2 = Math.abs(dY * cursor.x - dX * cursor.y + pointB.x * pointA.y - pointB.y * pointA.x);
      const ab = Math.sqrt(dY * dY + dX * dX);

      return s2 / ab;
    },

    isAboveTheLine(a, b, c) {
      return (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x) < 0;
    },

    draw(x, y, points) {
      const oldHeight = self.height;
      const canvasX = self.parent.internalToCanvasX(x);
      const canvasY = self.parent.internalToCanvasY(y);

      if (points.length === 1) {
        const canvasWidth = self.getDistanceBetweenPoints(
          { x: canvasX, y: canvasY },
          {
            x: self.canvasX,
            y: self.canvasY,
          },
        );

        self.width = self.parent.canvasToInternalX(canvasWidth);
        self.rotation = self.rotationAtCreation =
          Math.atan2(canvasY - self.canvasY, canvasX - self.canvasX) * (180 / Math.PI);
      } else if (points.length === 2) {
        const canvasPoints = points.map(({ x, y }) => ({
          x: self.parent.internalToCanvasX(x),
          y: self.parent.internalToCanvasY(y),
        }));
        const { y: firstPointY, x: firstPointX } = points[0];
        const { y: secondPointY, x: secondPointX } = points[1];

        if (self.isAboveTheLine(canvasPoints[0], canvasPoints[1], { x: canvasX, y: canvasY })) {
          self.x = secondPointX;
          self.y = secondPointY;
          self.rotation = self.rotationAtCreation + 180;
        } else {
          self.x = firstPointX;
          self.y = firstPointY;
          self.rotation = self.rotationAtCreation;
        }
        const canvasHeight = self.getHeightOnPerpendicular(canvasPoints[0], canvasPoints[1], {
          x: canvasX,
          y: canvasY,
        });

        self.height = self.parent.canvasToInternalY(canvasHeight);
      }
      self.setPosition(
        self.parent.internalToCanvasX(self.x),
        self.parent.internalToCanvasY(self.y),
        self.parent.internalToCanvasX(self.width),
        self.parent.internalToCanvasY(self.height),
        self.rotation,
      );

      const areaBBoxCoords = self?.bboxCoords;

      if (
        areaBBoxCoords?.left < 0 ||
        areaBBoxCoords?.top < 0 ||
        areaBBoxCoords?.right > RELATIVE_STAGE_WIDTH ||
        areaBBoxCoords?.bottom > RELATIVE_STAGE_HEIGHT
      ) {
        self.height = oldHeight;
      }
    },

    // @todo not used
    coordsInside(x, y) {
      // check if x and y are inside the rectangle
      const rx = self.x;
      const ry = self.y;
      const rw = self.width * (self.scaleX || 1);
      const rh = self.height * (self.scaleY || 1);

      if (x > rx && x < rx + rw && y > ry && y < ry + rh) return true;

      return false;
    },

    setPositionInternal(x, y, width, height, rotation) {
      self.x = x;
      self.y = y;
      self.width = width;
      self.height = height;
      self.rotation = (rotation + 360) % 360;
    },

    beforeSetPosition(x, y, width, height, rotation) {
      // Konva flipping fix
      if (height < 0) {
        let flippedBack;
        // If height is negative, it means it was flipped. We need to correct it
        // Negative height also means that it was changed.
        // In that case the difference between rotation and current rotation may be only 0 (or 360) and 180 degrees.
        // However, as it's not an integer value, we had to check the difference to be sure,
        // so 90 and 270 degrees are the safest values to check
        const deltaRotation = Math.abs(rotation - self.rotation) % 360;
        if (deltaRotation > 90 && deltaRotation < 270) {
          // when rotation changes involved, it's a horizontal flip
          flippedBack = self.flipBack({ x, y, width, height, rotation }, true);
        } else {
          // vertical flip
          flippedBack = self.flipBack({ x, y, width, height, rotation });
        }
        [x, y, width, height, rotation] = [
          flippedBack.x,
          flippedBack.y,
          flippedBack.width,
          flippedBack.height,
          flippedBack.rotation,
        ];
      }
      return [x, y, width, height, rotation];
    },

    /**
     * Bounding Box set position on canvas
     * @param {number} x
     * @param {number} y
     * @param {number} width
     * @param {number} height
     * @param {number} rotation
     */
    setPosition(x, y, width, height, rotation) {
      [x, y, width, height, rotation] = self.beforeSetPosition(x, y, width, height, rotation);
      const internalX = self.parent.canvasToInternalX(x);
      const internalY = self.parent.canvasToInternalY(y);
      const internalWidth = self.parent.canvasToInternalX(width);
      const internalHeight = self.parent.canvasToInternalY(height);

      // Apply snap to pixel if enabled
      if (self.control?.snap === "pixel") {
        // Snap top-left corner
        const topLeftPoint = self.control.getSnappedPoint({
          x: internalX,
          y: internalY,
        });

        // Snap bottom-right corner
        const bottomRightPoint = self.control.getSnappedPoint({
          x: internalX + internalWidth,
          y: internalY + internalHeight,
        });

        // Calculate snapped dimensions
        let snappedWidth = bottomRightPoint.x - topLeftPoint.x;
        let snappedHeight = bottomRightPoint.y - topLeftPoint.y;

        // Ensure at least 1 pixel in size after snapping
        const minPixelWidth = self.parent?.zoomedPixelSize?.x ?? 1;
        const minPixelHeight = self.parent?.zoomedPixelSize?.y ?? 1;
        if (snappedWidth < minPixelWidth) snappedWidth = minPixelWidth;
        if (snappedHeight < minPixelHeight) snappedHeight = minPixelHeight;

        self.setPositionInternal(topLeftPoint.x, topLeftPoint.y, snappedWidth, snappedHeight, rotation);
      } else {
        self.setPositionInternal(internalX, internalY, internalWidth, internalHeight, rotation);
      }
    },

    setScale(x, y) {
      self.scaleX = x;
      self.scaleY = y;
    },

    addState(state) {
      self.states.push(state);
    },

    setFill(color) {
      self.fill = color;
    },

    updateImageSize() {},

    /**
     * Konva.js allows region to be flipped, but it saves the origin, so the result is unusual.
     * When you resize it along height, it just inverts the height, no other changes.
     * When you resize it along width, it inverts the height and rotates the region by 180°.
     * This method fixes the region to have positive height.
     * Rotation is kept intact except for the two most common cases when it stays 0:
     * - when the region is flipped horizontally with no rotation, we fix the rotation back to 0.
     * - when the region is flipped vertically, rotation is still 0, we just flip the height.
     */
    flipBack(attrs, isHorizontalFlip = false) {
      // To make it calculable, we need to avoid relative coordinates
      let { x, y, width, height, rotation } = attrs;
      const radiansRotation = (rotation * Math.PI) / 180;
      const transform = new Konva.Transform();
      transform.rotate(radiansRotation);
      let targetCorner;

      if (isHorizontalFlip) {
        // When it flips horizontally, it turns the height negative and rotates the region by 180°.
        // In general, we want to return a top-right corner to the top-left corner and rotate back
        targetCorner = {
          x: width,
          y: 0,
        };
        rotation = (rotation + 180) % 360;
      } else {
        // In a vertical flipping case it affects only the height.
        // It means that we want to return a bottom-left corner to the top-left corner
        targetCorner = {
          x: 0,
          y: height,
        };
      }
      const offset = transform.point(targetCorner);

      return {
        x: x + offset.x,
        y: y + offset.y,
        width,
        height: -height,
        rotation,
      };
    },

    /**
     * @example
     * {
     *   "original_width": 1920,
     *   "original_height": 1280,
     *   "image_rotation": 0,
     *   "value": {
     *     "x": 3.1,
     *     "y": 8.2,
     *     "width": 20,
     *     "height": 16,
     *     "rectanglelabels": ["Car"]
     *   }
     * }
     * @typedef {Object} RectRegionResult
     * @property {number} original_width width of the original image (px)
     * @property {number} original_height height of the original image (px)
     * @property {number} image_rotation rotation degree of the image (deg)
     * @property {Object} value
     * @property {number} value.x x coordinate of the top left corner before rotation (0-100)
     * @property {number} value.y y coordinate of the top left corner before rotation (0-100)
     * @property {number} value.width width of the bounding box (0-100)
     * @property {number} value.height height of the bounding box (0-100)
     * @property {number} value.rotation rotation degree of the bounding box (deg)
     */

    /**
     * @return {RectRegionResult}
     */
    serialize() {
      const value = {
        x: self.x,
        y: self.y,
        width: self.width,
        height: self.height,
        rotation: self.rotation,
      };

      return self.parent.createSerializedResult(self, value);
    },
  }));

const RectRegionModel = types.compose(
  "RectRegionModel",
  RegionsMixin,
  NormalizationMixin,
  AreaMixin,
  KonvaRegionMixin,
  EditableRegion,
  Model,
);

const HtxRectangleView = ({ item, setShapeRef }) => {
  const { store } = item;

  const { suggestion } = useContext(ImageViewContext) ?? {};
  const regionStyles = useRegionStyles(item, { suggestion });
  const stage = item.parent?.stageRef;

  const eventHandlers = {};

  if (!item.parent) return null;
  if (!item.inViewPort) return null;

  if (!suggestion && !item.isReadOnly()) {
    eventHandlers.onTransform = ({ target }) => {
      // resetting the skew makes transformations weird but predictable
      target.setAttr("skewX", 0);
      target.setAttr("skewY", 0);
    };
    eventHandlers.onTransformEnd = (e) => {
      const t = e.target;
      const isFlipped = t.getAttr("scaleY") < 0;

      item.setPosition(
        t.getAttr("x"),
        t.getAttr("y"),
        t.getAttr("width") * t.getAttr("scaleX"),
        t.getAttr("height") * t.getAttr("scaleY"),
        t.getAttr("rotation"),
      );

      t.setAttr("scaleX", 1);
      t.setAttr("scaleY", 1);

      if (item.control?.snap === "pixel") {
        // If snap is enabled, we need to snap the coordinates to the pixel grid -
        // Sync Konva shape attributes back to computed canvas coordinates to cause a re-render
        // Canvas coordinates are updated in the setPosition method
        t.position({
          x: item.canvasX,
          y: item.canvasY,
          width: item.canvasWidth,
          height: item.canvasHeight,
        });
      }

      if (isFlipped) {
        // Somehow react-konva caches rotation, most probably as a controllable state,
        // so we need to set it manually if it able to be reverted to the previous value
        t.setAttr("rotation", item.rotation);
      }

      item.notifyDrawingFinished();
    };

    eventHandlers.onDragStart = (e) => {
      if (item.parent.getSkipInteractions()) {
        e.currentTarget.stopDrag(e.evt);
        return;
      }
      item.annotation.history.freeze(item.id);
    };

    eventHandlers.onDragEnd = (e) => {
      const t = e.target;

      item.setPosition(t.getAttr("x"), t.getAttr("y"), t.getAttr("width"), t.getAttr("height"), t.getAttr("rotation"));
      item.setScale(t.getAttr("scaleX"), t.getAttr("scaleY"));

      if (item.control?.snap === "pixel") {
        // If snap is enabled, we need to snap the coordinates to the pixel grid -
        // Sync Konva shape attributes back to computed canvas coordinates to cause a re-render
        // Canvas coordinates are updated in the setPosition method
        t.position({
          x: item.canvasX,
          y: item.canvasY,
          width: item.canvasWidth,
          height: item.canvasHeight,
        });
      }

      item.annotation.history.unfreeze(item.id);

      item.notifyDrawingFinished();
    };

    eventHandlers.dragBoundFunc = createDragBoundFunc(item, {
      x: item.x - item.bboxCoords.left,
      y: item.y - item.bboxCoords.top,
    });
  }

  return (
    <RegionWrapper item={item}>
      <Rect
        x={item.canvasX}
        y={item.canvasY}
        ref={(node) => setShapeRef(node)}
        width={item.canvasWidth}
        height={item.canvasHeight}
        fill={regionStyles.fillColor}
        stroke={regionStyles.strokeColor}
        strokeWidth={regionStyles.strokeWidth}
        strokeScaleEnabled={false}
        perfectDrawEnabled={false}
        shadowForStrokeEnabled={false}
        shadowBlur={0}
        dash={suggestion ? [10, 10] : null}
        scaleX={item.scaleX}
        scaleY={item.scaleY}
        opacity={1}
        rotation={item.rotation}
        draggable={!item.isReadOnly()}
        name={`${item.id} _transformable`}
        {...eventHandlers}
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
        listening={!suggestion && !item.annotation?.isDrawing}
      />
      <LabelOnRect item={item} color={regionStyles.strokeColor} strokewidth={regionStyles.strokeWidth} />
    </RegionWrapper>
  );
};

const HtxRectangle = AliveRegion(HtxRectangleView);

Registry.addTag("rectangleregion", RectRegionModel, HtxRectangle);
Registry.addRegionType(RectRegionModel, "image");

export { RectRegionModel, HtxRectangle };
