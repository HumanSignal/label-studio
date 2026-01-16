import { getRoot, isAlive, types } from "mobx-state-tree";
import NormalizationMixin from "../mixins/Normalization";
import RegionsMixin from "../mixins/Regions";
import Registry from "../core/Registry";
import { ImageModel } from "../tags/object/Image";
import { guidGenerator } from "../core/Helpers";
import { AreaMixin } from "../mixins/AreaMixin";
import { useRegionStyles } from "../hooks/useRegionColor";
import { KonvaRegionMixin } from "../mixins/KonvaRegion";
import { RELATIVE_STAGE_HEIGHT, RELATIVE_STAGE_WIDTH } from "../components/ImageView/Image";
import { KonvaVector } from "../components/KonvaVector/KonvaVector";
import { observer } from "mobx-react";
import Constants from "../core/Constants";
import { RegionWrapper } from "./RegionWrapper";
import { LabelOnPolygon } from "../components/ImageView/LabelOnRegion";
import { Group } from "react-konva";

/**
 * VectorRegion - Vector graphics region with coordinate system conversion
 *
 * Handles conversion between Label Studio's relative coordinates (0-100%) and KonvaVector's image coordinates (pixels).
 *
 * **Coordinate Systems:**
 * - **Label Studio**: Relative coordinates (percentages) for storage and portability
 * - **KonvaVector**: Image coordinates (pixels) for precise editing
 *
 * **Conversion Flow:**
 * ```
 * Label Studio (Relative %) ←→ VectorRegion ←→ KonvaVector (Image px)
 *     ↓ serialize()                ↓ afterCreate()
 * Database Storage          Internal State     User Interface
 * ```
 *
 * **Key Methods:**
 * - `relativeToImageCoords()`: Converts relative → image coordinates
 * - `imageToRelativeCoords()`: Converts image → relative coordinates
 * - `serialize()`: Exports in Label Studio format with relative coordinates
 */
const Model = types
  .model({
    id: types.optional(types.identifier, guidGenerator),
    pid: types.optional(types.string, guidGenerator),
    type: "vectorregion",
    object: types.late(() => {
      return types.reference(ImageModel);
    }),

    vertices: types.array(types.frozen()), // Store whatever format KonvaVector gives us
    closed: false, // Vectors are not closed by default
    isPolygon: false,

    readonly: types.optional(types.boolean, false),

    // Internal flag to detect if we converted data back from relative points
    converted: false,

    // There are two modes: transform and edit
    // transform -- user can transform the shape as a whole (rotate, translate, resize)
    // edit -- user works with individual points
    transformMode: false,
  })
  .volatile(() => ({
    mouseOverStartPoint: false,
    selectedPoint: null,
    hideable: true,
    _supportsTransform: true,
    useTransformer: false,
    preferTransformer: false,
    supportsRotate: true,
    supportsScale: true,
    isDrawing: false,
    vectorRef: null,
    groupRef: null,
    _justSelected: false,
  }))
  .views((self) => ({
    get store() {
      return getRoot(self);
    },
    get x() {
      return self.bboxCoords.left;
    },

    get y() {
      return self.bboxCoords.top;
    },
    get bbox() {
      if (!self.vertices?.length || !isAlive(self)) return {};

      // Calculate bounding box from vector points
      const bbox = self.vectorRef?.getShapeBoundingBox() ?? {};

      // Ensure we have valid coordinates
      if (bbox.left === undefined || bbox.top === undefined) {
        return {};
      }

      return bbox;
    },

    get bboxCoords() {
      const bbox = self.bbox;

      if (!bbox) return null;

      return {
        left: self.parent.imageToInternalX(bbox.left),
        top: self.parent.imageToInternalY(bbox.top),
        right: self.parent.imageToInternalX(bbox.right),
        bottom: self.parent.imageToInternalY(bbox.bottom),
      };
    },
    get closable() {
      return self.control?.closable ?? false;
    },
    get minPoints() {
      const min = self.control?.minpoints;
      return min ? Number.parseInt(min) : undefined;
    },
    get maxPoints() {
      const max = self.control?.maxpoints;
      return max ? Number.parseInt(max) : undefined;
    },
    get incomplete() {
      // If maxPoints is reached, the region is complete (not incomplete)
      if (self.atMaxLength) return false;

      const notClosed = self.closable === true && self.closed === false;
      const notFinished = self.minPoints && self.vertices.length < self.minPoints;
      return notClosed || notFinished;
    },
    get finished() {
      // when path's closable we check if it has min points and has been closed
      if (self.closable) return !self.incomplete;

      // when not closable, check if it reached max points
      if (self.atMaxLength) return true;

      return false;
    },
    get atMaxLength() {
      return self.maxPoints && self.vertices.length === self.maxPoints;
    },

    /// Visuals
    get pointEnabledSize() {
      const customEnabledSize = self.control?.pointsizeenabled;
      return customEnabledSize ? Number.parseInt(customEnabledSize) : 5;
    },
    get pointDisabledSize() {
      const customDisabledSize = self.control?.pointsizedisabled;
      return customDisabledSize ? Number.parseInt(customDisabledSize) : 3;
    },
    // Helper function to convert pointSize to radius values
    get pointRadiusFromSize() {
      const size = self.control?.pointsize ?? "small";
      switch (size) {
        case "small":
          return { enabled: 4, disabled: 3 };
        case "medium":
          return { enabled: 6, disabled: 4 };
        case "large":
          return { enabled: 8, disabled: 6 };
        default:
          return { enabled: 6, disabled: 4 };
      }
    },
    get disabled() {
      const tool = self.parent?.getToolsManager().findSelectedTool();
      return (tool?.disabled ?? false) || self.isReadOnly() || (!self.selected && !self.isDrawing);
    },
  }))
  .actions((self) => {
    return {
      /**
       * Converts coordinates from Label Studio format (relative %) to KonvaVector format (image pixels)
       * Called when region is created from serialized data.
       */
      afterCreate() {
        if (!self.vertices.length) return;
        if (self.converted) return;

        self.vertices = self.relativeToImageCoords();
        self.converted = true;
        self.checkSizes();
      },

      /**
       * @todo excess method; better to handle click only on start point
       * Handler for mouse on start point of Vector
       * @param {boolean} val
       */
      setMouseOverStartPoint(value) {
        self.mouseOverStartPoint = value;
      },

      setDrawing(drawing) {
        self.isDrawing = drawing;
      },

      closePoly() {
        if (!self.closable) return;
        self.vectorRef.close();
      },

      onSelection(type) {
        if (type === "reset") {
          self.vectorRef.clearSelection();
          return;
        }

        const image = self.parent;
        const selection = image.selectionArea;
        const bbox = selection.bbox;

        if (!bbox) return;

        const xs = image.internalToImageX(bbox.left);
        const xe = image.internalToImageX(bbox.right);

        const ys = image.internalToImageY(bbox.top);
        const ye = image.internalToImageY(bbox.bottom);

        const selectedPoints = self.vertices
          .filter((p) => {
            const matchX = xs <= p.x && p.x <= xe;
            const matchY = ys <= p.y && p.y <= ye;
            return matchX && matchY;
          })
          .map((p) => p.id);

        const vector = self.vectorRef;
        vector?.selectPointsByIds(selectedPoints);
      },

      _selectArea(additiveMode = false, preserveTransformMode = false) {
        const annotation = self.annotation;
        if (!preserveTransformMode) {
          self.setTransformMode(false);
        }
        if (!annotation) return;

        if (additiveMode) {
          annotation.toggleRegionSelection(self);
        } else {
          const wasNotSelected = !self.selected;

          if (wasNotSelected) {
            // Set the flag before selecting to prevent double-click issues
            // This will be cleared by selectRegion() when called from RegionStore
            self._justSelected = true;
            annotation.selectArea(self);
          } else {
            // If _justSelected is true, it means this click is part of a double-click
            // Don't unselect - let the double-click handler manage selection
            if (!self._justSelected) {
              annotation.unselectAll();
            }
          }
        }
      },

      setHighlight(val) {
        self._highlighted = val;
      },

      updateCursor(isHovered = false) {
        const stage = self.parent?.stageRef;
        if (!stage) return;
        const style = stage.container().style;

        if (isHovered) {
          if (self.annotation.isLinkingMode) {
            style.cursor = "crosshair";
          } else {
            style.cursor = "pointer";
          }
          return;
        }

        const selectedTool = self.parent?.getToolsManager().findSelectedTool();
        if (!selectedTool || !selectedTool.updateCursor) {
          style.cursor = "default";
        } else {
          selectedTool.updateCursor();
        }
      },

      isReadOnly() {
        return self.readonly || self.annotation?.isReadOnly();
      },

      /**
       * Converts relative coordinates (0-100%) to image coordinates (pixels)
       * Formula: imageCoord = (relativeCoord / 100) * imageDimension
       */
      relativeToImageCoords() {
        const image = self.parent;
        return self.vertices.map((point) => {
          return {
            ...point,
            x: image.internalToImageX(point.x),
            y: image.internalToImageY(point.y),
            ...(point.isBezier
              ? {
                  controlPoint1: {
                    x: image.internalToImageX(point.controlPoint1.x),
                    y: image.internalToImageY(point.controlPoint1.y),
                  },
                  controlPoint2: {
                    x: image.internalToImageX(point.controlPoint2.x),
                    y: image.internalToImageY(point.controlPoint2.y),
                  },
                }
              : {}),
          };
        });
      },

      /**
       * Converts image coordinates (pixels) to relative coordinates (0-100%)
       * Formula: relativeCoord = (imageCoord / imageDimension) * 100
       */
      imageToRelativeCoords() {
        const image = self.parent;
        return self.vertices.map((point) => {
          return {
            ...point,
            x: image.imageToInternalX(point.x),
            y: image.imageToInternalY(point.y),
            ...(point.isBezier
              ? {
                  controlPoint1: {
                    x: image.imageToInternalX(point.controlPoint1.x),
                    y: image.imageToInternalY(point.controlPoint1.y),
                  },
                  controlPoint2: {
                    x: image.imageToInternalX(point.controlPoint2.x),
                    y: image.imageToInternalY(point.controlPoint2.y),
                  },
                }
              : {}),
          };
        });
      },

      // Checks is the region is being transformed or at least in
      // transformable state (has at least 2 points selected)
      isTransforming() {
        // If the region has no vectorRef or is not selected, it's not transforming
        if (!self.vectorRef || !self.selected) {
          return false;
        }
        try {
          const selection = self.vectorRef.getSelectedPointIds();
          const result = selection.length > 1;
          return result;
        } catch (error) {
          return false;
        }
      },

      segGroupRef(ref) {
        self.groupRef = ref;
      },

      /**
       * Serializes region data in Label Studio format with relative coordinates
       * Converts from image coordinates back to relative coordinates for storage
       *
       * @example
       * {
       *   "original_width": 1920,
       *   "original_height": 1280,
       *   "image_rotation": 0,
       *   "value": {
       *     "vertices": [
       *       { "id": "point-1", "x": 25.0, "y": 30.0, "prevPointId": null, "isBezier": false },
       *       { "id": "point-2", "x": 75.0, "y": 70.0, "prevPointId": "point-1", "isBezier": true,
       *         "controlPoint1": {"x": 50.0, "y": 40.0}, "controlPoint2": {"x": 60.0, "y": 60.0} }
       *     ],
       *     "closed": false,
       *     "vectorlabels": ["Road"]
       *   }
       * }
       *
       * @typedef {Object} VectorRegionResult
       * @property {number} original_width width of the original image (px)
       * @property {number} original_height height of the original image (px)
       * @property {number} image_rotation rotation degree of the image (deg)
       * @property {Object} value
       * @property {Array<Object>} value.vertices array of point objects with coordinates, bezier curve information, and point relationships
       * @property {boolean} value.closed whether the vector is closed (polygon) or open (polyline)
       * @property {Array<string>} value.vectorlabels array of label names assigned to this vector
       *
       * @return {VectorRegionResult} The serialized vector region data in Label Studio format
       */
      serialize() {
        // Preserve the full KonvaVector format to maintain Bezier curves and point relationships
        const value = {
          vertices: self.imageToRelativeCoords(), // Keep the full point objects with all properties
          closed: self.closed,
        };

        return self.parent.createSerializedResult(self, value);
      },

      updateImageSize(wp, hp, sw, sh) {
        if (self.coordstype === "px") {
          self.vertices.forEach((p) => {
            const x = (sw * (p.relativeX || 0)) / RELATIVE_STAGE_WIDTH;
            const y = (sh * (p.relativeY || 0)) / RELATIVE_STAGE_HEIGHT;

            p._setPos?.(x, y);
          });
        }

        if (self.annotation && !self.annotation.sentUserGenerate && self.coordstype === "perc") {
          self.vertices.forEach((p) => {
            const x = (sw * p.x) / RELATIVE_STAGE_WIDTH;
            const y = (sh * p.y) / RELATIVE_STAGE_HEIGHT;

            self.coordstype = "px";
            p._setPos?.(x, y);
          });
        }
      },

      // New methods for KonvaVector integration
      updatePointsFromKonvaVector(points) {
        // Store whatever format KonvaVector gives us
        self.vertices.replace(points);
      },

      onPathClosedChange(isClosed) {
        self.closed = isClosed;
      },

      setKonvaVectorRef(ref) {
        self.vectorRef = ref;
      },

      /**
       * Clear the just-selected flag (action for use in setTimeout)
       */
      clearJustSelectedFlag() {
        self._justSelected = false;
      },

      setJustSelectedFlag(value) {
        self._justSelected = value;
      },

      /**
       * Override selectRegion to reset transform mode when selecting from sidebar
       * This ensures transform mode is reset whether selecting by clicking on the shape
       * or selecting from the sidebar/outliner
       */
      selectRegion(preserveTransformMode = false) {
        // Reset transform mode when region is selected (from sidebar or elsewhere)
        // unless preserveTransformMode is true
        if (!preserveTransformMode) {
          self.setTransformMode(false);
        }
        // Mark that we just selected this region (to prevent double-click from enabling transform mode)
        self._justSelected = true;
        setTimeout(() => {
          self.clearJustSelectedFlag();
        }, 300); // Clear after double-click detection window
        // Call parent selectRegion to handle scrolling
        self.scrollToRegion();
      },

      addPoint(x, y) {
        const image = self.parent.currentImageEntity;
        const width = image.naturalWidth;
        const height = image.naturalHeight;

        const realX = (x / 100) * width;
        const realY = (y / 100) * height;

        if (!self.vectorRef) {
          return;
        }
        if (self.closed) {
          return;
        }

        // Use KonvaVector's programmatic point creation methods
        // Start a point, then immediately commit it to create a regular point
        const startResult = self.vectorRef.startPoint(realX, realY);
        if (startResult) {
          const commitResult = self.vectorRef.commitPoint(realX, realY);
          return commitResult;
        }
        return null;
      },

      // Uses KonvaVector startPoint to start drawing
      // This will only initiate point drawing, but won't create actual point
      startPoint(x, y) {
        self.vectorRef.startPoint(x, y);
      },

      // Will start drawing interaction
      // Only creates a point if [x,y] was changed from the initial position
      // by at least 5px (drag detection)
      //
      // This method is designed to create Bezier curve
      updatePoint(x, y) {
        self.vectorRef.updatePoint(x, y);
      },

      // Commits previously created point and resets the state
      //
      // Will create a new point if it was started but never updated (regular click)
      commitPoint(x, y) {
        self.vectorRef?.commitPoint(x, y);
      },

      handleFinish() {
        const tm = self.parent.getToolsManager();
        const tool = tm.findSelectedTool();
        if (tool.currentArea) {
          tool?.commitDrawingRegion();
        } else {
          const annotation = self.parent?.annotation;
          annotation?.toggleRegionSelection(self);
        }
        tool?.complete?.();
      },
      toggleTransformMode() {
        self.setTransformMode(!self.transformMode);
      },
      setTransformMode(transformMode) {
        self.transformMode = transformMode;
      },

      /**
       * Apply transformations from ImageTransformer to the vector points
       * Called by ImageTransformer when multi-region transformations complete
       * @param {Object} transform - Transform object with dx, dy, scaleX, scaleY, rotation
       * @param {Object} transformerCenter - Center point used by the ImageTransformer for scaling/rotation
       */
      applyTransform(transform, transformerCenter) {
        if (!self.vectorRef) {
          return;
        }

        // Delegate to KonvaVector's commitMultiRegionTransform method
        // This method reads the proxy node coordinates and applies them directly
        if (typeof self.vectorRef.commitMultiRegionTransform === "function") {
          self.vectorRef.commitMultiRegionTransform();
        } else {
          console.error("📊 commitMultiRegionTransform method not available");
        }
      },

      /**
       * Override deleteRegion to handle selected points deletion
       * If points are selected (but not all), delete only those points
       * If all points are selected or none, delete the entire region
       * If region is part of multi-selection, always delete the entire region
       */
      deleteRegion() {
        // Check if this region is part of multi-selection
        // If so, always delete the entire region (don't check for selected points)
        const isMultiRegionSelected = self.object?.selectedRegions?.length > 1;

        if (!isMultiRegionSelected) {
          // Only check for selected points if NOT part of multi-selection
          // Check if we have selected points and if vectorRef is available
          if (self.vectorRef && typeof self.vectorRef.getSelectedPointIds === "function") {
            const selectedPointIds = self.vectorRef.getSelectedPointIds();
            const totalPoints = self.vertices.length;

            // If we have selected points AND not all points are selected, delete only those points
            if (selectedPointIds.length > 0 && selectedPointIds.length < totalPoints) {
              // Delete only the selected points
              if (typeof self.vectorRef.deletePointsByIds === "function") {
                self.vectorRef.deletePointsByIds(selectedPointIds);
                return; // Don't delete the entire region
              }
            }
            // Otherwise, fall through to delete the entire region
          }
        }

        // Delete the entire region (original behavior)
        // Call parent deleteRegion from KonvaRegionMixin
        const selectedTool = self.parent?.getToolsManager().findSelectedTool();
        selectedTool?.enable?.();
        // Call the parent deleteRegion which eventually calls annotation.deleteRegion(self)
        // We need to call it through the mixin chain
        if (self.annotation.isReadOnly()) return;
        if (self.isReadOnly()) return;
        if (self.selected) self.annotation.unselectAll(true);
        if (self.destroyRegion) self.destroyRegion();
        self.annotation.deleteRegion(self);
      },
    };
  });

const VectorRegionModel = types.compose(
  "VectorRegionModel",
  RegionsMixin,
  AreaMixin,
  NormalizationMixin,
  KonvaRegionMixin,
  Model,
);

const HtxVectorView = observer(({ item, suggestion }) => {
  const { store } = item;
  const regionStyles = useRegionStyles(item, {
    useStrokeAsFill: true,
  });

  // Get stage dimensions and scaling from the parent image view
  const stage = item.parent?.stageRef;
  const image = item.parent?.currentImageEntity ?? {};
  const stageWidth = image?.naturalWidth ?? 0;
  const stageHeight = image?.naturalHeight ?? 0;
  const { x: offsetX, y: offsetY } = item.parent?.layerZoomScalePosition ?? { x: 0, y: 0 };
  const disabled = item.disabled || suggestion || store.annotationStore.selected.isLinkingMode;
  const selected = !disabled; // Invert disabled to selected for KonvaVector
  const isDisabled = item.locked; // Completely disable all interactions when locked

  // Wait for stage to be properly initialized
  if (!item.parent?.stageWidth || !item.parent?.stageHeight) {
    return null;
  }

  // Check if move tool is selected (disable ghost line when move tool is active)
  const selectedTool = item.parent?.getToolsManager()?.findSelectedTool();
  const disableGhostLine = selectedTool?.fullName === "MoveTool";

  return (
    <RegionWrapper item={item}>
      <Group ref={(ref) => item.segGroupRef(ref)} name={item.id} visible={!item.hidden}>
        <KonvaVector
          ref={(kv) => item.setKonvaVectorRef(kv)}
          initialPoints={Array.from(item.vertices)}
          isMultiRegionSelected={item.object?.selectedRegions?.length > 1}
          disableGhostLine={disableGhostLine}
          onFinish={(e) => {
            console.log("on finish");
            if (disabled) return;
            e.evt.stopPropagation();
            e.evt.preventDefault();
            item.handleFinish();
          }}
          onTransformStart={() => {
            item.parent.annotation.history.freeze();
          }}
          onTransformEnd={(e) => {
            item.parent.annotation.history.unfreeze();
          }}
          onPointsChange={(points) => {
            item.updatePointsFromKonvaVector(points);
          }}
          onPathClosedChange={(isClosed) => {
            item.onPathClosedChange(isClosed);
          }}
          onGhostPointClick={(ghostPoint) => {
            // Only handle if we're drawing
            if (!item.isDrawing) {
              return;
            }

            if (item.vectorRef) {
              // Start and immediately commit to insert the point at ghost location
              const startResult = item.vectorRef.startPoint(ghostPoint.x, ghostPoint.y);
              if (startResult) {
                item.vectorRef.commitPoint(ghostPoint.x, ghostPoint.y);
              }
            }
          }}
          onClick={(e) => {
            if (e.evt.defaultPrevented) {
              return;
            }

            // Handle region selection
            if (item.isReadOnly()) return;
            if (item.parent.getSkipInteractions()) return;
            if (item.isDrawing) return;
            if (e.evt.altKey || e.evt.ctrlKey || e.evt.shiftKey || e.evt.metaKey) return;

            // If region was just selected (part of a double-click on unselected region),
            // ignore this click to prevent it from unselecting
            if (item._justSelected) {
              e.cancelBubble = true;
              return;
            }

            e.cancelBubble = true;

            // When clicking a selected region, set _justSelected flag temporarily
            // to prevent unselection if this is part of a double-click
            // The flag will be cleared by the double-click handler or after timeout
            if (item.selected) {
              item.setJustSelectedFlag(true);
              setTimeout(() => {
                // Only clear if still set (double-click handler might have cleared it)
                if (item._justSelected) {
                  item.clearJustSelectedFlag();
                }
              }, 200); // Slightly longer than debounce timeout to ensure double-click is detected
            }

            // Allow selection regardless of whether the path is closed
            // The Selection tool will handle multi-selection logic
            if (store.annotationStore.selected.isLinkingMode) {
              stage.container().style.cursor = Constants.DEFAULT_CURSOR;
            }

            item.setHighlight(false);
            item.onClickRegion(e);
          }}
          onMouseEnter={() => {
            if (store.annotationStore.selected.isLinkingMode) {
              item.setHighlight(true);
            }
            item.updateCursor(true);
          }}
          onMouseLeave={() => {
            if (store.annotationStore.selected.isLinkingMode) {
              item.setHighlight(false);
            }
            item.updateCursor();
          }}
          onDblClick={(e) => {
            e.evt.stopImmediatePropagation();
            e.evt.stopPropagation();
            e.evt.preventDefault();
            e.cancelBubble = true;

            // Clear the _justSelected flag if it was set (from first click of double-click)
            // This prevents unselection logic from running
            if (item._justSelected) {
              item.clearJustSelectedFlag();
            }

            // Always ensure the region is selected first
            // This handles the case where double-click starts from unselected state
            const annotation = item.annotation;
            if (!item.selected && annotation) {
              // Select the region directly without going through _selectArea
              // to avoid any potential unselection logic
              annotation.selectArea(item);
            }

            // Always toggle transform mode for double-click (regardless of initial state)
            // This ensures double-click always enters transform mode, whether starting from
            // selected or unselected state
            item.toggleTransformMode();

            // Ensure the region stays selected after entering transform mode
            // Transform mode requires the region to be selected (see line 868: transformMode={item.selected && ...})
            if (!item.selected && annotation) {
              annotation.selectArea(item);
            }
          }}
          closed={item.closed}
          width={stageWidth}
          height={stageHeight}
          scaleX={item.parent.stageZoom}
          scaleY={item.parent.stageZoom}
          x={0}
          y={0}
          transformMode={item.selected && item.transformMode && !isDisabled}
          transform={{ zoom: item.parent.stageZoom, offsetX, offsetY }}
          fitScale={item.parent.zoomScale}
          allowClose={item.control?.closable ?? false}
          allowBezier={item.control?.curves ?? false}
          minPoints={item.minPoints}
          maxPoints={item.maxPoints}
          skeletonEnabled={item.control?.skeleton ?? false}
          stroke={item.selected ? "#ff0000" : regionStyles.strokeColor}
          fill={regionStyles.fillColor}
          strokeWidth={regionStyles.strokeWidth}
          opacity={Number.parseFloat(item.control?.opacity || "1")}
          pixelSnapping={item.control?.snap === "pixel"}
          selected={selected}
          disabled={isDisabled}
          // Point styling - customize point appearance based on control settings
          pointRadius={item.pointRadiusFromSize}
          pointFill={item.selected ? "#ffffff" : "#f8fafc"}
          pointStroke={item.selected ? "#ff0000" : regionStyles.strokeColor}
          pointStrokeSelected="#ff6b35"
          pointStrokeWidth={item.selected ? 2 : 1}
          disableInternalPointAddition={true}
        />

        {item.vertices.length > 0 && (
          <LabelOnPolygon item={item} color={regionStyles.strokeColor} strokewidth={regionStyles.strokeWidth} />
        )}
      </Group>
    </RegionWrapper>
  );
});

Registry.addTag("vectorregion", VectorRegionModel, HtxVectorView);
Registry.addRegionType(VectorRegionModel, "image", (value) => !!value.vertices);

export { VectorRegionModel, HtxVectorView as HtxVector };
