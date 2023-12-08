import { inject } from 'mobx-react';
import { destroy, getRoot, getType, types } from 'mobx-state-tree';

import ImageView from '../../../components/ImageView/ImageView';
import { customTypes } from '../../../core/CustomTypes';
import Registry from '../../../core/Registry';
import { AnnotationMixin } from '../../../mixins/AnnotationMixin';
import { IsReadyWithDepsMixin } from '../../../mixins/IsReadyMixin';
import { BrushRegionModel } from '../../../regions/BrushRegion';
import { EllipseRegionModel } from '../../../regions/EllipseRegion';
import { KeyPointRegionModel } from '../../../regions/KeyPointRegion';
import { PolygonRegionModel } from '../../../regions/PolygonRegion';
import { RectRegionModel } from '../../../regions/RectRegion';
import * as Tools from '../../../tools';
import ToolsManager from '../../../tools/Manager';
import { parseValue } from '../../../utils/data';
import {
  FF_DEV_3377,
  FF_DEV_3666,
  FF_DEV_3793,
  FF_DEV_4081,
  FF_LSDV_4583,
  FF_LSDV_4583_6,
  FF_LSDV_4711,
  FF_ZOOM_OPTIM,
  isFF
} from '../../../utils/feature-flags';
import { guidGenerator } from '../../../utils/unique';
import { clamp, isDefined } from '../../../utils/utilities';
import ObjectBase from '../Base';
import { DrawingRegion } from './DrawingRegion';
import { ImageEntityMixin } from './ImageEntityMixin';
import { ImageSelection } from './ImageSelection';
import { RELATIVE_STAGE_HEIGHT, RELATIVE_STAGE_WIDTH, SNAP_TO_PIXEL_MODE } from '../../../components/ImageView/Image';
import MultiItemObjectBase from '../MultiItemObjectBase';

const IMAGE_PRELOAD_COUNT = 3;

/**
 * The `Image` tag shows an image on the page. Use for all image annotation tasks to display an image on the labeling interface.
 *
 * Use with the following data types: images.
 *
 * When you annotate image regions with this tag, the annotations are saved as percentages of the original size of the image, from 0-100.
 *
 * @example
 * <!--Labeling configuration to display an image on the labeling interface-->
 * <View>
 *   <!-- Retrieve the image url from the url field in JSON or column in CSV -->
 *   <Image name="image" value="$url" rotateControl="true" zoomControl="true"></Image>
 * </View>
 *
 * @example
 * <!--Labeling configuration to perform multi-image segmentation-->
 *
 * <View>
 *   <!-- Retrieve the image url from the url field in JSON or column in CSV -->
 *   <Image name="image" valueList="$images" rotateControl="true" zoomControl="true"></Image>
 * </View>
 * <!-- {
 *   "data": {
 *     "images": [
 *       "https://images.unsplash.com/photo-1556740734-7f3a7d7f0f9c?ixlib=rb-1.2.1&ixid=eyJhcHBfaWQiOjEyMDd9&auto=format&fit=crop&w=1950&q=80",
 *       "https://images.unsplash.com/photo-1556740734-7f3a7d7f0f9c?ixlib=rb-1.2.1&ixid=eyJhcHBfaWQiOjEyMDd9&auto=format&fit=crop&w=1950&q=80",
 *     ]
 *   }
 * } -->
 * @name Image
 * @meta_title Image Tags for Images
 * @meta_description Customize Label Studio with the Image tag to annotate images for computer vision machine learning and data science projects.
 * @param {string} name                       - Name of the element
 * @param {string} value                      - Data field containing a path or URL to the image
 * @param {string} [valueList]                - References a variable that holds a list of image URLs
 * @param {boolean} [smoothing]               - Enable smoothing, by default it uses user settings
 * @param {string=} [width=100%]              - Image width
 * @param {string=} [maxWidth=750px]          - Maximum image width
 * @param {boolean=} [zoom=false]             - Enable zooming an image with the mouse wheel
 * @param {boolean=} [negativeZoom=false]     - Enable zooming out an image
 * @param {float=} [zoomBy=1.1]               - Scale factor
 * @param {boolean=} [grid=false]             - Whether to show a grid
 * @param {number=} [gridSize=30]             - Specify size of the grid
 * @param {string=} [gridColor=#EEEEF4]       - Color of the grid in hex, opacity is 0.15
 * @param {boolean} [zoomControl=false]       - Show zoom controls in toolbar
 * @param {boolean} [brightnessControl=false] - Show brightness control in toolbar
 * @param {boolean} [contrastControl=false]   - Show contrast control in toolbar
 * @param {boolean} [rotateControl=false]     - Show rotate control in toolbar
 * @param {boolean} [crosshair=false]         - Show crosshair cursor
 * @param {left|center|right} [horizontalAlignment=left]      - Where to align image horizontally. Can be one of "left", "center", or "right"
 * @param {top|center|bottom} [verticalAlignment=top]         - Where to align image vertically. Can be one of "top", "center", or "bottom"
 * @param {auto|original|fit} [defaultZoom=fit]               - Specify the initial zoom of the image within the viewport while preserving its ratio. Can be one of "auto", "original", or "fit"
 * @param {none|anonymous|use-credentials} [crossOrigin=none] - Configures CORS cross domain behavior for this image, either "none", "anonymous", or "use-credentials", similar to [DOM `img` crossOrigin property](https://developer.mozilla.org/en-US/docs/Web/API/HTMLImageElement/crossOrigin).
 */
const TagAttrs = types.model({
  value: types.maybeNull(types.string),
  valuelist: types.maybeNull(types.string),
  resize: types.maybeNull(types.number),
  width: types.optional(types.string, '100%'),
  height: types.maybeNull(types.string),
  maxwidth: types.optional(types.string, '100%'),
  maxheight: types.optional(types.string, 'calc(100vh - 194px)'),
  smoothing: types.maybeNull(types.boolean),

  // rulers: types.optional(types.boolean, true),
  grid: types.optional(types.boolean, false),
  gridsize: types.optional(types.string, '30'),
  gridcolor: types.optional(customTypes.color, '#EEEEF4'),

  zoom: types.optional(types.boolean, true),
  negativezoom: types.optional(types.boolean, false),
  zoomby: types.optional(types.string, '1.1'),

  showlabels: types.optional(types.boolean, false),

  zoomcontrol: types.optional(types.boolean, true),
  brightnesscontrol: types.optional(types.boolean, false),
  contrastcontrol: types.optional(types.boolean, false),
  rotatecontrol: types.optional(types.boolean, false),
  crosshair: types.optional(types.boolean, false),
  selectioncontrol: types.optional(types.boolean, true),

  // this property is just to turn lazyload off to e2e tests
  lazyoff: types.optional(types.boolean, false),

  horizontalalignment: types.optional(types.enumeration(['left', 'center', 'right']), 'left'),
  verticalalignment: types.optional(types.enumeration(['top', 'center', 'bottom']), 'top'),
  defaultzoom: types.optional(types.enumeration(['auto', 'original', 'fit']), 'fit'),

  crossorigin: types.optional(types.enumeration(['none', 'anonymous', 'use-credentials']), 'none'),
});

const IMAGE_CONSTANTS = {
  rectangleModel: 'RectangleModel',
  rectangleLabelsModel: 'RectangleLabelsModel',
  ellipseModel: 'EllipseModel',
  ellipseLabelsModel: 'EllipseLabelsModel',
  brushLabelsModel: 'BrushLabelsModel',
  rectanglelabels: 'rectanglelabels',
  keypointlabels: 'keypointlabels',
  polygonlabels: 'polygonlabels',
  brushlabels: 'brushlabels',
  brushModel: 'BrushModel',
  ellipselabels: 'ellipselabels',
};

const Model = types.model({
  type: 'image',

  // tools: types.array(BaseTool),

  sizeUpdated: types.optional(types.boolean, false),

  /**
   * Cursor coordinates
   */
  cursorPositionX: types.optional(types.number, 0),
  cursorPositionY: types.optional(types.number, 0),

  brushControl: types.optional(types.string, 'brush'),

  brushStrokeWidth: types.optional(types.number, 15),

  /**
   * Mode
   * brush for Image Segmentation
   * eraser for Image Segmentation
   */
  mode: types.optional(types.enumeration(['drawing', 'viewing', 'brush', 'eraser']), 'viewing'),

  regions: types.array(
    types.union(BrushRegionModel, RectRegionModel, EllipseRegionModel, PolygonRegionModel, KeyPointRegionModel),
    [],
  ),

  drawingRegion: types.optional(DrawingRegion, null),
  selectionArea: types.optional(ImageSelection, { start: null, end: null }),
}).volatile(() => ({
  currentImage: undefined,
  supportSuggestions: true,
})).views(self => ({
  get store() {
    return getRoot(self);
  },

  get multiImage() {
    return !!self.isMultiItem;
  },

  // an alias of currentImage to make an interface reusable
  get currentItemIndex() {
    return self.currentImage;
  },

  get parsedValue() {
    return parseValue(self.value, self.store.task.dataObj);
  },

  get parsedValueList() {
    return parseValue(self.valuelist, self.store.task.dataObj);
  },

  get currentSrc() {
    return self.currentImageEntity.src;
  },

  get usedValue() {
    return self.multiImage ? self.valuelist : self.value;
  },

  get images() {
    const value = self.parsedValue;

    if (!value) return [];
    if (Array.isArray(value)) return value;
    return [value];
  },

  /**
   * @return {boolean}
   */
  get hasStates() {
    const states = self.states();

    return states && states.length > 0;
  },

  get selectedRegions() {
    return self.regs.filter(region => region.inSelection);
  },

  get selectedRegionsBBox() {
    let bboxCoords;

    self.selectedRegions.forEach((region) => {
      const regionBBox = region.bboxCoords;

      if (!regionBBox) return;

      if (bboxCoords) {
        bboxCoords = {
          left: Math.min(regionBBox?.left, bboxCoords.left),
          top: Math.min(regionBBox?.top, bboxCoords.top),
          right: Math.max(regionBBox?.right, bboxCoords.right),
          bottom: Math.max(regionBBox?.bottom, bboxCoords.bottom),
        };
      } else {
        bboxCoords = regionBBox;
      }
    });
    return bboxCoords;
  },

  get regionsInSelectionArea() {
    return self.regs.filter(region => region.isInSelectionArea);
  },

  get selectedShape() {
    return self.regs.find(r => r.selected);
  },

  get suggestions() {
    return self.annotation?.regionStore.suggestions.filter(r => r.object === self) || [];
  },

  get useTransformer() {
    return self.getToolsManager().findSelectedTool()?.useTransformer === true;
  },

  get stageTranslate() {
    const {
      stageWidth: width,
      stageHeight: height,
    } = self;

    return {
      0: { x: 0, y: 0 },
      90: { x: 0, y: height },
      180: { x: width, y: height },
      270: { x: width, y: 0 },
    }[self.rotation];
  },

  get stageScale() {
    return self.zoomScale;
  },

  get hasTools() {
    return !!self.getToolsManager().allTools()?.length;
  },

  get imageCrossOrigin() {
    const value = self.crossorigin.toLowerCase();

    if (isFF(FF_LSDV_4711) && (!value || value === 'none')) return 'anonymous';

    if (!isFF(FF_DEV_4081)) {
      return null;
    } else if (!value || value === 'none') {
      return null;
    } else {
      return value;
    }
  },

  get fillerHeight() {
    const { naturalWidth, naturalHeight } = self;

    return self.isSideways
      ? `${naturalWidth / naturalHeight * 100}%`
      : `${naturalHeight / naturalWidth * 100}%`;
  },

  get zoomedPixelSize() {
    const { naturalWidth, naturalHeight } = self;

    if (isFF(FF_DEV_3793)) {
      return {
        x: 100 / naturalWidth,
        y: 100 / naturalHeight,
      };
    }

    return {
      x: self.stageWidth / naturalWidth,
      y: self.stageHeight / naturalHeight,
    };

  },

  isSamePixel({ x: x1, y: y1 }, { x: x2, y: y2 }) {
    const zoomedPixelSizeX = self.zoomedPixelSize.x;
    const zoomedPixelSizeY = self.zoomedPixelSize.y;

    return Math.abs(x1 - x2) < zoomedPixelSizeX / 2 && Math.abs(y1 - y2) < zoomedPixelSizeY / 2;
  },

  snapPointToPixel({ x,y }, snapMode = SNAP_TO_PIXEL_MODE.EDGE) {
    const zoomedPixelSizeX = self.zoomedPixelSize.x;
    const zoomedPixelSizeY = self.zoomedPixelSize.y;

    switch (snapMode) {
      case SNAP_TO_PIXEL_MODE.EDGE: {
        return {
          x: Math.round(x / zoomedPixelSizeX) * zoomedPixelSizeX,
          y: Math.round(y / zoomedPixelSizeY) * zoomedPixelSizeY,
        };
      }
      case SNAP_TO_PIXEL_MODE.CENTER: {
        return {
          x: Math.floor(x / zoomedPixelSizeX) * zoomedPixelSizeX + zoomedPixelSizeX / 2,
          y: Math.floor(y / zoomedPixelSizeY) * zoomedPixelSizeY + zoomedPixelSizeY / 2,
        };
      }
    }
  },

  createSerializedResult(region, value) {
    const index = region.item_index ?? 0;
    const currentImageEntity = self.findImageEntity(index);

    const imageDimension = {
      original_width: currentImageEntity.naturalWidth,
      original_height: currentImageEntity.naturalHeight,
      image_rotation: currentImageEntity.rotation,
    };

    if (self.multiImage && isDefined(index)) {
      imageDimension.item_index = index;
    }

    // We're using raw region result instead of calulated one when
    // the image data is not available (image is not yet loaded)
    // As the serialization also happens during region creation,
    // we have to forsee this scenario and avoid using raw result
    // as it can only be present for already created (submitter) regions
    const useRawResult = !currentImageEntity.imageLoaded && isDefined(region._rawResult);

    return useRawResult ? structuredClone(region._rawResult) : {
      ...imageDimension,
      value,
    };
  },

  /**
   * @return {object}
   */
  states() {
    return self.annotation.toNames.get(self.name);
  },

  activeStates() {
    const states = self.states();

    return states && states.filter(s => s.isSelected && s.type.includes('labels'));
  },

  controlButton() {
    const names = self.states();

    if (!names || names.length === 0) return;

    let returnedControl = names[0];

    names.forEach(item => {
      if (
        item.type === IMAGE_CONSTANTS.rectanglelabels ||
        item.type === IMAGE_CONSTANTS.brushlabels ||
        item.type === IMAGE_CONSTANTS.ellipselabels
      ) {
        returnedControl = item;
      }
    });

    return returnedControl;
  },

  get controlButtonType() {
    const name = self.controlButton();

    return getType(name).name;
  },

  get isSideways() {
    return (self.rotation + 360) % 180 === 90;
  },

  get stageComponentSize() {
    if (self.isSideways) {
      return {
        width: self.stageHeight,
        height: self.stageWidth,
      };
    }
    return {
      width: self.stageWidth,
      height: self.stageHeight,
    };
  },

  get canvasSize() {
    if (self.isSideways) {
      return {
        width: isFF(FF_DEV_3377)
          ? self.naturalHeight * self.stageZoomX
          : Math.round(self.naturalHeight * self.stageZoomX),
        height: isFF(FF_DEV_3377)
          ? self.naturalWidth * self.stageZoomY
          : Math.round(self.naturalWidth * self.stageZoomY),
      };
    }

    return {
      width: isFF(FF_DEV_3377)
        ? self.naturalWidth * self.stageZoomX
        : Math.round(self.naturalWidth * self.stageZoomX),
      height: isFF(FF_DEV_3377)
        ? self.naturalHeight * self.stageZoomY
        : Math.round(self.naturalHeight * self.stageZoomY),
    };
  },

  get alignmentOffset() {
    const offset = { x: 0, y: 0 };

    if (isFF(FF_ZOOM_OPTIM)) {
      switch (self.horizontalalignment) {
        case 'center': {
          offset.x = (self.containerWidth - self.canvasSize.width) / 2;
          break;
        }
        case 'right': {
          offset.x = (self.containerWidth - self.canvasSize.width);
          break;
        }
      }
      switch (self.verticalalignment) {
        case 'center': {
          offset.y = (self.containerHeight - self.canvasSize.height) / 2;
          break;
        }
        case 'bottom': {
          offset.y = (self.containerHeight - self.canvasSize.height);
          break;
        }
      }
    }
    return offset;
  },

  get zoomBy() {
    return parseFloat(self.zoomby);
  },
  get isDrawing() {
    return !!self.drawingRegion;
  },

  get imageTransform() {
    const imgStyle = {
      // scale transform leaves gaps on image border, so much better to change image sizes
      width: `${self.stageWidth * self.zoomScale}px`,
      height: `${self.stageHeight * self.zoomScale}px`,
      transformOrigin: 'left top',
      // We should always set some transform to make the image rendering in the same way all the time
      transform: 'translate3d(0,0,0)',
      filter: `brightness(${self.brightnessGrade}%) contrast(${self.contrastGrade}%)`,
    };
    const imgTransform = [];

    if (self.zoomScale !== 1) {
      const { zoomingPositionX = 0, zoomingPositionY = 0 } = self;

      imgTransform.push('translate3d(' + zoomingPositionX + 'px,' + zoomingPositionY + 'px, 0)');
    }

    if (self.rotation) {
      const translate = {
        90: '0, -100%',
        180: '-100%, -100%',
        270: '-100%, 0',
      };

      // there is a top left origin already set for zoom; so translate+rotate
      imgTransform.push(`rotate(${self.rotation}deg)`);
      imgTransform.push(`translate(${translate[self.rotation] || '0, 0'})`);

    }

    if (imgTransform?.length > 0) {
      imgStyle.transform = imgTransform.join(' ');
    }
    return imgStyle;
  },

  get maxScale() {
    return self.isSideways
      ? Math.min(self.containerWidth / self.naturalHeight, self.containerHeight / self.naturalWidth)
      : Math.min(self.containerWidth / self.naturalWidth, self.containerHeight / self.naturalHeight);
  },

  get coverScale() {
    return self.isSideways
      ? Math.max(self.containerWidth / self.naturalHeight, self.containerHeight / self.naturalWidth)
      : Math.max(self.containerWidth / self.naturalWidth, self.containerHeight / self.naturalHeight);
  },

  get viewPortBBoxCoords() {
    let width = self.canvasSize.width / self.zoomScale;
    let height = self.canvasSize.height / self.zoomScale;
    const leftOffset = -self.zoomingPositionX / self.zoomScale;
    const topOffset = -self.zoomingPositionY / self.zoomScale;
    const rightOffset = self.stageComponentSize.width - (leftOffset + width);
    const bottomOffset = self.stageComponentSize.height - (topOffset + height);
    const offsets = [leftOffset, topOffset, rightOffset, bottomOffset];

    if (self.isSideways) {
      [width, height] = [height, width];
    }
    if (self.rotation) {
      const rotateCount = (self.rotation / 90) % 4;

      for (let k = 0; k < rotateCount; k++) {
        offsets.push(offsets.shift());
      }
    }
    const left = offsets[0];
    const top = offsets[1];

    return {
      left,
      top,
      right: left + width,
      bottom: top + height,
      width,
      height,
    };
  },
}))

  // actions for the tools
  .actions(self => {
    const manager = ToolsManager.getInstance({ name: self.name });
    const env = { manager, control: self, object: self };

    function createImageEntities() {
      if (!self.store.task) return;

      const parsedValue = self.multiImage
        ? self.parsedValueList
        : self.parsedValue;

      if (Array.isArray(parsedValue)) {
        parsedValue.forEach((src, index) => {
          self.imageEntities.push({
            id: `${self.name}#${index}`,
            src,
            index,
          });
        });
      } else {
        self.imageEntities.push({
          id: `${self.name}#0`,
          src: parsedValue,
          index: 0,
        });
      }

      self.setCurrentImage(0);
    }

    function afterAttach() {
      if (self.selectioncontrol)
        manager.addTool('MoveTool', Tools.Selection.create({}, env));

      if (self.zoomcontrol)
        manager.addTool('ZoomPanTool', Tools.Zoom.create({}, env));

      if (self.brightnesscontrol)
        manager.addTool('BrightnessTool', Tools.Brightness.create({}, env));

      if (self.contrastcontrol)
        manager.addTool('ContrastTool', Tools.Contrast.create({}, env));

      if (self.rotatecontrol)
        manager.addTool('RotateTool', Tools.Rotate.create({}, env));

      createImageEntities();
    }

    function afterResultCreated(region) {
      if (!region) return;
      if (region.classification) return;
      if (!self.multiImage) return;

      region.setItemIndex?.(self.currentImage);
    }

    function getToolsManager() {
      return manager;
    }

    return {
      afterAttach,
      getToolsManager,
      afterResultCreated,
    };
  }).extend((self) => {
    let skipInteractions = false;

    return {
      views: {
        getSkipInteractions() {
          if (isFF(FF_ZOOM_OPTIM)) {
            if (skipInteractions) return true;

            const relationMode = self.annotation.relationMode;

            if (relationMode) return false;

            const manager = self.getToolsManager();
            const tool = manager.findSelectedTool();
            const canInteractWithRegions = tool?.canInteractWithRegions;

            return !canInteractWithRegions;
          } else {
            const manager = self.getToolsManager();

            const isPanning = manager.findSelectedTool()?.toolName === 'ZoomPanTool';

            return skipInteractions || isPanning;
          }
        },
      },
      actions: {
        setSkipInteractions(value) {
          skipInteractions = value;
        },
        updateSkipInteractions(e) {
          const currentTool = self.getToolsManager().findSelectedTool();

          if (currentTool?.shouldSkipInteractions) {
            return self.setSkipInteractions(currentTool.shouldSkipInteractions(e));
          }
          self.setSkipInteractions(e.evt && (e.evt.metaKey || e.evt.ctrlKey));
        },
      },
    };
  }).actions(self => ({
    freezeHistory() {
      //self.annotation.history.freeze();
    },

    afterRegionSelected(region) {
      if (self.multiImage) {
        self.setCurrentImage(region.item_index);
      }
    },

    createDrawingRegion(areaValue, resultValue, control, dynamic) {
      const controlTag = self.annotation.names.get(control.name);

      const result = {
        from_name: controlTag,
        to_name: self,
        type: control.resultType,
        value: resultValue,
      };

      const areaRaw = {
        id: guidGenerator(),
        object: self,
        ...areaValue,
        results: [result],
        dynamic,
        item_index: self.currentImage,
      };

      self.drawingRegion = areaRaw;
      return self.drawingRegion;
    },

    deleteDrawingRegion() {
      const { drawingRegion } = self;

      if (!drawingRegion) return;
      self.drawingRegion = null;
      destroy(drawingRegion);
    },

    setSelectionStart(point) {
      self.selectionArea.setStart(point);
    },
    setSelectionEnd(point) {
      self.selectionArea.setEnd(point);
    },
    resetSelection() {
      self.selectionArea.setStart(null);
      self.selectionArea.setEnd(null);
    },

    updateBrushControl(arg) {
      self.brushControl = arg;
    },

    updateBrushStrokeWidth(arg) {
      self.brushStrokeWidth = arg;
    },

    /**
     * Update brightnessGrade of Image
     * @param {number} value
     */
    setBrightnessGrade(value) {
      self.brightnessGrade = value;
    },

    setContrastGrade(value) {
      self.contrastGrade = value;
    },

    setGridSize(value) {
      self.gridsize = String(value);
    },

    // an alias of setCurrentImage for making an interface reusable
    setCurrentItem(index = 0) {
      self.setCurrentImage(index);
    },

    setCurrentImage(index = 0) {
      index = index ?? 0;
      if (index === self.currentImage) return;

      self.currentImage = index;
      self.currentImageEntity = self.findImageEntity(index);
      if (isFF(FF_LSDV_4583_6)) self.preloadImages();
    },

    preloadImages() {
      self.currentImageEntity.setImageLoaded(false);
      self.currentImageEntity.preload();

      if (self.multiImage) {
        const [currentIndex, length] = [self.currentImage, self.imageEntities.length];
        const prevSliceIndex = clamp(currentIndex - IMAGE_PRELOAD_COUNT, 0, currentIndex);
        const nextSliceIndex = clamp(currentIndex + 1 + IMAGE_PRELOAD_COUNT, currentIndex, length - 1);

        const images = [
          ...self.imageEntities.slice(prevSliceIndex, currentIndex),
          ...self.imageEntities.slice(currentIndex + 1, nextSliceIndex),
        ];

        images.forEach((imageEntity) => {
          imageEntity.preload();
        });
      }
    },

    /**
     * Set pointer of X and Y
     */
    setPointerPosition({ x, y }) {
      self.freezeHistory();
      self.cursorPositionX = x;
      self.cursorPositionY = y;
    },

    /**
     * Set zoom
     */
    setZoom(scale) {
      scale = clamp(scale, 1, Infinity);
      self.currentZoom = scale;

      // cool comment about all this stuff
      const maxScale = self.maxScale;
      const coverScale = self.coverScale;

      if (maxScale > 1) { // image < container
        if (scale < maxScale) { // scale = 1 or before stage size is max
          self.stageZoom = scale; // scale stage
          self.zoomScale = 1; // don't scale image
        } else {
          self.stageZoom = maxScale; // scale stage to max
          self.zoomScale = scale / maxScale; // scale image for the rest scale
        }
      } else { // image > container
        if (scale > maxScale) { // scale = 1 or any other zoom bigger then viewport
          self.stageZoom = maxScale; // stage squizzed
          self.zoomScale = scale; // scale image for the rest scale : scale image usually
        } else { // negative zoom bigger than image negative scale
          self.stageZoom = scale; // squize stage more
          self.zoomScale = 1; // don't scale image
        }
      }

      if (self.zoomScale > 1) {
        // zoomScale scales image above maxScale, so scale the rest of stage the same way
        const z = Math.min(maxScale * self.zoomScale, coverScale);

        if (self.containerWidth / self.naturalWidth > self.containerHeight / self.naturalHeight) {
          self.stageZoomX = z;
          self.stageZoomY = self.stageZoom;
        } else {
          self.stageZoomX = self.stageZoom;
          self.stageZoomY = z;
        }
      } else {
        self.stageZoomX = self.stageZoom;
        self.stageZoomY = self.stageZoom;
      }
    },

    updateImageAfterZoom() {
      const { stageWidth, stageHeight } = self;

      self._recalculateImageParams();

      if (stageWidth !== self.stageWidth || stageHeight !== self.stageHeight) {
        self._updateRegionsSizes({
          width: self.stageWidth,
          height: self.stageHeight,
          naturalWidth: self.naturalWidth,
          naturalHeight: self.naturalHeight,
        });
      }
    },

    setZoomPosition(x, y) {
      const [width, height] = isFF(FF_DEV_3377)
        ? [self.canvasSize.width, self.canvasSize.height]
        : [self.containerWidth, self.containerHeight];

      const [minX, minY] = [
        width - self.stageComponentSize.width * self.zoomScale,
        height - self.stageComponentSize.height * self.zoomScale,
      ];

      self.zoomingPositionX = clamp(x, minX, 0);
      self.zoomingPositionY = clamp(y, minY, 0);
    },

    resetZoomPositionToCenter() {
      const { stageComponentSize, zoomScale } = self;
      const { width, height } = stageComponentSize;

      const [containerWidth, containerHeight] = isFF(FF_DEV_3377)
        ? [self.canvasSize.width, self.canvasSize.height]
        : [self.containerWidth, self.containerHeight];

      self.setZoomPosition((containerWidth - width * zoomScale) / 2, (containerHeight - height * zoomScale) / 2);
    },

    sizeToFit() {
      const { maxScale } = self;

      self.defaultzoom = 'fit';
      self.setZoom(maxScale);
      self.updateImageAfterZoom();
      self.resetZoomPositionToCenter();
    },

    sizeToOriginal() {
      const { maxScale } = self;

      self.defaultzoom = 'original';
      self.setZoom(maxScale > 1 ? 1 : 1 / maxScale);
      self.updateImageAfterZoom();
      self.resetZoomPositionToCenter();
    },

    sizeToAuto() {
      self.defaultzoom = 'auto';
      self.setZoom(1);
      self.updateImageAfterZoom();
      self.resetZoomPositionToCenter();
    },

    handleZoom(val, mouseRelativePos = { x: self.canvasSize.width / 2, y: self.canvasSize.height / 2 }) {
      if (val) {
        let zoomScale = self.currentZoom;

        zoomScale = val > 0 ? zoomScale * self.zoomBy : zoomScale / self.zoomBy;
        if (self.negativezoom !== true && zoomScale <= 1) {
          self.setZoom(1);
          self.setZoomPosition(0, 0);
          self.updateImageAfterZoom();
          return;
        }
        if (zoomScale <= 1) {
          self.setZoom(zoomScale);
          self.setZoomPosition(0, 0);
          self.updateImageAfterZoom();
          return;
        }

        // DON'T TOUCH THIS
        let stageScale = self.zoomScale;

        const mouseAbsolutePos = {
          x: (mouseRelativePos.x - self.zoomingPositionX) / stageScale,
          y: (mouseRelativePos.y - self.zoomingPositionY) / stageScale,
        };

        self.setZoom(zoomScale);

        stageScale = self.zoomScale;

        const zoomingPosition = {
          x: -(mouseAbsolutePos.x - mouseRelativePos.x / stageScale) * stageScale,
          y: -(mouseAbsolutePos.y - mouseRelativePos.y / stageScale) * stageScale,
        };

        self.setZoomPosition(zoomingPosition.x, zoomingPosition.y);
        self.updateImageAfterZoom();
      }
    },

    /**
     * Set mode of Image (drawing and viewing)
     * @param {string} mode
     */
    setMode(mode) {
      self.mode = mode;
    },

    setImageRef(ref) {
      self.imageRef = ref;
    },

    setContainerRef(ref) {
      self.containerRef = ref;
    },

    setStageRef(ref) {
      self.stageRef = ref;

      const currentTool = self.getToolsManager().findSelectedTool();

      currentTool?.updateCursor?.();
    },

    setOverlayRef(ref) {
      self.overlayRef = ref;
    },

    // @todo remove
    setSelected() {
      // self.selectedShape = shape;
    },

    rotate(degree = -90) {
      self.rotation = (self.rotation + degree + 360) % 360;

      let ratioK = 1 / self.stageRatio;

      if (self.isSideways) {
        self.stageRatio = self.naturalWidth / self.naturalHeight;
      } else {
        self.stageRatio = 1;
      }
      ratioK = ratioK * self.stageRatio;

      self.setZoom(self.currentZoom);

      if (degree === -90) {
        this.setZoomPosition(
          self.zoomingPositionY * ratioK,
          self.stageComponentSize.height -
          self.zoomingPositionX * ratioK -
          self.stageComponentSize.height * self.zoomScale,
        );
      }
      if (degree === 90) {
        this.setZoomPosition(
          self.stageComponentSize.width -
          self.zoomingPositionY * ratioK -
          self.stageComponentSize.width * self.zoomScale,
          self.zoomingPositionX * ratioK,
        );
      }

      self.updateImageAfterZoom();
    },

    _recalculateImageParams() {
      self.stageWidth = isFF(FF_DEV_3377) ? self.naturalWidth * self.stageZoom : Math.round(self.naturalWidth * self.stageZoom);
      self.stageHeight = isFF(FF_DEV_3377) ? self.naturalHeight * self.stageZoom : Math.round(self.naturalHeight * self.stageZoom);
    },

    _updateImageSize({ width, height, userResize }) {
      if (self.naturalWidth === undefined) {
        return;
      }
      if (width > 1 && height > 1) {
        const prevWidth = self.canvasSize.width;
        const prevHeight = self.canvasSize.height;
        const prevStageZoom = self.stageZoom;
        const prevZoomScale = self.zoomScale;

        self.containerWidth = width;
        self.containerHeight = height;

        // reinit zoom to calc stageW/H
        self.setZoom(self.currentZoom);

        self._recalculateImageParams();

        const zoomChangeRatio = self.stageZoom / prevStageZoom;
        const scaleChangeRatio = self.zoomScale / prevZoomScale;
        const changeRatio = zoomChangeRatio * scaleChangeRatio;


        self.setZoomPosition(
          self.zoomingPositionX * changeRatio + (self.canvasSize.width / 2 - prevWidth / 2 * changeRatio),
          self.zoomingPositionY * changeRatio + (self.canvasSize.height / 2 - prevHeight / 2 * changeRatio),
        );
      }

      self.sizeUpdated = true;
      self._updateRegionsSizes({
        width: self.stageWidth,
        height: self.stageHeight,
        naturalWidth: self.naturalWidth,
        naturalHeight: self.naturalHeight,
        userResize,
      });
    },

    _updateRegionsSizes({ width, height, naturalWidth, naturalHeight, userResize }) {
      const _historyLength = self.annotation?.history?.history?.length;

      self.annotation.history.freeze();

      self.regions.forEach(shape => {
        shape.updateImageSize(width / naturalWidth, height / naturalHeight, width, height, userResize);
      });
      self.regs.forEach(shape => {
        shape.updateImageSize(width / naturalWidth, height / naturalHeight, width, height, userResize);
      });
      self.drawingRegion?.updateImageSize(width / naturalWidth, height / naturalHeight, width, height, userResize);

      setTimeout(self.annotation.history.unfreeze, 0);

      //sometimes when user zoomed in, annotation was creating a new history. This fix that in case the user has nothing in the history yet
      if (_historyLength <= 1) {
        // Don't force unselection of regions during the updateObjects callback from history reinit
        setTimeout(() => self.annotation?.reinitHistory(false), 0);
      }
    },

    updateImageSize(ev) {
      const { naturalWidth, naturalHeight } = self.imageRef ?? ev.target;
      const { offsetWidth, offsetHeight } = self.containerRef;

      self.naturalWidth = naturalWidth;
      self.naturalHeight = naturalHeight;

      self._updateImageSize({ width: offsetWidth, height: offsetHeight });
      // after regions' sizes adjustment we have to reset all saved history changes
      // mobx do some batch update here, so we have to reset it asynchronously
      // this happens only after initial load, so it's safe
      self.setReady(true);

      if (self.defaultzoom === 'fit') {
        self.sizeToFit();
      } else {
        self.sizeToAuto();
      }
      // Don't force unselection of regions during the updateObjects callback from history reinit
      setTimeout(() => self.annotation?.reinitHistory(false), 0);
    },

    checkLabels() {
      let labelStates;

      if (isFF(FF_DEV_3666)) {
        // there should be at least one available label or none of them should be selected
        labelStates = self.activeStates() || [];
      } else {
        // there is should be at least one state selected for *labels object
        labelStates = (self.states() || []).filter(s => s.type.includes('labels'));
      }
      const selectedStates = self.getAvailableStates();

      return selectedStates.length !== 0 || labelStates.length === 0;
    },

    addShape(shape) {
      self.regions.push(shape);
      self.annotation.addRegion(shape);
      self.setSelected(shape.id);
      shape.selectRegion();
    },

    /**
     * Resize of image canvas
     * @param {*} width
     * @param {*} height
     */
    onResize(width, height, userResize) {
      self._updateImageSize({ width, height, userResize });
    },

    event(name, ev, screenX, screenY) {
      const [canvasX, canvasY] = self.fixZoomedCoords([screenX, screenY]);

      const x = self.canvasToInternalX(canvasX);
      const y = self.canvasToInternalY(canvasY);

      self.getToolsManager().event(name, ev.evt || ev, x, y, canvasX, canvasY);
    },
  }));

const CoordsCalculations = types.model()
  .actions(self => ({
    // convert screen coords to image coords considering zoom
    fixZoomedCoords([x, y]) {
      if (!self.stageRef) {
        return [x, y];
      }

      // good official way, but maybe a bit slower and with repeating cloning
      const p = self.stageRef.getAbsoluteTransform().copy().invert().point({ x, y });

      return [p.x, p.y];
    },

    // convert image coords to screen coords considering zoom
    zoomOriginalCoords([x, y]) {
      const p = self.stageRef.getAbsoluteTransform().point({ x, y });

      return [p.x, p.y];
    },

    /**
     * @typedef {number[]|{ x: number, y: number }} Point
     */

    /**
     * @callback PointFn
     * @param {Point} point
     * @returns Point
     */

    /**
     * Wrap point operations to convert zoomed coords from screen to image and back
     * Good for event handlers, receiving screen coords, but working with image coords
     * Accepts both [x, y] and {x, y} points; preserves this format
     * @param {PointFn} fn wrapped function do some math with image coords
     * @return {PointFn} outer function do some math with screen coords
     */
    fixForZoom(fn) {
      return p => this.fixForZoomWrapper(p, fn);
    },
    fixForZoomWrapper(p, fn) {
      const asArray = p.x === undefined;
      const [x, y] = self.fixZoomedCoords(asArray ? p : [p.x, p.y]);
      const modified = fn(asArray ? [x, y] : { x, y });
      const zoomed = self.zoomOriginalCoords(asArray ? modified : [modified.x, modified.y]);

      return asArray ? zoomed : { x: zoomed[0], y: zoomed[1] };
    },
  }))
  // putting this transforms to views forces other getters to be recalculated on resize
  .views(self => ({
    // helps to calculate rotation because internal coords are square and real one usually aren't
    get whRatio() {
      // don't need this for absolute coords
      if (!isFF(FF_DEV_3793)) return 1;

      return self.stageWidth / self.stageHeight;
    },

    // @todo scale?
    canvasToInternalX(n) {
      return n / self.stageWidth * RELATIVE_STAGE_WIDTH;
    },

    canvasToInternalY(n) {
      return n / self.stageHeight * RELATIVE_STAGE_HEIGHT;
    },

    internalToCanvasX(n) {
      return n / RELATIVE_STAGE_WIDTH * self.stageWidth;
    },

    internalToCanvasY(n) {
      return n / RELATIVE_STAGE_HEIGHT * self.stageHeight;
    },
  }));

// mock coords calculations to transparently pass coords with FF 3793 off
const AbsoluteCoordsCalculations = CoordsCalculations
  .views(() => ({
    canvasToInternalX(n) {
      return n;
    },
    canvasToInternalY(n) {
      return n;
    },
    internalToCanvasX(n) {
      return n;
    },
    internalToCanvasY(n) {
      return n;
    },
  }));

const ImageModel = types.compose(
  'ImageModel',
  TagAttrs,
  ObjectBase,
  ...(isFF(FF_LSDV_4583) ? [MultiItemObjectBase] : []),
  AnnotationMixin,
  IsReadyWithDepsMixin,
  ImageEntityMixin,
  Model,
  isFF(FF_DEV_3793) ? CoordsCalculations : AbsoluteCoordsCalculations,
);

const HtxImage = inject('store')(ImageView);

Registry.addTag('image', ImageModel, HtxImage);
Registry.addObjectType(ImageModel);

export { ImageModel, HtxImage };
