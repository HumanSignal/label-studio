import { detach, types, flow, getParent, getType, destroy, getRoot } from "mobx-state-tree";
import { observer, inject } from "mobx-react";

import * as Tools from "../../tools";
import ImageView from "../../components/ImageView/ImageView";
import ObjectBase from "./Base";
import ProcessAttrsMixin from "../../mixins/ProcessAttrs";
import Registry from "../../core/Registry";
import ToolsManager from "../../tools/Manager";
import { BrushRegionModel } from "../../regions/BrushRegion";
import { KeyPointRegionModel } from "../../regions/KeyPointRegion";
import { PolygonRegionModel } from "../../regions/PolygonRegion";
import { RectRegionModel } from "../../regions/RectRegion";

/**
 * Image tag shows an image on the page
 * @example
 * <View>
 *   <Image value="$url"></Image>
 * </View>
 * @example
 * <View>
 *   <Image value="https://imgflip.com/s/meme/Leonardo-Dicaprio-Cheers.jpg" width="100%" maxWidth="750px"></Image>
 * </View>
 * @name Image
 * @param {string} name name of the element
 * @param {string} value value
 * @param {string=} [width=100%] image width
 * @param {string=} [maxWidth=750px] image maximum width
 * @param {boolean=} zoom enable zooming an image by the mouse wheel
 * @param {boolean=} negativeZoom enable zooming out an image
 * @param {float=} [zoomBy=1.1] scale factor
 * @param {boolean=} [grid=false] show grid
 * @param {number=} [gridSize=30] size of the grid
 * @param {string=} [gridColor="#EEEEF4"] color of the grid, opacity is 0.15
 * @param {boolean=} showMousePos show mouse position coordinates under an image
 * @param {boolean} brightness brightness of the image
 */
const TagAttrs = types.model({
  name: types.maybeNull(types.string),
  value: types.maybeNull(types.string),
  resize: types.maybeNull(types.number),
  width: types.optional(types.string, "100%"),
  maxwidth: types.optional(types.string, "750px"),

  // rulers: types.optional(types.boolean, true),
  grid: types.optional(types.boolean, false),
  gridSize: types.optional(types.number, 30),
  gridColor: types.optional(types.string, "#EEEEF4"),

  zoom: types.optional(types.boolean, false),
  negativezoom: types.optional(types.boolean, false),
  zoomby: types.optional(types.string, "1.1"),

  brightness: types.optional(types.boolean, false),

  showmousepos: types.optional(types.boolean, false),
});

const IMAGE_CONSTANTS = {
  rectangleModel: "RectangleModel",
  rectangleLabelsModel: "RectangleLabelsModel",
  brushLabelsModel: "BrushLabelsModel",
  rectanglelabels: "rectanglelabels",
  keypointlabels: "keypointlabels",
  polygonlabels: "polygonlabels",
  brushlabels: "brushlabels",
  brushModel: "BrushModel",
};

const Model = types
  .model({
    id: types.identifier,
    type: "image",
    _value: types.optional(types.string, ""),

    // tools: types.array(BaseTool),

    sizeUpdated: types.optional(types.boolean, false),

    /**
     * Natural sizes of Image
     * Constants
     */
    naturalWidth: types.optional(types.integer, 1),
    naturalHeight: types.optional(types.integer, 1),

    /**
     * Initial width and height of the image
     */
    initialWidth: types.optional(types.integer, 1),
    initialHeight: types.optional(types.integer, 1),

    stageWidth: types.optional(types.integer, 1),
    stageHeight: types.optional(types.integer, 1),

    /**
     * Zoom Scale
     */
    zoomScale: types.optional(types.number, 1),

    /**
     * Coordinates of left top corner
     * Default: { x: 0, y: 0 }
     */
    zoomingPositionX: types.maybeNull(types.number),
    zoomingPositionY: types.maybeNull(types.number),

    /**
     * Brightness of Canvas
     */
    brightnessGrade: types.optional(types.number, 100),

    /**
     * Cursor coordinates
     */
    cursorPositionX: types.optional(types.number, 0),
    cursorPositionY: types.optional(types.number, 0),

    brushControl: types.optional(types.string, "brush"),

    brushStrokeWidth: types.optional(types.number, 15),

    /**
     * Mode
     * brush for Image Segmentation
     * eraser for Image Segmentation
     */
    mode: types.optional(types.enumeration(["drawing", "viewing", "brush", "eraser"]), "viewing"),

    selectedShape: types.safeReference(
      types.union(BrushRegionModel, RectRegionModel, PolygonRegionModel, KeyPointRegionModel),
    ),
    // activePolygon: types.maybeNull(types.safeReference(PolygonRegionModel)),

    // activeShape: types.maybeNull(types.union(RectRegionModel, BrushRegionModel)),

    shapes: types.array(types.union(BrushRegionModel, RectRegionModel, PolygonRegionModel, KeyPointRegionModel), []),
  })
  .views(self => ({
    /**
     * @return {boolean}
     */
    get hasStates() {
      const states = self.states();
      return states && states.length > 0;
    },

    /**
     * @return {object}
     */
    completion() {
      // return Types.getParentOfTypeString(self, "Completion");
      return getRoot(self).completionStore.selected;
    },

    /**
     * @return {object}
     */
    states() {
      return self.completion().toNames.get(self.name);
    },

    controlButton() {
      const names = self.states();
      if (!names || names.length === 0) return;

      let returnedControl = names[0];

      names.forEach(item => {
        if (item.type === IMAGE_CONSTANTS.rectanglelabels || item.type === IMAGE_CONSTANTS.brushlabels) {
          returnedControl = item;
        }
      });

      return returnedControl;
    },

    get controlButtonType() {
      const name = self.controlButton();
      return getType(name).name;
    },
  }))

  // actions for the tools
  .actions(self => {
    // tools
    let tools = {};
    const toolsManager = new ToolsManager({ obj: self });

    function afterCreate() {
      // console.log(self.id);
      // console.log(getType(self));
      // toolsManager.addTool("zoom", Tools.Zoom.create({}, { manager: toolsManager }));
      // tools["zoom"] = Tools.Zoom.create({ image: self.id });
      // tools["zoom"]._image = self;
      // console.log(getRoot(self));
      // const st = self.states();
      // self.states().forEach(item => {
      // const tools = item.getTools();
      // if (tools)
      //     tools.forEach(t => t._image = self);
      // });
    }

    function getTools() {
      return Object.values(tools);
    }

    function getToolsManager() {
      return toolsManager;
    }

    function beforeDestroy() {
      tools = null;
    }

    function afterAttach() {
      // console.log("afterAttach Image");
      // console.log(self.completion().toNames);
      // console.log(self.states());
      // self.states() && self.states().forEach(item => {
      //     console.log("TOOOL:");
      //     console.log(item.getTools().get("keypoint"));
      // });
    }

    return { afterCreate, beforeDestroy, getTools, afterAttach, getToolsManager };
  })

  .actions(self => ({
    freezeHistory() {
      //self.completion.history.freeze();
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

    setGridSize(value) {
      self.gridSize = value;
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
    setZoom(scale, x, y) {
      self.resize = scale;
      self.zoomScale = scale;
      self.zoomingPositionX = x;
      self.zoomingPositionY = y;
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

    setStageRef(ref) {
      self.stageRef = ref;
      self.initialWidth = ref && ref.attrs && ref.attrs.width ? ref.attrs.width : 1;
      self.initialHeight = ref && ref.attrs && ref.attrs.height ? ref.attrs.height : 1;
    },

    setSelected(shape) {
      self.selectedShape = shape;
    },

    updateImageSize(ev) {
      const { width, height, naturalWidth, naturalHeight, userResize } = ev.target;

      self.naturalWidth = naturalWidth;
      self.naturalHeight = naturalHeight;
      self.stageWidth = width;
      self.stageHeight = height;
      self.sizeUpdated = true;

      self.shapes.forEach(shape => {
        shape.updateImageSize(width / naturalWidth, height / naturalHeight, width, height, userResize);
      });
    },

    addShape(shape) {
      self.shapes.push(shape);

      self.completion().addRegion(shape);
      self.setSelected(shape.id);
      shape.selectRegion();
    },

    getEvCoords(ev) {
      const x = (ev.evt.offsetX - self.zoomingPositionX) / self.zoomScale;
      const y = (ev.evt.offsetY - self.zoomingPositionY) / self.zoomScale;

      return [x, y];
    },

    /**
     * Resize of image canvas
     * @param {*} width
     * @param {*} height
     */
    onResize(width, height, userResize) {
      self.stageHeight = height;
      self.stageWidth = width;
      self.updateImageSize({
        target: { width: width, height: height, naturalWidth: 1, naturalHeight: 1, userResize: userResize },
      });
    },

    onImageClick(ev) {
      const coords = self.getEvCoords(ev);
      self.getToolsManager().event("click", ev, ...coords);
    },

    onMouseDown(ev) {
      const coords = self.getEvCoords(ev);
      self.getToolsManager().event("mousedown", ev, ...coords);
    },

    onMouseMove(ev) {
      const coords = self.getEvCoords(ev);
      self.getToolsManager().event("mousemove", ev, ...coords);
    },

    onMouseUp(ev) {
      self.getToolsManager().event("mouseup", ev);
    },

    toStateJSON() {
      return self.shapes.map(r => r.toStateJSON());
    },

    /**
     * Transform JSON data (completions and predictions) to format
     */
    fromStateJSON(obj, fromModel) {
      if (obj.value.choices) {
        self
          .completion()
          .names.get(obj.from_name)
          .fromStateJSON(obj);
      }

      self
        .getToolsManager()
        .allTools()
        .forEach(t => t.fromStateJSON && t.fromStateJSON(obj, fromModel));
    },
  }));

const ImageModel = types.compose("ImageModel", TagAttrs, Model, ProcessAttrsMixin, ObjectBase);

const HtxImage = inject("store")(observer(ImageView));

Registry.addTag("image", ImageModel, HtxImage);

export { ImageModel, HtxImage };
