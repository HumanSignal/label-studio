import { useCallback, useContext, useEffect, useRef, useState } from "react";
import { Group, Image, Shape } from "react-konva";
import { observer } from "mobx-react";
import { getParent, getRoot, getSnapshot, getType, hasParent, isAlive, types } from "mobx-state-tree";
import { decode as rleDecode } from "@thi.ng/rle-pack";

import Registry from "../core/Registry";
import NormalizationMixin from "../mixins/Normalization";
import RegionsMixin from "../mixins/Regions";
import Canvas from "../utils/canvas";

import { ImageViewContext } from "../components/ImageView/ImageViewContext";
import { LabelOnMask } from "../components/ImageView/LabelOnRegion";
import { defaultStyle } from "../core/Constants";
import { guidGenerator } from "../core/Helpers";
import { AreaMixin } from "../mixins/AreaMixin";
import IsReadyMixin from "../mixins/IsReadyMixin";
import { KonvaRegionMixin } from "../mixins/KonvaRegion";
import { ImageModel } from "../tags/object/Image";
import { colorToRGBAArray, rgbArrayToHex } from "../utils/colors";
import { AliveRegion } from "./AliveRegion";
import { RegionWrapper } from "./RegionWrapper";

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
      updateImageSize(_wp, _hp, sw, sh) {
        // Wire snapshots (draft / history) often include `points` but omit `relativePoints`.
        // Without % coords, the map below would wipe `points` to [] — invisible strokes after rehydrate.
        if (self.relativePoints.length === 0 && self.points.length > 0 && self.parent) {
          const sx = self.parent.scaleX;
          const sy = self.parent.scaleY;
          const rel = [];

          for (let i = 0; i < self.points.length; i++) {
            const p = self.points[i];
            const raw = p * (i % 2 === 0 ? sx : sy);
            const stageDim = i % 2 === 0 ? sw : sh;

            rel.push((raw / stageDim) * 100);
          }
          self.relativePoints.replace(rel);
          self.relativeStrokeWidth = (self.strokeWidth / sw) * 100;
        }

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
      rescale(origW, _origH, destW) {
        const s = destW / origW;

        return self.points.map((p) => p * s);
      },

      scaledStrokeWidth(origW, _origH, destW) {
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
    rleBbox: null,
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
      get hasEraserTouches() {
        return self.touches.some((t) => t.type === "eraser");
      },
      get bboxCoordsCanvas() {
        let touchBbox = null;
        let scaledRleBbox = null;

        if (self.touches && self.touches.length > 0) {
          const points = { x: [], y: [] };

          self.touches.forEach((touch) => {
            for (let i = 0; i < touch.points.length; i += 2) {
              points.x.push(touch.points[i]);
              points.y.push(touch.points[i + 1]);
            }
          });

          if (points.x.length > 0) {
            touchBbox = {
              left: Math.min(...points.x),
              top: Math.min(...points.y),
              right: Math.max(...points.x),
              bottom: Math.max(...points.y),
            };
          }
        }

        if (self.rleBbox && self.parent) {
          const scaleX = self.parent.stageWidth / (self.currentImageEntity?.naturalWidth || 1);
          const scaleY = self.parent.stageHeight / (self.currentImageEntity?.naturalHeight || 1);

          scaledRleBbox = {
            left: self.rleBbox.left * scaleX,
            top: self.rleBbox.top * scaleY,
            right: self.rleBbox.right * scaleX,
            bottom: self.rleBbox.bottom * scaleY,
          };
        }

        if (touchBbox && scaledRleBbox) {
          return {
            left: Math.min(touchBbox.left, scaledRleBbox.left),
            top: Math.min(touchBbox.top, scaledRleBbox.top),
            right: Math.max(touchBbox.right, scaledRleBbox.right),
            bottom: Math.max(touchBbox.bottom, scaledRleBbox.bottom),
          };
        }

        return touchBbox || scaledRleBbox || null;
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
        if (self.rle) {
          self.updateRLEBBox();
        }
      },

      updateRLEBBox() {
        if (!self.rle) {
          self.rleBbox = null;
          return;
        }
        try {
          const nw = self.currentImageEntity?.naturalWidth;
          const nh = self.currentImageEntity?.naturalHeight;

          if (!nw || !nh) return;

          const decoded = rleDecode(self.rle);

          let minX = nw;
          let minY = nh;
          let maxX = -1;
          let maxY = -1;

          for (let i = decoded.length / 4 - 1; i >= 0; i--) {
            if (decoded[i * 4 + 3] > 0) {
              const x = i % nw;
              const y = Math.floor(i / nw);

              if (x < minX) minX = x;
              if (x > maxX) maxX = x;
              if (y < minY) minY = y;
              if (y > maxY) maxY = y;
            }
          }

          if (maxX < minX || maxY < minY) {
            self.rleBbox = null;
            return;
          }

          self.rleBbox = {
            left: minX,
            top: minY,
            right: maxX + 1,
            bottom: maxY + 1,
          };
        } catch {
          self.rleBbox = null;
        }
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
        ctx.beginPath();
        ctx.rect(
          self.parent.alignmentOffset.x,
          self.parent.alignmentOffset.y,
          self.parent.stageWidth * self.parent.stageScale,
          self.parent.stageHeight * self.parent.stageScale,
        );
        ctx.clip();
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
          self.updateRLEBBox();
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

          // Plain snapshots only — assigning `self.touches` kept live MST nodes in
          // `versions.draft`; after deleteAllRegions / draft toggle, fixBrokenAnnotation's
          // deep toJS traversed dead Points nodes and threw MST "initializing phase" errors.
          if (self.touches.length) value.touches = getSnapshot(self.touches);
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
  const offscreenRef = useRef(null);

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
    ctx.globalAlpha = 1;
    ctx.stroke();
    ctx.restore();
  }, []);

  const sceneFunc = useCallback(
    (context) => {
      if (pointsList.length === 0) return;

      const nativeCtx = context._context || context;
      const canvas = nativeCtx.canvas;
      const w = canvas.width;
      const h = canvas.height;

      if (!w || !h) return;

      if (!offscreenRef.current || offscreenRef.current.width !== w || offscreenRef.current.height !== h) {
        offscreenRef.current = document.createElement("canvas");
        offscreenRef.current.width = w;
        offscreenRef.current.height = h;
      }
      const offCtx = offscreenRef.current.getContext("2d");

      offCtx.clearRect(0, 0, w, h);

      const currentTransform = nativeCtx.getTransform();

      offCtx.setTransform(currentTransform);

      pointsList.forEach((points) => {
        drawLine(offCtx, {
          points: points.points,
          strokeWidth: points.strokeWidth,
          strokeColor: item.strokeColor,
          compositeOperation: points.compositeOperation,
        });
      });

      nativeCtx.save();
      nativeCtx.setTransform(1, 0, 0, 1, 0, 0);
      nativeCtx.drawImage(offscreenRef.current, 0, 0);
      nativeCtx.restore();
    },
    [pointsList, pointsList.length, item.strokeColor, drawLine],
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
    [pointsList, pointsList.length, drawLine],
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
      const hasRle = item.rle && (!Array.isArray(item.rle) || item.rle.length > 0);
      if (!hasRle && !item.maskDataURL) return;
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

  // Drop cached hit mask when the image tag detaches (draft ↔ history tree swap);
  // otherwise Konva can still call hitFunc with a stale closure while `item.parent` is null.
  useEffect(() => {
    if (!item.parent) {
      imageDataRef.current = null;
    }
  }, [item.parent]);

  // Drawing hit area by shape color to detect interactions inside the Konva.
  // Uses an offscreen canvas with drawImage (respects transforms) instead of
  // putImageData (ignores transforms and always writes at canvas origin).
  const imageHitFunc = useCallback(
    (context, shape) => {
      const parent = item.parent;
      if (!image || !parent) return;

      const w = parent.stageWidth;
      const h = parent.stageHeight;
      if (!w || !h || w <= 1 || h <= 1) return;

      if (!imageDataRef.current) {
        const offscreen = document.createElement("canvas");

        offscreen.width = w;
        offscreen.height = h;
        const offCtx = offscreen.getContext("2d");

        offCtx.drawImage(image, 0, 0, w, h);
        const imageData = offCtx.getImageData(0, 0, w, h);
        const colorParts = colorToRGBAArray(shape.colorKey);

        for (let i = imageData.data.length / 4 - 1; i >= 0; i--) {
          if (imageData.data[i * 4 + 3] > 0) {
            for (let k = 0; k < 3; k++) {
              imageData.data[i * 4 + k] = colorParts[k];
            }
          }
        }
        offCtx.putImageData(imageData, 0, 0);
        imageDataRef.current = offscreen;
      }
      context.drawImage(imageDataRef.current, 0, 0, w, h);
    },
    [image, item, item.parent?.stageWidth, item.parent?.stageHeight],
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

  const parent = item.parent;
  if (!parent) return null;

  const clip = {
    x: 0,
    y: 0,
    width: parent.stageWidth,
    height: parent.stageHeight,
  };

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
            if (store.annotationStore.selected?.isLinkingMode) {
              e.cancelBubble = true;
            }
          }}
          onMouseOver={() => {
            if (store.annotationStore.selected?.isLinkingMode) {
              item.setHighlight(true);
            }
            item.updateCursor(true);
          }}
          onMouseOut={() => {
            if (store.annotationStore.selected?.isLinkingMode) {
              item.setHighlight(false);
            }
            item.updateCursor();
          }}
          onClick={(e) => {
            if (item.parent?.getSkipInteractions?.()) return;
            if (store.annotationStore.selected?.isLinkingMode) {
              item.onClickRegion(e);
              return;
            }

            item.setHighlight(false);
            item.onClickRegion(e);
          }}
          listening={!suggestion}
        >
          {/* RLE */}
          <Image image={image} hitFunc={imageHitFunc} width={parent.stageWidth} height={parent.stageHeight} />

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
  getPortalSelector: (item) => {
    // Brush regions with eraser touches get their own layer when selected
    // to prevent destination-out bleeding into other selected regions
    if (item.inSelection && item.hasEraserTouches) {
      return `.selected-eraser-${item.id}`;
    }
    return ".selection-regions-layer";
  },
});

Registry.addTag("brushregion", BrushRegionModel, HtxBrush);
Registry.addRegionType(BrushRegionModel, "image", (value) => value.rle || value.touches || value.maskDataURL);

export { BrushRegionModel, HtxBrush };
