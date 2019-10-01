import React, { Component } from "react";
import { observer, inject, Provider } from "mobx-react";
import { detach, types, getType, getParentOfType, destroy, getRoot, isValidReference } from "mobx-state-tree";

import { Stage, Layer, Rect, Text, Group, Line, Image, Transformer } from "react-konva";
import { Icon } from "antd";

import Registry from "../../core/Registry";
import { guidGenerator, cloneNode, restoreNewsnapshot } from "../../core/Helpers";
import Tree from "../../core/Tree";

import { RectRegionModel } from "./RectRegion";
import { PolygonRegionModel } from "./PolygonRegion";
import { KeyPointRegionModel } from "./KeyPointRegion";
import ProcessAttrsMixin from "../mixins/ProcessAttrs";

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
 */
const TagAttrs = types.model({
  name: types.maybeNull(types.string),
  value: types.maybeNull(types.string),
  resize: types.maybeNull(types.string),
  width: types.optional(types.string, "100%"),
  maxwidth: types.optional(types.string, "750px"),

  // rulers: types.optional(types.boolean, true),
  grid: types.optional(types.boolean, false),
  gridSize: types.optional(types.number, 30),
  gridColor: types.optional(types.string, "#EEEEF4"),

  zoom: types.optional(types.boolean, false),
  negativezoom: types.optional(types.boolean, false),
  zoomby: types.optional(types.string, "1.1"),
  showmousepos: types.optional(types.boolean, false),
});

const Model = types
  .model({
    id: types.identifier,
    type: "image",
    _value: types.optional(types.string, ""),
    sizeUpdated: types.optional(types.boolean, false),
    stageWidth: types.optional(types.integer, 1),
    stageHeight: types.optional(types.integer, 1),
    naturalWidth: types.optional(types.integer, 1),
    naturalHeight: types.optional(types.integer, 1),

    zoomScale: types.optional(types.number, 1),
    zoomPosX: types.maybeNull(types.number),
    zoomPosY: types.maybeNull(types.number),

    cursorPositionX: types.optional(types.number, 0),
    cursorPositionY: types.optional(types.number, 0),

    mode: types.optional(types.enumeration(["drawing", "viewing"]), "viewing"),

    posStartX: types.optional(types.number, 0),
    posStartY: types.optional(types.number, 0),

    posNowX: types.optional(types.number, 0),
    posNowY: types.optional(types.number, 0),

    selectedShape: types.safeReference(types.union(RectRegionModel, PolygonRegionModel, KeyPointRegionModel)),
    activePolygon: types.maybeNull(types.safeReference(PolygonRegionModel)),

    activeShape: types.maybeNull(RectRegionModel),

    shapes: types.array(types.union(RectRegionModel, PolygonRegionModel, KeyPointRegionModel), []),
  })
  .views(self => ({
    get hasStates() {
      const states = self.states();
      return states && states.length > 0;
    },

    get completion() {
      return getRoot(self).completionStore.selected;
    },

    states() {
      return self.completion.toNames.get(self.name);
    },

    controlButton() {
      const names = self.completion.toNames.get(self.name);

      let r = names[0];

      names.forEach(item => {
        if (item.type === "rectanglelabels") {
          r = item;
        }
      });

      return r;
    },

    get controlButtonType() {
      const name = self.controlButton();
      return getType(name).name;
    },
  }))
  .actions(self => ({
    setActivePolygon(poly) {
      self.activePolygon = poly;
    },

    setPointerPosition({ x, y }) {
      self.cursorPositionX = x;
      self.cursorPositionY = y;
    },

    setZoom(scale, x, y) {
      self.resize = scale + "";
      self.zoomScale = scale;
      self.zoomPosX = x;
      self.zoomPosY = y;
    },

    setMode(mode) {
      self.mode = mode;
    },

    updateIE(ev) {
      const { width, height, naturalWidth, naturalHeight } = ev.target;

      self.naturalWidth = naturalWidth;
      self.naturalHeight = naturalHeight;
      self.stageWidth = width;
      self.stageHeight = height;
      self.sizeUpdated = true;

      self.shapes.forEach(s => s.updateImageSize(width / naturalWidth, height / naturalHeight, width, height));
    },

    _setStageRef(ref) {
      self._stageRef = ref;
    },

    _deleteSelectedShape() {
      if (self.selectedShape) destroy(self.selectedShape);
    },

    setSelected(shape) {
      self.selectedShape = shape;
    },

    detachActiveShape(shape) {
      return detach(self.activeShape);
    },

    _addShape(shape) {
      self.shapes.push(shape);
      self.completion.addRegion(shape);
      self.setSelected(shape.id);
      shape.selectRegion();
    },

    startDraw({ x, y }) {
      let rect;
      let stroke = self.controlButton().strokecolor;

      if (self.controlButtonType == "RectangleModel") {
        self.setMode("drawing");
        rect = self._addRect(x, y, 1, 1, stroke, null, "px", true);
      } else if (self.controlButtonType == "RectangleLabelsModel") {
        self.lookupStates(null, (_, states) => {
          if (states && states.length) {
            stroke = states[0].getSelectedColor();
          }

          self.setMode("drawing");
          rect = self._addRect(x, y, 1, 1, stroke, states, "px", true);
        });
      }

      self.activeShape = rect;
    },

    updateDraw({ x, y }) {
      const shape = self.activeShape;

      const { x1, y1, x2, y2 } = reverseCoords({ x: shape._start_x, y: shape._start_y }, { x: x, y: y });

      shape.setPosition(x1, y1, x2 - x1, y2 - y1);
    },

    lookupStates(ev, fun) {
      const states = self.completion.toNames.get(self.name);
      const activeStates = states
        ? states
            .filter(c => c.isSelected == true)
            .filter(c => c.type == "rectanglelabels" || c.type == "keypointlabels" || c.type == "polygonlabels")
        : null;
      const clonedStates = activeStates ? activeStates.map(s => cloneNode(s)) : null;

      if (clonedStates.length !== 0) {
        fun(ev, clonedStates);
        activeStates && activeStates.forEach(s => s.type !== "choices" && s.unselectAll());
      }
    },

    onImageClick(ev) {
      const dispmap = {
        // RectangleModel: ev => self._addRectEv(ev),
        PolygonModel: ev => self._addPolyEv(ev),
        KeyPointModel: ev => self._addKeyPointEv(ev),

        PolygonLabelsModel: ev => {
          if (self.activePolygon && !self.activePolygon.closed) {
            self._addPolyEv(ev);
          } else {
            self.lookupStates(ev, self._addPolyEv);
          }
        },
        KeyPointLabelsModel: ev => {
          self.lookupStates(ev, self._addKeyPointEv);
        },
        // RectangleLabelsModel: ev => {
        //   self.lookupStates(ev, self._addRectEv);
        // },
      };

      if (dispmap[self.controlButtonType]) return dispmap[self.controlButtonType](ev);
    },

    _addKeyPointEv(ev, states) {
      const wp = self.stageWidth / self.naturalWidth;
      const hp = self.stageHeight / self.naturalHeight;

      const { zoomPosX, zoomPosY } = self;

      const x = (ev.evt.offsetX - self.zoomPosX) / self.zoomScale;
      const y = (ev.evt.offsetY - self.zoomPosY) / self.zoomScale;

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

      self._addShape(kp);
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

      return self._addRect(Math.floor(wx - sw / 2), Math.floor(wy - sh / 2), sw, sh, stroke, states);
    },

    _addRect(x, y, sw, sh, stroke, states, coordstype, noadd) {
      // x = (x - self.zoomPosX) / self.zoomScale;
      // y = (y - self.zoomPosY) / self.zoomScale;

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

        strokewidth: parseInt(c.strokewidth),
        strokecolor: stroke,

        states: localStates,

        coordstype: coordstype,
      });

      if (noadd !== true) {
        self._addShape(rect);
      }

      return rect;
    },

    _addPolyEv(ev, states) {
      const w = 10;
      const isValid = isValidReference(() => self.activePolygon);

      if (!isValid || (self.activePolygon && self.activePolygon.closed)) {
        self.setActivePolygon(null);
      }

      if (self.completion.dragMode === false) {
        const x = (ev.evt.offsetX - self.zoomPosX) / self.zoomScale;
        const y = (ev.evt.offsetY - self.zoomPosY) / self.zoomScale;

        let stroke = self.controlButton().strokecolor;
        if (states && states.length) {
          stroke = states[0].getSelectedColor();
        }

        self._addPoly(x, y, w, stroke, states);

        const stage = self._stageRef;
        stage.container().style.cursor = "default";
      }
    },

    _addPoly(x, y, width, stroke, states, coordstype) {
      let poly = self.activePolygon;

      if (!poly) {
        const c = self.controlButton();

        poly = PolygonRegionModel.create({
          id: guidGenerator(),
          x: x,
          y: y,
          width: width,
          height: width,

          opacity: parseFloat(c.opacity),
          fillcolor: c.fillcolor,

          strokewidth: parseInt(c.strokewidth),
          strokecolor: stroke,

          pointsize: c.pointsize,
          pointstyle: c.pointstyle,

          states: states,

          coordstype: coordstype,
        });

        self.setActivePolygon(poly);

        self.shapes.push(poly);
        self.completion.addRegion(poly);
      }

      poly.addPoint(x, y);

      return poly;
    },

    /**
     * Resize of image canvas
     * @param {*} width
     * @param {*} height
     */
    onResizeSize(width, height) {
      self.stageHeight = height;
      self.stageWidth = width;
    },

    toStateJSON() {
      let t = self.shapes.map(r => r.toStateJSON());
      return t;
    },

    fromStateJSON(obj, fromModel) {
      const params = ["choices", "shape", "rectanglelabels"];

      /**
       * Check correct controls for image object
       */
      params.forEach(item => {
        if (!item in obj.value) {
          throw new Error("Not valid param");
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

        self._addRect(
          obj.value.x,
          obj.value.y,
          obj.value.width,
          obj.value.height,
          states.getSelectedColor(),
          [states],
          "perc",
        );
      }

      if (obj.value.keypointlabels) {
        const states = restoreNewsnapshot(fromModel);

        states.fromStateJSON(obj);
        self._addKeyPoint(obj.value.x, obj.value.y, obj.value.width, states.getSelectedColor(), [states], "perc");
      }

      if (obj.value.polygonlabels) {
        const states = restoreNewsnapshot(fromModel);

        states.fromStateJSON(obj);
        const poly = self._addPoly(
          obj.value.points[0][0],
          obj.value.points[0][1],
          10,
          states.getSelectedColor(),
          [states],
          "perc",
        );

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

const ImageModel = types.compose(
  "ImageModel",
  TagAttrs,
  Model,
  ProcessAttrsMixin,
);

function reverseCoords(r1, r2) {
  var r1x = r1.x,
    r1y = r1.y,
    r2x = r2.x,
    r2y = r2.y,
    d;
  if (r1x > r2x) {
    d = Math.abs(r1x - r2x);
    r1x = r2x;
    r2x = r1x + d;
  }
  if (r1y > r2y) {
    d = Math.abs(r1y - r2y);
    r1y = r2y;
    r2y = r1y + d;
  }
  return { x1: r1x, y1: r1y, x2: r2x, y2: r2y }; // return the corrected rect.
}

class TransformerComponent extends React.Component {
  componentDidMount() {
    this.checkNode();
  }

  componentDidUpdate() {
    this.checkNode();
  }

  checkNode() {
    // here we need to manually attach or detach Transformer node
    const stage = this.transformer.getStage();
    const { selectedShape } = this.props;

    if (!selectedShape) {
      this.transformer.detach();
      this.transformer.getLayer().batchDraw();
      return;
    }

    if (!selectedShape.supportsTransform) return;

    const selectedNode = stage.findOne("." + selectedShape.id);
    // do nothing if selected node is already attached
    if (selectedNode === this.transformer.node()) {
      return;
    }

    if (selectedNode) {
      // attach to another node
      this.transformer.attachTo(selectedNode);
    } else {
      // remove transformer
      this.transformer.detach();
    }
    this.transformer.getLayer().batchDraw();
  }

  render() {
    return (
      <Transformer
        resizeEnabled={true}
        rotateEnabled={this.props.rotateEnabled}
        anchorSize={8}
        ref={node => {
          this.transformer = node;
        }}
      />
    );
  }
}

const createGrid = (width, height, nodeSize) => {
  return [...Array(width)]
    .map((_, col) =>
      [...Array(height)].map((_, row) => ({
        col,
        row,
        x: col * nodeSize,
        y: row * nodeSize,
        fill: "#fff",
      })),
    )
    .reduce((p, c) => [...p, ...c]);
};

class HtxImageView extends Component {
  handleDblClick = ev => {
    // const item = this.props.item;
    // const poly = item.activePolygon;
    // if (poly)
    //     poly.closePoly();
    // item.setActivePolygon(null);
  };

  handleOnClick = ev => {
    const { item } = this.props;
    return item.onImageClick(ev);
  };

  handleMouseUp = e => {
    const { item } = this.props;
    if (item.mode == "drawing") {
      item.setMode("viewing");
      const as = item.detachActiveShape();
      if (as.width > 3 && as.height > 3) item._addShape(as);
    }
  };

  handleMouseMove = e => {
    const { item } = this.props;
    if (item.mode == "drawing") {
      const x = (e.evt.offsetX - item.zoomPosX) / item.zoomScale;
      const y = (e.evt.offsetY - item.zoomPosY) / item.zoomScale;

      item.updateDraw({ x: x, y: y });
    }

    item.setPointerPosition({ x: e.evt.offsetX, y: e.evt.offsetY });
  };

  handleMouseOver = e => {};

  handleStageMouseDown = e => {
    const { item } = this.props;

    if (item.controlButtonType === "PolygonLabelsModel") {
      return;
    }

    if (e.target === e.target.getStage() || (e.target.parent && e.target.parent.attrs.name == "ruler")) {
      // draw rect

      const x = (e.evt.offsetX - item.zoomPosX) / item.zoomScale;
      const y = (e.evt.offsetY - item.zoomPosY) / item.zoomScale;

      item.startDraw({ x: x, y: y });

      return;
    }

    // clicked on transformer - do nothing
    const clickedOnTransformer = e.target.getParent().className === "Transformer";
    if (clickedOnTransformer) {
      return;
    }

    return true;
  };

  handleZoom = e => {
    const { item } = this.props;

    e.evt.preventDefault();

    const stage = item._stageRef;
    const scaleBy = parseFloat(item.zoomby);
    const oldScale = stage.scaleX();

    const mousePointTo = {
      x: stage.getPointerPosition().x / oldScale - stage.x() / oldScale,
      y: stage.getPointerPosition().y / oldScale - stage.y() / oldScale,
    };

    const newScale = e.evt.deltaY > 0 ? oldScale * scaleBy : oldScale / scaleBy;

    if (item.negativezoom !== true && newScale <= 1) {
      item.setZoom(1, 0, 0);
      stage.scale({ x: 1, y: 1 });
      stage.position({ x: 0, y: 0 });
      stage.batchDraw();
      return;
    }

    stage.scale({ x: newScale, y: newScale });

    const newPos = {
      x: -(mousePointTo.x - stage.getPointerPosition().x / newScale) * newScale,
      y: -(mousePointTo.y - stage.getPointerPosition().y / newScale) * newScale,
    };

    item.setZoom(newScale, newPos.x, newPos.y);
    stage.position(newPos);
    stage.batchDraw();
  };

  renderGrid() {
    const { item } = this.props;
    const grid = createGrid(
      Math.ceil(item.stageWidth / item.gridSize),
      Math.ceil(item.stageHeight / item.gridSize),
      item.gridSize,
    );

    return (
      <Layer opacity={0.15} name="ruler">
        {Object.values(grid).map((n, i) => (
          <Rect
            key={i}
            x={n.x}
            y={n.y}
            width={item.gridSize}
            height={item.gridSize}
            stroke={item.gridColor}
            strokeWidth={1}
          />
        ))}
      </Layer>
    );
  }

  renderRulers() {
    const { item, store } = this.props;
    const width = 1;
    const color = "white";

    return (
      <Group
        name="ruler"
        onClick={ev => {
          ev.cancelBubble = false;
        }}
      >
        <Line
          x={0}
          y={item.cursorPositionY}
          points={[0, 0, item.stageWidth, 0]}
          strokeWidth={width}
          stroke={color}
          tension={0}
          dash={[4, 4]}
          closed
        />
        <Line
          x={item.cursorPositionX}
          y={0}
          points={[0, 0, 0, item.stageHeight]}
          strokeWidth={width}
          stroke={color}
          tension={0}
          dash={[1.5]}
          closed
        />
      </Group>
    );
  }

  updateDimensions() {
    // this.props.item.onResizeSize(this.container.offsetWidth, this.container.offsetHeight);
  }

  componentDidMount() {
    window.addEventListener("resize", this.updateDimensions.bind(this));
  }

  render() {
    const { item, store } = this.props;

    // TODO fix me
    if (!store.task) return null;

    const divStyle = {
      overflow: "hidden",
      width: item.stageWidth + "px",
    };

    const imgStyle = {
      // width: item.width,
      maxWidth: item.maxwidth,
      transformOrigin: "left top",
    };

    if (item.zoomScale != 1) {
      let { zoomPosX, zoomPosY } = item;
      const translate = "translate(" + zoomPosX + "px," + zoomPosY + "px) ";
      imgStyle["transform"] = translate + "scale(" + item.resize + ", " + item.resize + ")";
    }

    if (item.hasStates) {
      return (
        <div style={{ position: "relative" }}>
          <div
            ref={node => {
              this.container = node;
            }}
            style={divStyle}
          >
            <img style={imgStyle} src={item._value} onLoad={item.updateIE} onClick={this.handleOnClick} />
          </div>
          <Stage
            ref={ref => {
              item._setStageRef(ref);
            }}
            style={{ position: "absolute", top: 0, left: 0 }}
            width={item.stageWidth}
            height={item.stageHeight}
            scaleX={item.scale}
            scaleY={item.scale}
            onDblClick={this.handleDblClick}
            onClick={this.handleOnClick}
            onMouseDown={this.handleStageMouseDown}
            onMouseMove={this.handleMouseMove}
            onMouseUp={this.handleMouseUp}
            onWheel={item.zoom === true ? this.handleZoom : () => {}}
          >
            {item.grid && item.sizeUpdated && this.renderGrid()}
            <Layer>
              {item.shapes.map(s => {
                return Tree.renderItem(s);
              })}
              {item.activeShape && Tree.renderItem(item.activeShape)}

              <TransformerComponent rotateEnabled={item.controlButton().canrotate} selectedShape={item.selectedShape} />
            </Layer>
          </Stage>
        </div>
      );
    } else {
      divStyle["marginTop"] = "1em";
      return (
        <div style={divStyle}>
          <img style={imgStyle} src={item._value} onLoad={item.updateIE} />
        </div>
      );
    }
  }
}

const HtxImage = inject("store")(observer(HtxImageView));

Registry.addTag("image", ImageModel, HtxImage);

export { ImageModel, HtxImage };
