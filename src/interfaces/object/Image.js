import React, { Component } from "react";
import { observer, inject, Provider } from "mobx-react";
import { types, getType, getParentOfType, destroy, getRoot, isValidReference } from "mobx-state-tree";

import { Stage, Layer, Rect, Text, Image, Transformer } from "react-konva";
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
 * @param {boolean=} showMousePos show mouse position coordinates under an image
 */
const TagAttrs = types.model({
  name: types.maybeNull(types.string),
  value: types.maybeNull(types.string),
  resize: types.maybeNull(types.string),
  width: types.optional(types.string, "100%"),
  maxwidth: types.optional(types.string, "750px"),
  zoom: types.optional(types.string, "false"),
  negativezoom: types.optional(types.string, "false"),
  zoomby: types.optional(types.string, "1.1"),
  showmousepos: types.optional(types.string, "false"),
});

const Model = types
  .model({
    id: types.identifier,
    type: "image",
    _value: types.optional(types.string, ""),
    stageWidth: types.optional(types.integer, 1),
    stageHeight: types.optional(types.integer, 1),
    naturalWidth: types.optional(types.integer, 1),
    naturalHeight: types.optional(types.integer, 1),

    zoomScale: types.optional(types.number, 1),
    zoomPosX: types.maybeNull(types.number),
    zoomPosY: types.maybeNull(types.number),

    cursorPositionX: types.optional(types.number, 0),
    cursorPositionY: types.optional(types.number, 0),

    selectedShape: types.safeReference(types.union(RectRegionModel, PolygonRegionModel, KeyPointRegionModel)),
    activePolygon: types.maybeNull(types.safeReference(PolygonRegionModel)),
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
      return names[0];
    },

    controlButtonType() {
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

    updateIE(ev) {
      const { width, height, naturalWidth, naturalHeight } = ev.target;

      if (self.hasStates) {
        self.naturalWidth = naturalWidth;
        self.naturalHeight = naturalHeight;
        self.stageWidth = width;
        self.stageHeight = height;

        self.shapes.forEach(s => s.updateImageSize(width / naturalWidth, height / naturalHeight, width, height));
      }
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

    _addShape(shape) {
      self.shapes.push(shape);
      self.completion.addRegion(shape);
      self.setSelected(shape.id);
      shape.selectRegion();
    },

    onImageClick(ev) {
      const callWithStates = function(ev, fun) {
        const states = self.completion.toNames.get(self.name);
        const activeStates = states ? states.filter(c => c.isSelected == true) : null;
        const clonedStates = activeStates ? activeStates.map(s => cloneNode(s)) : null;

        if (clonedStates.length !== 0) {
          fun(ev, clonedStates);
          activeStates && activeStates.forEach(s => s.type !== "choices" && s.unselectAll());
        }
      };

      const dispmap = {
        RectangleModel: ev => self._addRect(ev),
        PolygonModel: ev => self._addPoly(ev),
        KeyPointModel: ev => self._addKeyPoint(ev),

        RectangleLabelsModel: ev => {
          callWithStates(ev, (_, clonedStates) => {
            clonedStates.forEach(item => {
              if (item.type !== "choices" && item.isSelected) {
                self._addRect(ev, item);
              }
            });
          });
        },
        PolygonLabelsModel: ev => {
          if (self.activePolygon && !self.activePolygon.closed) {
            self._addPoly(ev);
          } else {
            callWithStates(ev, self._addPoly);
          }
        },
        KeyPointLabelsModel: ev => {
          callWithStates(ev, self._addKeyPoint);
        },
      };

      return dispmap[self.controlButtonType()](ev);
    },

    _addKeyPoint(ev, states) {
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

      const kp = KeyPointRegionModel.create({
        id: guidGenerator(),
        x: x,
        y: y,
        width: parseInt(c.strokewidth),
        opacity: parseFloat(c.opacity),
        fillcolor: fillcolor,
        states: states,
      });

      self._addShape(kp);
    },

    _addRect(ev, states) {
      const iw = 200;
      const ih = 200;

      // console.log(states.toJSON());

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

      self.__addRect(Math.floor(wx - sw / 2), Math.floor(wy - sh / 2), sw, sh, stroke, states);
    },

    __addRect(x, y, sw, sh, stroke, states, coordstype) {
      // x = (x - self.zoomPosX) / self.zoomScale;
      // y = (y - self.zoomPosY) / self.zoomScale;

      const c = self.controlButton();
      const rect = RectRegionModel.create({
        id: guidGenerator(),

        x: x,
        y: y,

        width: sw,
        height: sh,

        opacity: parseFloat(c.opacity),
        fillcolor: c.fillcolor,

        strokewidth: parseInt(c.strokewidth),
        strokecolor: stroke,

        states: states,

        coordstype: coordstype,
      });

      self._addShape(rect);
    },

    _addPoly(ev, states) {
      let poly;

      const w = 10;
      const isValid = isValidReference(() => self.activePolygon);

      if (!isValid || (self.activePolygon && self.activePolygon.closed)) {
        self.setActivePolygon(null);
      }

      if (self.completion.dragMode === false) {
        const x = (ev.evt.offsetX - w / 2 - self.zoomPosX) / self.zoomScale;
        const y = (ev.evt.offsetY - w / 2 - self.zoomPosY) / self.zoomScale;

        if (self.activePolygon) {
          poly = self.activePolygon;
        } else {
          const c = self.controlButton();
          let stroke = self.controlButton().strokecolor;
          // let stroke = self.editor.rectstrokecolor;
          // const states = self.states;
          // TODO you may need to filter this states, check Text.js
          if (states && states.length) {
            stroke = states[0].getSelectedColor();
          }

          poly = PolygonRegionModel.create({
            id: guidGenerator(),
            x: x,
            y: y,
            width: w,
            height: w,

            opacity: parseFloat(c.opacity),
            fillcolor: c.fillcolor,

            strokewidth: parseInt(c.strokewidth),
            strokecolor: stroke,

            pointsize: c.pointsize,
            pointstyle: c.pointstyle,

            states: states,
          });

          self.setActivePolygon(poly);

          self.shapes.push(poly);
          self.completion.addRegion(poly);
        }

        poly.addPoint(x, y);

        const stage = self._stageRef;
        stage.container().style.cursor = "default";
      }
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
      return self.shapes.map(r => r.toStateJSON());
    },

    fromStateJSON(obj, fromModel) {
      const params = ["choices", "shape", "rectanglelabels"];

      params.forEach(item => {
        if (!item in obj.value) {
          throw new Error("Not valid param");
        }
      });

      if (obj.value.choices) {
        self.completion.names.get(obj.from_name).fromStateJSON(obj);
      }

      if (obj.value.rectanglelabels) {
        const states = restoreNewsnapshot(fromModel);

        states.fromStateJSON(obj);

        self.__addRect(
          obj.value.x,
          obj.value.y,
          obj.value.width,
          obj.value.height,
          states.getSelectedColor(),
          [states],
          "perc",
        );
      }

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

  handleMouseMove = e => {
    const { item } = this.props;
    // const stage = e.target.getStage();
    item.setPointerPosition({ x: e.evt.offsetX, y: e.evt.offsetY });
  };

  handleMouseOver = e => {};

  handleStageMouseDown = e => {
    if (e.target === e.target.getStage()) {
      return;
    }

    // clicked on transformer - do nothing
    const clickedOnTransformer = e.target.getParent().className === "Transformer";
    if (clickedOnTransformer) {
      return;
    }
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

    if (item.negativezoom != "true" && newScale <= 1) {
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
            onMouseMove={item.showmousepos === "true" ? this.handleMouseMove : () => {}}
            onWheel={item.zoom === "true" ? this.handleZoom : () => {}}
          >
            <Layer>
              {item.shapes.map(s => {
                return Tree.renderItem(s);
              })}
              <TransformerComponent
                rotateEnabled={item.controlButton().canrotate === "true"}
                selectedShapeName={item.selectedShape}
              />
            </Layer>
          </Stage>
          <div>
            {item.showmousepos === "true" && (
              <p>
                {item.cursorPositionX} : {item.cursorPositionY}
              </p>
            )}
          </div>
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
