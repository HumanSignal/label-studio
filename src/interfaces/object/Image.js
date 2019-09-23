import React, { Component } from "react";
import { observer, inject, Provider } from "mobx-react";
import { types, getType, getParentOfType, destroy, getRoot } from "mobx-state-tree";

import { Stage, Layer, Rect, Text, Transformer } from "react-konva";

import Registry from "../../core/Registry";
import { guidGenerator, cloneNode, restoreNewsnapshot } from "../../core/Helpers";
import Tree from "../../core/Tree";

// import { ImageEditorModel } from './ImageEditor';
import { RectRegionModel } from "./RectRegion";
import { PolygonRegionModel } from "./PolygonRegion";
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
 */
const TagAttrs = types.model({
  name: types.maybeNull(types.string),
  value: types.maybeNull(types.string),
  resize: types.maybeNull(types.string),
  width: types.optional(types.string, "100%"),
  maxwidth: types.optional(types.string, "750px"),
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
    selectedShape: types.safeReference(types.union(RectRegionModel, PolygonRegionModel)),
    activePolygon: types.maybeNull(types.safeReference(PolygonRegionModel)),
    shapes: types.array(types.union(RectRegionModel, PolygonRegionModel), []),
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

    controlButtonType() {
      const name = self.controlButton();
      return getType(name).name;
    },
  }))
  .actions(self => ({
    setActivePolygon(poly) {
      self.activePolygon = poly;
    },

    updateIE(ev) {
      const { width, height, naturalWidth, naturalHeight } = ev.target;

      if (self.hasStates) {
        self.naturalWidth = naturalWidth;
        self.naturalHeight = naturalHeight;
        self.stageWidth = width;
        self.stageHeight = height;

        // const IE = getParentOfType(self, ImageEditorModel);
        // IE.updateStageSize(width, height);
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
      if (self.controlButtonType() === "RectangleModel") {
        self._addRect(ev);
      } else if (self.controlButtonType() === "PolygonModel") {
        self._addPoly(ev);
      } else if (self.controlButtonType() === "PolygonLabelsModel") {
        if (self.activePolygon && !self.activePolygon.closed) {
          self._addPoly(ev);
        } else {
          const states = self.completion.toNames.get(self.name);
          const activeStates = states ? states.filter(c => c.isSelected == true) : null;
          const clonedStates = activeStates ? activeStates.map(s => cloneNode(s)) : null;

          if (clonedStates.length === 0) return;

          self._addPoly(ev, clonedStates);

          activeStates && activeStates.forEach(s => s.unselectAll());
        }
      } else if (self.controlButtonType() === "RectangleLabelsModel") {
        const states = self.completion.toNames.get(self.name);
        const activeStates = states ? states.filter(c => c.isSelected === true) : null;
        const clonedStates = activeStates ? activeStates.map(s => cloneNode(s)) : null;

        // don't allow to add RectangleLabel when there is no label selected
        if (clonedStates.length === 0) return;

        clonedStates.forEach(item => {
          if (item.type !== "choices" && item.isSelected) {
            self._addRect(ev, item);
          }
        });

        activeStates &&
          activeStates.forEach(s => {
            console.log(s);
            if (s.type !== "choices") {
              s.unselectAll();
            }
          });
      }
    },

    _addRect(ev, states) {
      // const _states = self.activeStates();
      // const states = (_states) ? _states.map(s => cloneNode(s)) : null;
      // const states = null;

      // const image = self.completion.names.get(self.toname);

      const iw = 200;
      const ih = 200;

      // console.log(states.toJSON());

      // based on image width and height we can place rect somewhere
      // in the center
      const sw = 100;
      const sh = 100;
      // const name = guidGenerator();
      let stroke = self.controlButton().rectstrokecolor;
      // let stroke = self.editor.rectstrokecolor;
      // const states = self.states;
      // TODO you may need to filter this states, check Text.js
      if (states) {
        // console.log(states[0].toJSON());
        // console.log(states);
        stroke = states.getSelectedColor();
      }

      const wp = self.stageWidth / self.naturalWidth;
      const hp = self.stageHeight / self.naturalHeight;

      const wx = ev.evt.offsetX;
      const wy = ev.evt.offsetY;

      self.__addRect(Math.floor(wx - sw / 2), Math.floor(wy - sh / 2), sw, sh, stroke, states);
    },

    __addRect(x, y, sw, sh, stroke, states, coordstype) {
      const c = self.controlButton();

      let localStates = states;

      if (!states.length) {
        localStates = [states];
      }

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

        states: localStates,

        coordstype: coordstype,
      });

      self._addShape(rect);
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

    _addPoly(ev, states) {
      let poly;
      const w = 10;

      if (self.activePolygon && self.activePolygon.closed) {
        self.setActivePolygon(null);
        return;
      }

      if (self.completion.dragMode === false) {
        if (self.activePolygon) {
          poly = self.activePolygon;
        } else {
          const c = self.controlButton();
          poly = PolygonRegionModel.create({
            id: guidGenerator(),
            x: ev.evt.offsetX - w / 2,
            y: ev.evt.offsetY - w / 2,
            width: w,
            height: w,

            opacity: parseFloat(c.opacity),
            fillcolor: c.fillcolor,

            strokewidth: parseInt(c.strokewidth),
            strokecolor: c.strokecolor,

            pointsize: c.pointsize,
            pointstyle: c.pointstyle,

            states: states,
          });

          self.setActivePolygon(poly);

          self.shapes.push(poly);
          self.completion.addRegion(poly);

          // self._addShape(poly);
        }

        poly.addPoint(ev.evt.offsetX - w / 2, ev.evt.offsetY - w / 2);

        const stage = self._stageRef;
        stage.container().style.cursor = "default";
      }
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
    const { selectedShapeName } = this.props;

    if (!selectedShapeName) {
      this.transformer.detach();
      this.transformer.getLayer().batchDraw();
      return;
    }

    const selectedNode = stage.findOne("." + selectedShapeName.id);
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

    // TODO this is a hack, for some reason stopPropagation is not
    // working. And when you try to select a Rectangle the event
    // propagates to Image as well. Which calls this function even
    // if you click inside Rectangle. Current workaround is to
    // check if our click lands inside the Rectangle/Polygon or
    // not :-/
    // const { offsetX, offsetY } = ev.evt;
    // const shape = item.shapes.find(sh => sh.coordsInside(offsetX, offsetY));

    // if (shape)
    //     return;

    return item.onImageClick(ev);
  };

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

  updateDimensions() {
    // this.props.item.onResizeSize(this.container.offsetWidth, this.container.offsetHeight);
  }

  componentDidMount() {
    window.addEventListener("resize", this.updateDimensions.bind(this));
  }

  render() {
    // const width = 750;
    const { item, store } = this.props;

    // TODO fix me
    if (!store.task) return null;

    const divStyle = {};
    const style = {
      width: item.width,
      maxWidth: item.maxwidth,
    };

    if (item.resize) {
      style["transform"] = "scale(" + item.resize + ", " + item.resize + ")";
    }

    if (item.hasStates) {
      // divStyle["position"] = "absolute";
      // const rotateEnabled = (item.editor.rectcanrotate == "true") ? true : false;
      const rotateEnabled = item.controlButton().canrotate === "true" ? true : false;

      return (
        <div style={{ position: "relative" }}>
          <div
            ref={node => {
              this.container = node;
            }}
            style={divStyle}
          >
            <img style={style} src={item._value} onLoad={item.updateIE} />
          </div>
          <Stage
            ref={ref => {
              item._setStageRef(ref);
            }}
            width={item.stageWidth}
            height={item.stageHeight}
            onDblClick={this.handleDblClick}
            onClick={this.handleOnClick}
            onMouseDown={this.handleStageMouseDown}
            style={{ position: "absolute", top: 0, left: 0 }}
          >
            <Layer>
              {item.shapes.map(s => {
                return Tree.renderItem(s);
              })}
              <TransformerComponent rotateEnabled={rotateEnabled} selectedShapeName={this.props.item.selectedShape} />
            </Layer>
          </Stage>
        </div>
      );
    } else {
      divStyle["marginTop"] = "1em";
      return (
        <div style={divStyle}>
          <img style={style} src={item._value} onLoad={item.updateIE} />
        </div>
      );
    }
  }
}

const HtxImage = inject("store")(observer(HtxImageView));

Registry.addTag("image", ImageModel, HtxImage);

export { ImageModel, HtxImage };
