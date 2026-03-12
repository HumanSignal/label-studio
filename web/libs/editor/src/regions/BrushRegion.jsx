import { useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { Group, Image, Layer, Shape } from "react-konva";
import { observer } from "mobx-react";
import { getParent, getRoot, getType, hasParent, isAlive, types } from "mobx-state-tree";

import Registry from "../core/Registry";
import NormalizationMixin from "../mixins/Normalization";
import RegionsMixin from "../mixins/Regions";
import Canvas from "../utils/canvas";

import { ImageViewContext } from "../components/ImageView/ImageViewContext";
import { LabelOnMask } from "../components/ImageView/LabelOnRegion";
import { Geometry } from "../components/InteractiveOverlays/Geometry";
import { defaultStyle } from "../core/Constants";
import { guidGenerator } from "../core/Helpers";
import { AreaMixin } from "../mixins/AreaMixin";
import IsReadyMixin from "../mixins/IsReadyMixin";
import { KonvaRegionMixin } from "../mixins/KonvaRegion";
import { ImageModel } from "../tags/object/Image";
import { colorToRGBAArray, rgbArrayToHex } from "../utils/colors";
import { FF_ZOOM_OPTIM, isFF } from "../utils/feature-flags";
import { AliveRegion } from "./AliveRegion";
import { RegionWrapper } from "./RegionWrapper";

const highlightOptions = {
  opacity: 1,
};

const Points = types
  .model("Points", {
    id: types.optional(types.identifier, guidGenerator),
    type: types.optional(types.enumeration(["add", "eraser"]), "add"),
    points: types.array(types.number),
    relativePoints: types.array(types.number),

    /**
     * Stroke width
     */
    strokeWidth: types.optional(types.number, 25),
    relativeStrokeWidth: types.optional(types.number, 25),
    /**
     * Eraser size
     */
    eraserSize: types.optional(types.number, 25),
  })
  .views((self) => ({
    get store() {
      return getRoot(self);
    },
    get parent() {
      if (!hasParent(self, 2)) return null;
      return getParent(self, 2);
    },
    get stage() {
      return self.parent?.parent;
    },
    get compositeOperation() {
      return self.type === "add" ? "source-over" : "destination-out";
    },
  }))
  .actions((self) => {
    return {
      updateImageSize(wp, hp, sw, sh) {
        self.points = self.relativePoints.map((v, idx) => {
          const isX = !(idx % 2);
          const stageSize = isX ? sw : sh;

          return (v * stageSize) / 100;
        });
        self.strokeWidth = (self.relativeStrokeWidth * sw) / 100;
      },

      setType(type) {
        self.type = type;
      },

      addPoint(x, y) {
        // scale it back because it would be scaled on draw
        x = x / self.parent.scaleX;
        y = y / self.parent.scaleY;
        self.points.push(x);
        self.points.push(y);
      },

      setPoints(points) {
        self.points = points.map((c, i) => c / (i % 2 === 0 ? self.parent.scaleX : self.parent.scaleY));
        self.relativePoints = points.map(
          (c, i) => (c / (i % 2 === 0 ? self.stage.stageWidth : self.stage.stageHeight)) * 100,
        );
        self.relativeStrokeWidth = (self.strokeWidth / self.stage.stageWidth) * 100;
      },

      // rescale points to the new width and height from the original
      rescale(origW, origH, destW) {
        const s = destW / origW;

        return self.points.map((p) => p * s);
      },

      scaledStrokeWidth(origW, origH, destW) {
        const s = destW / origW;

        return s * self.strokeWidth;
      },
    };
  });

/**
 * Rectangle object for Bounding Box
 *
 */
const Model = types
  .model({
    id: types.optional(types.identifier, guidGenerator),
    pid: types.optional(types.string, guidGenerator),

    type: "brushregion",
    object: types.late(() => types.reference(ImageModel)),

    coordstype: types.optional(types.enumeration(["px", "perc"]), "perc"),

    rle: types.frozen(),

    maskDataURL: types.frozen(),

    touches: types.array(Points),
    currentTouch: types.maybeNull(types.reference(Points)),
  })
  .volatile(() => ({
    /**
     * Higher values will result in a more curvy line. A value of 0 will result in no interpolation.
     */
    tension: 0.0,
    /**
     * Stroke color
     */
    // strokeColor: types.optional(types.string, "red"),

    /**
     * Determines node opacity. Can be any number between 0 and 1
     */
    opacity: 0.6,
    scaleX: 1,
    scaleY: 1,

    // points: types.array(types.array(types.number)),
    // eraserpoints: types.array(types.array(types.number)),

    mode: "brush",

    needsUpdate: 1,
    hideable: true,
    layerRef: undefined,
  }))
  .views((self) => {
    return {
      get parent() {
        return isAlive(self) ? self.object : null;
      },
      get colorParts() {
        const style = self.style || self.tag || defaultStyle;

        return colorToRGBAArray(style.strokecolor);
      },
      get strokeColor() {
        return rgbArrayToHex(self.colorParts);
      },
      get touchesLength() {
        return self.touches.length;
      },
      get bboxCoordsCanvas() {
        const points = { x: [], y: [] };

        if (self.touches && self.touches.length > 0) {
          self.touches.forEach((touch) => {
            for (let i = 0; i < touch.points.length; i += 2) {
              points.x.push(touch.points[i]);
              points.y.push(touch.points[i + 1]);
            }
          });
        }

        if (points.x.length === 0) return null;

        return {
          left: Math.min(...points.x),
          top: Math.min(...points.y),
          right: Math.max(...points.x),
          bottom: Math.max(...points.y),
        };
      },
      /**
       * Brushes are processed in pixels, so percentages are derived values for them,
       * unlike for other tools.
       */
      get bboxCoords() {
        const bbox = self.bboxCoordsCanvas;

        if (!bbox) return null;

        return {
          left: self.parent.canvasToInternalX(bbox.left),
          top: self.parent.canvasToInternalY(bbox.top),
          right: self.parent.canvasToInternalX(bbox.right),
          bottom: self.parent.canvasToInternalY(bbox.bottom),
        };
      },
    };
  })
  .actions((self) => {
    let pathPoints;
    let cachedPoints;
    let lastPointX = -1;
    let lastPointY = -1;
    let maskImage;

    return {
      afterCreate() {
        self.updateMaskImage();
      },

      updateMaskImage() {
        if (self.maskDataURL) {
          if (!maskImage) maskImage = new window.Image();

          maskImage.src = self.maskDataURL;
        }
      },

      getMaskImage() {
        return maskImage;
      },

      setLayerRef(ref) {
        if (ref) {
          self.layerRef = ref;
        }
      },

      prepareCoords([x, y]) {
        return self.parent.zoomOriginalCoords([x, y]);
      },

      preDraw(x, y) {
        if (!self.layerRef) return;
        const layer = self.layerRef.getLayer();
        if (!layer) return;
        const ctx = layer.canvas.context;

        ctx.save();
        if (isFF(FF_ZOOM_OPTIM)) {
          ctx.beginPath();
          ctx.rect(
            self.parent.alignmentOffset.x,
            self.parent.alignmentOffset.y,
            self.parent.stageWidth * self.parent.stageScale,
            self.parent.stageHeight * self.parent.stageScale,
          );
          ctx.clip();
        }
        ctx.beginPath();
        if (cachedPoints.length / 2 > 3) {
          ctx.moveTo(...self.prepareCoords([lastPointX, lastPointY]));
        } else if (cachedPoints.length === 0) {
          ctx.moveTo(...self.prepareCoords([x, y]));
        } else {
          ctx.moveTo(...self.prepareCoords([cachedPoints[0], cachedPoints[1]]));
          for (let i = 0; i < cachedPoints.length / 2; i++) {
            ctx.lineTo(...self.prepareCoords([cachedPoints[2 * i], cachedPoints[2 * i + 1]]));
          }
        }
        ctx.lineTo(...self.prepareCoords([x, y]));
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        ctx.lineWidth = pathPoints.strokeWidth * self.scaleX * self.parent.stageScale;
        ctx.strokeStyle = self.strokeColor;
        ctx.globalCompositeOperation = pathPoints.compositeOperation;
        ctx.stroke();
        ctx.restore();
        lastPointX = x;
        lastPointY = y;
      },

      beginPath({ type, strokeWidth, opacity = self.opacity }) {
        // don't start to save another regions in the middle of drawing process
        self.object.annotation.pauseAutosave();

        pathPoints = Points.create({ id: guidGenerator(), type, strokeWidth, opacity });
        cachedPoints = [];
        return pathPoints;
      },

      addPoint(x, y) {
        self.preDraw(x, y);
        cachedPoints.push(x);
        cachedPoints.push(y);
      },

      endPath() {
        const { annotation } = self.object;

        // will resume in the next tick...
        annotation.startAutosave();

        if (cachedPoints.length === 2) {
          cachedPoints.push(cachedPoints[0]);
          cachedPoints.push(cachedPoints[1]);
        }
        self.touches.push(pathPoints);
        self.currentTouch = pathPoints;
        pathPoints.setPoints(cachedPoints);
        lastPointX = lastPointY = -1;
        pathPoints = null;
        cachedPoints = [];

        self.notifyDrawingFinished();

        // ...so we run this toggled function also delayed
        annotation.autosave && setTimeout(() => annotation.autosave());
      },

      endUpdatedMaskDataURL(maskDataURL) {
        const { annotation } = self.object;

        // will resume in the next tick...
        annotation.startAutosave();

        self.maskDataURL = maskDataURL;
        self.updateMaskImage();

        self.notifyDrawingFinished();

        // ...so we run this toggled function also delayed
        annotation.autosave && setTimeout(() => annotation.autosave());
      },

      convertPointsToMask() {},

      setScale(x, y) {
        self.scaleX = x;
        self.scaleY = y;
      },

      updateImageSize(wp, hp, sw, sh) {
        if (self.parent.stageWidth > 1 && self.parent.stageHeight > 1) {
          self.touches.forEach((stroke) => stroke.updateImageSize(wp, hp, sw, sh));

          self.needsUpdate = self.needsUpdate + 1;
        }
      },

      addState(state) {
        self.states.push(state);
      },

      convertToImage() {
        if (self.touches.length) {
          const object = self.object;
          const rle = Canvas.Region2RLE(self, object, {
            color: self.strokeColor,
          });

          self.touches = [];
          self.rle = Array.from(rle);
        }
      },

      /**
       * @example
       * {
       *   "original_width": 1920,
       *   "original_height": 1280,
       *   "image_rotation": 0,
       *   "value": {
       *     "format": "rle",
       *     "rle": [0, 1, 1, 2, 3],
       *     "brushlabels": ["Car"]
       *   }
       * }
       * @typedef {Object} BrushRegionResult
       * @property {number} original_width  - Width of the original image (px)
       * @property {number} original_height - Height of the original image (px)
       * @property {number} image_rotation  - Rotation degree of the image (deg)
       * @property {Object} value
       * @property {"rle"} value.format     - Format of the masks, only RLE is supported for now
       * @property {number[]} value.rle     - RLE-encoded image
       */

      /**
       * @param {object} options
       * @param {boolean} [options.fast] Saving only touches, without RLE
       * @return {BrushRegionResult}
       */
      serialize(options) {
        const object = self.object;
        const value = { format: "rle" };

        if (options?.fast) {
          value.rle = self.rle;

          if (self.touches.length) value.touches = self.touches;
          if (self.maskDataURL) value.maskDataURL = self.maskDataURL;
        } else {
          if (self.touches.length === 0 && self.rle && self.rle.length > 0) {
            value.rle = Array.from(self.rle);
          } else {
            const rle = Canvas.Region2RLE(self, object);

            if (!rle || !rle.length) return null;

            // UInt8Array serializes as object, not an array :(
            value.rle = Array.from(rle);
          }
        }

        return self.parent.createSerializedResult(self, value);
      },
    };
  });

const BrushRegionModel = types.compose(
  "BrushRegionModel",
  RegionsMixin,
  NormalizationMixin,
  AreaMixin,
  KonvaRegionMixin,
  IsReadyMixin,
  Model,
);

const HtxBrushLayer = observer(({ item, setShapeRef, pointsList }) => {
  const drawLine = useCallback((ctx, { points, strokeWidth, strokeColor, compositeOperation }) => {
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(points[0], points[1]);
    for (let i = 0; i < points.length / 2; i++) {
      ctx.lineTo(points[2 * i], points[2 * i + 1]);
    }
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.lineWidth = strokeWidth;
    ctx.strokeStyle = strokeColor;
    ctx.globalCompositeOperation = compositeOperation;
    ctx.stroke();
    ctx.restore();
  });

  const sceneFunc = useCallback(
    (context) => {
      pointsList.forEach((points) => {
        drawLine(context, {
          points: points.points,
          strokeWidth: points.strokeWidth,
          strokeColor: item.strokeColor,
          compositeOperation: points.compositeOperation,
        });
      });
    },
    [pointsList, pointsList.length, item.strokeColor],
  );

  const hitFunc = useCallback(
    (context, shape) => {
      pointsList.forEach((points) => {
        drawLine(context, {
          points: points.points,
          strokeWidth: points.strokeWidth,
          strokeColor: points.type === "eraser" ? "#ffffff" : shape.colorKey,
          compositeOperation: "source-over",
        });
      });
    },
    [pointsList, pointsList.length],
  );

  return <Shape ref={(node) => setShapeRef(node)} sceneFunc={sceneFunc} hitFunc={hitFunc} />;
});

const HtxBrushView = ({ item, setShapeRef }) => {
  const [image, setImage] = useState();
  const { suggestion } = useContext(ImageViewContext) ?? {};

  // Prepare brush stroke from RLE with current stroke color
  useEffect(() => {
    // Two possible ways to draw an image from precreated data:
    // - rle - An RLE encoded RGBA image
    // - maskDataURL - an RGBA mask encoded as an image data URL that can be directly placed into
    //  an image without having to go through an RLE encode/decode loop to save performance for tools
    //  that dynamically produce image masks.
    const prepareImage = async () => {
      if (!item.rle && !item.maskDataURL) return;
      if (!item.parent || item.parent.naturalWidth <= 1 || item.parent.naturalHeight <= 1) return;

      let img;

      if (item.maskDataURL) {
        img = await Canvas.maskDataURL2Image(item.maskDataURL, { color: item.strokeColor });
      } else if (item.rle) {
        img = Canvas.RLE2Region(item, { color: item.strokeColor });
      }

      if (img) {
        img.onload = () => {
          setImage(img);
          item.setReady(true);
        };
      }
    };
    prepareImage();
  }, [
    item.rle,
    item.maskDataURL,
    item.maskBoundsMinX,
    item.maskBoundsMinY,
    item.maskBoundsMaxX,
    item.maskBoundsMaxY,
    item.parent,
    item.parent?.naturalWidth,
    item.parent?.naturalHeight,
    item.strokeColor,
    item.opacity,
  ]);

  const imageDataRef = useRef(null);

  // Drawing hit area by shape color to detect interactions inside the Konva
  const imageHitFunc = useCallback(
    (context, shape) => {
      if (image) {
        if (!imageDataRef.current) {
          context.drawImage(image, 0, 0, item.parent.stageWidth, item.parent.stageHeight);
          let imageData;
          if (isFF(FF_ZOOM_OPTIM)) {
            imageData = context.getImageData(
              item.parent.alignmentOffset.x,
              item.parent.alignmentOffset.y,
              item.parent.stageWidth,
              item.parent.stageHeight,
            );
          } else {
            imageData = context.getImageData(0, 0, item.parent.stageWidth, item.parent.stageHeight);
          }
          const colorParts = colorToRGBAArray(shape.colorKey);

          for (let i = imageData.data.length / 4 - 1; i >= 0; i--) {
            if (imageData.data[i * 4 + 3] > 0) {
              for (let k = 0; k < 3; k++) {
                imageData.data[i * 4 + k] = colorParts[k];
              }
            }
          }
          imageDataRef.current = imageData;
        }
        context.putImageData(imageDataRef.current, 0, 0);
      }
    },
    [image, item.parent?.stageWidth, item.parent?.stageHeight],
  );

  useEffect(() => {
    // Cleanup the massive 8MB ImageData array when navigating away or unmounting
    return () => {
      imageDataRef.current = null;
    };
  }, []);

  const { store } = item;

  const layerRef = useRef();
  const highlighted = item.highlighted;

  const setLayerRef = useCallback(
    (ref) => {
      if (isAlive(item)) {
        item.setLayerRef(ref);
      }
    },
    [item],
  );

  if (!item.parent) return null;

  const stage = item.parent?.stageRef;
  const clip = isFF(FF_ZOOM_OPTIM)
    ? {
        x: 0,
        y: 0,
        width: item.parent.stageWidth,
        height: item.parent.stageHeight,
      }
    : null;

  return (
    <RegionWrapper item={item}>
      <Group
        id={item.cleanId}
        ref={(ref) => {
          setLayerRef(ref);
          layerRef.current = ref;
        }}
        visible={!item.hidden}
        clip={clip}
        opacity={highlighted ? 1 : item.opacity}
      >
        <Group
          attrMy={item.needsUpdate}
          name="segmentation"
          onMouseDown={(e) => {
            if (store.annotationStore.selected.isLinkingMode) {
              e.cancelBubble = true;
            }
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
              item.onClickRegion(e);
              return;
            }

            if (!isFF(FF_ZOOM_OPTIM)) {
              const tool = item.parent.getToolsManager().findSelectedTool();
              const isMoveTool = tool && getType(tool).name === "MoveTool";

              if (tool && !isMoveTool) return;
            }

            if (store.annotationStore.selected.isLinkingMode) {
              stage.container().style.cursor = "default";
            }

            item.setHighlight(false);
            item.onClickRegion(e);
          }}
          listening={!suggestion}
        >
          {/* RLE */}
          <Image image={image} hitFunc={imageHitFunc} width={item.parent.stageWidth} height={item.parent.stageHeight} />

          {/* Touches */}
          <Group>
            <HtxBrushLayer store={store} item={item} pointsList={item.touches} setShapeRef={setShapeRef} />
          </Group>
        </Group>
      </Group>
      <Group id={`${item.cleanId}_labels`} opacity={item.opacity}>
        <LabelOnMask item={item} color={item.strokeColor} />
      </Group>
    </RegionWrapper>
  );
};

const HtxBrush = AliveRegion(HtxBrushView, {
  renderHidden: true,
  shouldNotUsePortal: true,
});

Registry.addTag("brushregion", BrushRegionModel, HtxBrush);
Registry.addRegionType(BrushRegionModel, "image", (value) => value.rle || value.touches || value.maskDataURL);

export { BrushRegionModel, HtxBrush };
