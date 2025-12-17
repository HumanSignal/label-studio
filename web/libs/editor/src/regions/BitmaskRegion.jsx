import { useMemo } from "react";
import { Group, Image, Line, Rect } from "react-konva";
import { isAlive, types } from "mobx-state-tree";

import Registry from "../core/Registry";
import NormalizationMixin from "../mixins/Normalization";
import RegionsMixin from "../mixins/Regions";
import { defaultStyle } from "../core/Constants";
import { guidGenerator } from "../core/Helpers";
import { AreaMixin } from "../mixins/AreaMixin";
import IsReadyMixin from "../mixins/IsReadyMixin";
import { KonvaRegionMixin } from "../mixins/KonvaRegion";
import { ImageModel } from "../tags/object/Image";
import { AliveRegion } from "./AliveRegion";
import { RegionWrapper } from "./RegionWrapper";
import { BitmaskDrawing, getCanvasPixelBounds, isHoveringNonTransparentPixel } from "./BitmaskRegion/utils";
import chroma from "chroma-js";
import { generateMultiShapeOutline } from "./BitmaskRegion/contour";
import { observe } from "mobx";
import { LabelOnMask } from "../components/ImageView/LabelOnRegion";

/**
 * Bitmask masking region
 */
const Model = types
  .model({
    id: types.optional(types.identifier, guidGenerator),
    pid: types.optional(types.string, guidGenerator),
    type: "bitmaskregion",
    object: types.late(() => types.reference(ImageModel)),

    /**
     * Used to restore an image from the result or from a drawing region
     * @type {string}
     */
    imageDataURL: types.maybeNull(types.optional(types.string, "")),
  })
  .volatile(() => ({
    /**
     * Determines node opacity. Can be any number between 0 and 1
     */
    opacity: 0.6,
    needsUpdate: 1,
    hideable: true,

    /** @type {Layer} */
    layerRef: undefined,

    /** @type {Image} */
    imageRef: undefined,

    /** @type {{x: number, y: number}} */
    lastPos: { x: 0, y: 0 },

    /**
     * This canvas will always have black pixels on transparent background.
     * The main canvas we're drawing on.
     * @type {OffscreenCanvas}
     **/
    offscreenCanvasRef: null,

    /**
     * Holds actual visible region brush strokes with color.
     * @type {HTMLCanvasElement}
     */
    bitmaskCanvasRef: null,

    /** @type {number[][]} */
    outline: [],

    bbox: null,
  }))
  .views((self) => {
    return {
      get parent() {
        return isAlive(self) ? self.object : null;
      },
      get colorParts() {
        const style = self.style?.strokecolor || self.tag?.strokecolor || defaultStyle?.strokecolor;

        return style ? chroma(style).rgb() : [];
      },
      get strokeColor() {
        return chroma(self.colorParts).hex();
      },
      get bboxCoordsCanvas() {
        if (self.offscreenCanvasRef) {
          return self.bbox;
        }
      },

      /**
       * Brushes are processed in pixels, so percentages are derived values for them,
       * unlike for other tools.
       */
      get bboxCoords() {
        const bbox = self.bbox;

        if (!bbox) return null;

        return {
          left: self.parent.canvasToInternalX(bbox.left),
          top: self.parent.canvasToInternalY(bbox.top),
          right: self.parent.canvasToInternalX(bbox.right),
          bottom: self.parent.canvasToInternalY(bbox.bottom),
        };
      },

      get dimensions() {
        const image = self.parent;
        return {
          stageWidth: image?.stageWidth ?? 0,
          stageHeight: image?.stageHeight ?? 0,
          imageWidth: image?.currentImageEntity.naturalWidth ?? 0,
          imageHeight: image?.currentImageEntity.naturalHeight ?? 0,
        };
      },

      getImageDataURL() {
        const canvas = self.getImageSnapshotCanvas();
        const imageDataURL = canvas.toDataURL("image/png");

        return imageDataURL;
      },
    };
  })
  .actions((self) => {
    const lastPointX = -1;
    const lastPointY = -1;
    const disposers = [];

    return {
      afterCreate() {
        self.createCanvas();
        self.restoreFromImageDataURL(); // Only runs when the region is deserialized from result

        // We want to update color of the color mask dynamically
        // so that changing label is reflected right away
        disposers.push(
          observe(self, "strokeColor", () => {
            self.composeMask();
          }),
        );

        // The only way to track changes history is through current `imageDataURL`
        // because we don't store points or re-render entire path from scratch
        disposers.push(
          observe(self, "imageDataURL", () => {
            self.redraw();
          }),
        );
      },

      beforeDestroy() {
        for (const disposer of disposers) {
          disposer();
        }
      },

      setOutline(outline) {
        self.outline = outline;
      },

      /**
       * Restores image from a png data url (base64)
       * Used when deserializing from result
       */
      restoreFromImageDataURL() {
        if (!self.imageDataURL) return;
        async function renderDataURL() {
          const context = self.offscreenCanvasRef.getContext("2d");
          const bitmask = self.bitmaskCanvasRef;
          const image = new window.Image();

          image.src = self.imageDataURL;

          try {
            await image.decode();
            context.canvas.width = image.naturalWidth;
            context.canvas.height = image.naturalHeight;
            bitmask.width = image.naturalWidth;
            bitmask.height = image.naturalHeight;

            context.drawImage(image, 0, 0);

            self.finalizeRegion();
          } catch (err) {
            console.log(err);
          }
        }
        renderDataURL();
      },

      finalizeRegion() {
        self.composeMask();
        self.generateOutline();
        self.updateBBox();
      },

      updateImageURL() {
        self.setImageDataURL(self.getImageDataURL());
      },

      redraw() {
        if (self.bitmaskCanvasRef && self.offscreenCanvasRef && self.imageDataURL) {
          requestIdleCallback(() => {
            const ctx = self.offscreenCanvasRef.getContext("2d");
            ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
            self.restoreFromImageDataURL();
          });
        }
      },

      setBBox(bbox) {
        self.bbox = bbox;
      },

      setImageDataURL(url) {
        self.imageDataURL = url;
      },

      generateOutline() {
        self.setOutline(generateMultiShapeOutline(self));
      },

      canvasSize() {
        if (!self.parent) return { width: 0, height: 0 };
        const ent = self.parent.currentImageEntity;

        return {
          width: ent.naturalWidth * self.parent.stageZoom,
          height: ent.naturalHeight * self.parent.stageZoom,
        };
      },

      createCanvas() {
        const { width, height } = {
          width: self.parent.currentImageEntity.naturalWidth,
          height: self.parent.currentImageEntity.naturalHeight,
        };
        if (!self.bitmaskCanvasRef) {
          self.bitmaskCanvasRef = new OffscreenCanvas(width, height);
        }

        if (!self.offscreenCanvasRef) {
          self.offscreenCanvasRef = new OffscreenCanvas(width, height);
        }

        return self.offscreenCanvasRef;
      },

      composeMask() {
        const ctx = self.bitmaskCanvasRef.getContext("2d");

        // Only clear if we're not in the middle of drawing
        if (!self.isDrawing) {
          ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
        }

        ctx.globalCompositeOperation = "destination-atop";
        ctx.fillStyle = self.strokeColor;
        ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
        ctx.drawImage(self.offscreenCanvasRef, 0, 0);

        // Always batch draw to ensure visual updates
        self.layerRef?.batchDraw();
      },

      updateBBox() {
        self.setBBox(getCanvasPixelBounds(self.offscreenCanvasRef, self.parent?.stageZoom ?? 1));
      },

      /**
       * @param {Group} ref
       */
      setLayerRef(ref) {
        if (!ref) return;

        const layer = ref.getParent();
        self.layerRef = layer;
      },

      setImageRef(ref) {
        if (ref) self.imageRef = ref;
      },

      setLastPos(pos) {
        self.lastPos = pos;
      },

      beginPath({ type, strokeWidth, opacity = self.opacity, x = 0, y = 0 }) {
        self.object.annotation.pauseAutosave();

        const ctx = self.offscreenCanvasRef.getContext("2d");

        // Set up context properties once
        ctx.fillStyle = type === "eraser" ? "white" : "black";
        ctx.globalCompositeOperation = type === "eraser" ? "destination-out" : "source-over";

        self.setLastPos(
          BitmaskDrawing.begin({
            ctx,
            ...self.positionToStage(x, y),
            brushSize: strokeWidth,
            color: self.strokeColor,
            eraserMode: type === "eraser",
          }),
        );

        self.composeMask();
      },

      addPoint(x, y, strokeWidth, options = { erase: false }) {
        self.setLastPos(
          BitmaskDrawing.draw({
            ctx: self.offscreenCanvasRef.getContext("2d"),
            ...self.positionToStage(x, y),
            brushSize: strokeWidth,
            color: self.strokeColor,
            lastPos: self.lastPos,
            eraserMode: options.erase,
          }),
        );

        // Only compose mask every few points or on significant changes
        if (!self._lastComposeTime || Date.now() - self._lastComposeTime > 16) {
          // ~60fps
          self.composeMask();
          self._lastComposeTime = Date.now();
        }
      },

      positionToStage(x, y) {
        return {
          x: Math.floor(x / self.parent.stageZoom),
          y: Math.floor(y / self.parent.stageZoom),
        };
      },

      endPath() {
        const { annotation } = self.object;

        // we finalize the region and re-compute imageDataURL
        // before enabling autosave to ensure that it's available
        // for the draft at all times
        self.finalizeRegion();
        self.updateImageURL();

        // will resume in the next tick...
        annotation.startAutosave();

        self.notifyDrawingFinished();

        // ...so we run this toggled function also delayed
        annotation.autosave && setTimeout(() => annotation.autosave());
      },

      updateImageSize(wp, hp, sw, sh) {
        if (self.parent.stageWidth > 1 && self.parent.stageHeight > 1) {
          self.finalizeRegion();

          self.needsUpdate = self.needsUpdate + 1;
        }
      },

      /**
       * Prepared a bitmask for serialization/export
       * @returns {HTMLCanvasElement}
       */
      getImageSnapshotCanvas() {
        const tempCanvas = document.createElement("canvas");
        tempCanvas.width = self.offscreenCanvasRef.width;
        tempCanvas.height = self.offscreenCanvasRef.height;
        const ctx = tempCanvas.getContext("2d");

        // Convert back to black mask
        ctx.globalCompositeOperation = "destination-atop";
        ctx.fillStyle = "black";
        ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
        ctx.drawImage(self.offscreenCanvasRef, 0, 0);
        return tempCanvas;
      },

      isHovered() {
        return isHoveringNonTransparentPixel(self);
      },

      /**
       * @param {object} options
       * @param {boolean} [options.fast]
       * @return {BrushRegionResult}
       */
      serialize(options) {
        const value = { imageDataURL: self.imageDataURL };
        return self.parent.createSerializedResult(self, value);
      },
    };
  });

const BitmaskRegionModel = types.compose(
  "BitmaskRegionModel",
  RegionsMixin,
  NormalizationMixin,
  AreaMixin,
  KonvaRegionMixin,
  IsReadyMixin,
  Model,
);

const HtxBitmaskView = ({ item, setShapeRef }) => {
  const highlightedRegions = item.parent?.regs.filter((r) => r.highlighted) ?? [];
  const displayHighlight = item.highlighted || item.selected;
  const ent = item.parent?.currentImageEntity;

  const { width, height } = useMemo(() => {
    if (!item.parent) return { width: 0, height: 0 };
    return item.canvasSize();
  }, [item.parent?.stageWidth, item.parent?.stageHeight, ent?.naturalWidth, ent?.naturalHeight]);

  const stage = item.parent?.stageRef;

  return (
    <RegionWrapper item={item}>
      <Group ref={item.setLayerRef}>
        <Group id={item.cleanId} name="bitmask" visible={!item.hidden} listening={false} opacity={item.opacity}>
          {/* Displaying the overlay if 0 (just selected) or 1 (only highlighted region) */}
          {displayHighlight && highlightedRegions.length < 2 && (
            <Rect fill="black" x={0} y={0} width={width} height={height} listening={false} />
          )}

          <Image
            ref={item.setImageRef}
            image={item.bitmaskCanvasRef}
            width={width}
            height={height}
            listening={false}
            imageSmoothingEnabled={item.parent?.smoothing}
          />
        </Group>
        <Group listening={false} opacity={item.opacity}>
          {displayHighlight &&
            highlightedRegions.length > 1 &&
            item.outline.map((points, i) => (
              <Line
                key={i}
                points={points}
                stroke={item.strokeColor}
                strokeWidth={4}
                closed
                lineJoin="round"
                lineCap="round"
                strokeScaleEnabled={false}
                tension={0.2}
                listening={false}
              />
            ))}
        </Group>
        <Group id={`${item.cleanId}_labels`}>
          <LabelOnMask item={item} color={item.strokeColor} />
        </Group>
      </Group>
    </RegionWrapper>
  );
};

const HtxBitmask = AliveRegion(HtxBitmaskView, {
  renderHidden: true,
  shouldNotUsePortal: true,
});

Registry.addTag("bitmaskregion", BitmaskRegionModel, HtxBitmask);
Registry.addRegionType(BitmaskRegionModel, "image", (value) => "imageDataURL" in value);

export { BitmaskRegionModel, HtxBitmask };
