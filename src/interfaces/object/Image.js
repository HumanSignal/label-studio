import React, { Component } from "react";
import { observer, inject, Provider } from "mobx-react";
import {
  detach,
  types,
  flow,
  getParent,
  getType,
  getParentOfType,
  destroy,
  getRoot,
  isValidReference,
} from "mobx-state-tree";

import Registry from "../../core/Registry";
import { guidGenerator, cloneNode, restoreNewsnapshot } from "../../core/Helpers";

import { RectRegionModel } from "./RectRegion";
import { PolygonRegionModel } from "./PolygonRegion";
import { KeyPointRegionModel } from "./KeyPointRegion";
import ProcessAttrsMixin from "../mixins/ProcessAttrs";
import Infomodal from "../../components/Infomodal/Infomodal";

import ImageView from "../../components/ImageView/ImageView";

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
  rectanglelabels: "rectanglelabels",
  keypointlabels: "keypointlabels",
  polygonlabels: "polygonlabels",
};

/**
 * Reverse coordinates if user drags left and up
 * @param {*} r1
 * @param {*} r2
 */
function reverseCoordinates(r1, r2) {
  let r1X = r1.x,
    r1Y = r1.y,
    r2X = r2.x,
    r2Y = r2.y,
    d;

  if (r1X > r2X) {
    d = Math.abs(r1X - r2X);
    r1X = r2X;
    r2X = r1X + d;
  }

  if (r1Y > r2Y) {
    d = Math.abs(r1Y - r2Y);
    r1Y = r2Y;
    r2Y = r1Y + d;
  }
  /**
   * Return the corrected rect
   */
  return { x1: r1X, y1: r1Y, x2: r2X, y2: r2Y };
}

const Model = types
  .model({
    id: types.identifier,
    type: "image",
    _value: types.optional(types.string, ""),

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

    /**
     * Mode
     */
    mode: types.optional(types.enumeration(["drawing", "viewing"]), "viewing"),

    selectedShape: types.safeReference(types.union(RectRegionModel, PolygonRegionModel, KeyPointRegionModel)),
    activePolygon: types.maybeNull(types.safeReference(PolygonRegionModel)),

    activeShape: types.maybeNull(RectRegionModel),

    shapes: types.array(types.union(RectRegionModel, PolygonRegionModel, KeyPointRegionModel), []),
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
    get completion() {
      return getRoot(self).completionStore.selected;
    },

    /**
     * @return {object}
     */
    states() {
      return self.completion.toNames.get(self.name);
    },

    controlButton() {
      const names = self.states();

      let returnedControl = names[0];

      names.forEach(item => {
        if (item.type === IMAGE_CONSTANTS.rectanglelabels) {
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
  .actions(self => ({
    freezeHistory() {
      getParent(self, 3).history.freeze();
    },
    /**
     * Request to HTTP Basic Auth
     */
    getSecureResource(store) {
      const requestToResource = flow(function*() {
        try {
          const req = yield store.fetchAuth(self._value, {
            username: store.task.auth.username,
            password: store.task.auth.password,
          });

          return req;
        } catch (err) {
          console.log(err);
        }
      });

      return requestToResource()
        .then(response => {
          return response.blob();
        })
        .then(data => {
          return URL.createObjectURL(data);
        });
    },

    /**
     * Update brightnessGrade of Image
     * @param {number} value
     */
    setBrightnessGrade(value) {
      self.brightnessGrade = value;
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

    updateIE(ev) {
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

    setStageRef(ref) {
      self.stageRef = ref;
      self.initialWidth = ref && ref.attrs && ref.attrs.width ? ref.attrs.width : 1;
      self.initialHeight = ref && ref.attrs && ref.attrs.height ? ref.attrs.height : 1;
    },

    /**
     * Set active Polygon
     */
    setActivePolygon(poly) {
      self.activePolygon = poly;
    },

    detachActivePolygon() {
      return detach(self.activePolygon);
    },

    deleteActivePolygon() {
      if (self.activePolygon) destroy(self.activePolygon);
    },

    deleteSelectedShape() {
      if (self.selectedShape) destroy(self.selectedShape);
    },

    setSelected(shape) {
      self.selectedShape = shape;
    },

    detachActiveShape(shape) {
      return detach(self.activeShape);
    },

    addShape(shape) {
      self.shapes.push(shape);
      self.completion.addRegion(shape);
      self.setSelected(shape.id);
      shape.selectRegion();
    },

    removeShape(shape) {
      destroy(shape);
    },

    startDraw({ x, y }) {
      let rect;
      let stroke = self.controlButton().strokecolor;

      if (self.controlButtonType === IMAGE_CONSTANTS.rectangleModel) {
        self.setMode("drawing");
        rect = self._addRect({ x: x, y: y, sh: 1, sw: 1, stroke: stroke, states: null, coordstype: "px", noadd: true });
      } else if (self.controlButtonType === IMAGE_CONSTANTS.rectangleLabelsModel) {
        self.lookupStates(null, (_, states) => {
          if (states && states.length) {
            stroke = states[0].getSelectedColor();
          }

          self.setMode("drawing");
          rect = self._addRect({
            x: x,
            y: y,
            sh: 1,
            sw: 1,
            stroke: stroke,
            states: states,
            coordstype: "px",
            noadd: true,
          });
        });
      }

      self.activeShape = rect;
    },

    updateDraw({ x, y }) {
      const shape = self.activeShape;
      self.freezeHistory();

      const { x1, y1, x2, y2 } = reverseCoordinates({ x: shape._start_x, y: shape._start_y }, { x: x, y: y });

      shape.setPosition(x1, y1, x2 - x1, y2 - y1, shape.rotation);
    },

    /**
     * Lookup states
     * @param {event} ev
     * @param {function} fun
     */
    lookupStates(ev, fun) {
      /**
       * Array of states
       */
      const states = self.completion.toNames.get(self.name);
      self.freezeHistory();

      /**
       * Find active states
       */
      const activeStates = states
        ? states
            .filter(c => c.isSelected)
            .filter(
              c =>
                c.type === IMAGE_CONSTANTS.rectanglelabels ||
                c.type === IMAGE_CONSTANTS.keypointlabels ||
                c.type === IMAGE_CONSTANTS.polygonlabels,
            )
        : null;

      const clonedStates = activeStates ? activeStates.map(s => cloneNode(s)) : null;

      if (clonedStates.length !== 0) {
        fun(ev, clonedStates);
        activeStates && activeStates.forEach(s => s.type !== "choices" && s.unselectAll());
      }
    },

    onImageClick(ev) {
      const dispmap = {
        PolygonModel: ev => self.addPolyEv(ev),
        KeyPointModel: ev => self._addKeyPointEv(ev),

        PolygonLabelsModel: ev => {
          if (self.activePolygon && !self.activePolygon.closed) {
            self.addPolyEv(ev);
          } else {
            self.completion.setLocalUpdate(true);
            self.lookupStates(ev, self.addPolyEv);
          }
        },
        KeyPointLabelsModel: ev => {
          self.lookupStates(ev, self._addKeyPointEv);
        },
      };

      if (dispmap[self.controlButtonType]) {
        return dispmap[self.controlButtonType](ev);
      }
    },

    _addKeyPointEv(ev, states) {
      const x = (ev.evt.offsetX - self.zoomingPositionX) / self.zoomScale;
      const y = (ev.evt.offsetY - self.zoomingPositionY) / self.zoomScale;

      const c = self.controlButton();

      let fillcolor = c.fillcolor;
      if (states && states.length) {
        fillcolor = states[0].getSelectedColor();
      }

      self._addKeyPoint(x, y, c.strokewidth, fillcolor, states);
    },

    _addKeyPoint(x, y, width, fillcolor, states, coordstype) {
      const c = self.controlButton();
      const kp = KeyPointRegionModel.create({
        id: guidGenerator(),
        x: x,
        y: y,
        width: parseFloat(width),
        opacity: parseFloat(c.opacity),
        fillcolor: fillcolor,
        states: states,
        coordstype: coordstype,
      });

      self.addShape(kp);
    },

    _addRectEv(ev, states) {
      const iw = 200;
      const ih = 200;

      // based on image width and height we can place rect somewhere
      // in the center
      const sw = 100;
      const sh = 100;
      // const name = guidGenerator();

      let stroke = self.controlButton().strokecolor;
      // let stroke = self.editor.rectstrokecolor;
      // const states = self.states;
      // TODO you may need to filter this states, check Text.js
      if (states && states.length) {
        stroke = states[0].getSelectedColor();
      }

      const wp = self.stageWidth / self.naturalWidth;
      const hp = self.stageHeight / self.naturalHeight;

      const wx = ev.evt.offsetX;
      const wy = ev.evt.offsetY;

      return self._addRect({
        x: Math.floor(wx - sw / 2),
        y: Math.floor(wy - sh / 2),
        sw: sw,
        sh: sh,
        stroke: stroke,
        states: states,
      });
    },

    _addRect({ x, y, sw, sh, stroke, states, coordstype, noadd, rotation }) {
      const c = self.controlButton();

      let localStates = states;

      if (states && !states.length) {
        localStates = [states];
      }

      const rect = RectRegionModel.create({
        id: guidGenerator(),

        x: x,
        y: y,

        width: sw,
        height: sh,

        opacity: parseFloat(c.opacity),
        fillcolor: c.fillcolor ? c.fillcolor : stroke,

        strokeWidth: c.strokeWidth,
        strokeColor: stroke,

        states: localStates,

        rotation: rotation,

        coordstype: coordstype,
      });

      if (noadd !== true) {
        self.addShape(rect);
      }

      return rect;
    },

    addPolyEv(ev, states) {
      self.freezeHistory();
      const w = 10;
      const isValid = isValidReference(() => self.activePolygon);

      if (!isValid || (self.activePolygon && self.activePolygon.closed)) {
        self.setActivePolygon(null);
      }

      if (self.completion.dragMode === false) {
        const x = (ev.evt.offsetX - self.zoomingPositionX) / self.zoomScale;
        const y = (ev.evt.offsetY - self.zoomingPositionY) / self.zoomScale;

        let stroke = self.controlButton().strokecolor;

        if (states && states.length) {
          stroke = states[0].getSelectedColor();
        }

        self._addPoly({ x: x, y: y, width: w, stroke: stroke, states: states, coordstype: "px", stateFlag: false });

        const stage = self.stageRef;

        stage.container().style.cursor = "default";
      }
    },

    addPolygonObject({ x, y, width, stroke, states, coordstype, stateFlag }) {
      self.freezeHistory();
      let activePolygon = self.activePolygon;

      return activePolygon;
    },

    /**
     * Add new polygon object
     * @param {number} x
     * @param {number} y
     * @param {number} width Width of Polygon line
     * @param {string} stroke Color of stroke
     * @param {array} states
     * @param {string} coordstype
     * @param {boolean} stateFlag
     * @param {string} id
     */
    _addPoly({ x, y, width, stroke, states, coordstype, stateFlag, id }) {
      let newPolygon = self.activePolygon;
      self.freezeHistory();

      if (stateFlag || !self.activePolygon) {
        const c = self.controlButton();
        const polygonID = id ? id : guidGenerator();
        const polygonOpacity = parseFloat(c.opacity);
        const polygonStrokeWidth = parseInt(c.strokewidth);

        newPolygon = PolygonRegionModel.create({
          id: polygonID,
          x: x,
          y: y,
          width: width,
          height: width,

          opacity: polygonOpacity,
          fillcolor: c.fillcolor,

          strokewidth: polygonStrokeWidth,
          strokecolor: stroke,

          pointsize: c.pointsize,
          pointstyle: c.pointstyle,

          states: states,

          coordstype: coordstype,
        });

        self.setActivePolygon(newPolygon);

        self.shapes.push(newPolygon);
        self.completion.addRegion(newPolygon);
      }

      newPolygon.addPoint(x, y);

      return newPolygon;
    },

    /**
     * Resize of image canvas
     * @param {*} width
     * @param {*} height
     */
    onResizeSize(width, height, userResize) {
      self.stageHeight = height;
      self.stageWidth = width;
      self.updateIE({
        target: { width: width, height: height, naturalWidth: 1, naturalHeight: 1, userResize: userResize },
      });
    },

    toStateJSON() {
      let t = self.shapes.map(r => r.toStateJSON());
      return t;
    },

    fromStateJSON(obj, fromModel) {
      const params = ["choices", "shape", "rectanglelabels", "polygonlabels"];

      /**
       * Check correct controls for image object
       */
      params.forEach(item => {
        if (!item in obj.value) {
          Infomodal.error("Not valid control for Image");
          return;
        }
      });

      /**
       * Choices
       */
      if (obj.value.choices) {
        self.completion.names.get(obj.from_name).fromStateJSON(obj);
      }

      /**
       * Rectangle labels
       */
      if (obj.value.rectanglelabels) {
        const states = restoreNewsnapshot(fromModel);

        states.fromStateJSON(obj);

        self._addRect({
          x: obj.value.x,
          y: obj.value.y,
          sw: obj.value.width,
          sh: obj.value.height,
          stroke: states.getSelectedColor(),
          states: [states],
          coordstype: "perc",
          rotation: obj.value.rotation,
        });
      }

      if (obj.value.keypointlabels) {
        const states = restoreNewsnapshot(fromModel);

        states.fromStateJSON(obj);
        self._addKeyPoint(obj.value.x, obj.value.y, obj.value.width, states.getSelectedColor(), [states], "perc");
      }

      if (obj.value.polygonlabels) {
        const states = restoreNewsnapshot(fromModel);

        states.fromStateJSON(obj);

        const poly = self._addPoly({
          id: obj.id,
          x: obj.value.points[0][0],
          y: obj.value.points[0][1],
          width: 10,
          stroke: states.getSelectedColor(),
          states: [states],
          coordstype: "perc",
          stateFlag: true,
        });

        for (var i = 1; i < obj.value.points.length; i++) {
          poly.addPoint(obj.value.points[i][0], obj.value.points[i][1]);
        }

        poly.closePoly();
      }

      /**
       * Shapes
       */
      if (obj.value.shape) {
        let modifySnap;
        let shapeModel;

        if (obj.from_name !== obj.to_name) {
          modifySnap = restoreNewsnapshot(fromModel);
          shapeModel = modifySnap.fromStateJSON(obj);
          self.shapes.push(shapeModel);
        }
      }
    },
  }));

const ImageModel = types.compose("ImageModel", TagAttrs, Model, ProcessAttrsMixin);

const HtxImage = inject("store")(observer(ImageView));

Registry.addTag("image", ImageModel, HtxImage);

export { ImageModel, HtxImage };
