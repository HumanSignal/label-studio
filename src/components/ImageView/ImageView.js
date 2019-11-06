import React, { Component } from "react";
import { observer } from "mobx-react";
import { getParent, getEnv } from "mobx-state-tree";
import { Stage, Layer, Rect, Group, Line } from "react-konva";

import Tree from "../../core/Tree";
import ImageTransformer from "../ImageTransformer/ImageTransformer";
import ImageControls from "../ImageControls/ImageControls";
import ImageGrid from "../ImageGrid/ImageGrid";

export default observer(
  class ImageView extends Component {
    constructor(props) {
      super(props);

      this.updateDimensions = this.updateDimensions.bind(this);
    }
    /**
     * Handler of click on Image
     */
    handleOnClick = ev => {
      const { item } = this.props;

      return item.onImageClick(ev);
    };

    /**
     * Handler of mouse up
     */
    handleMouseUp = e => {
      const { item } = this.props;

      item.freezeHistory();

      if (item.mode === "drawing") {
        /**
         * Set mode of Image for "view"
         */
        item.setMode("viewing");

        /**
         * Constants of min size of bounding box
         */
        const minSize = { width: 3, height: 3 };

        /**
         * Current shape
         */
        const currentShape = item.detachActiveShape();

        /**
         * Check for minimal size of boundng box
         */
        if (currentShape.width > minSize.width && currentShape.height > minSize.height) item.addShape(currentShape);
      }
    };

    handleMouseMove = e => {
      const { item } = this.props;
      item.freezeHistory();
      if (item.mode === "drawing") {
        const x = (e.evt.offsetX - item.zoomingPositionX) / item.zoomScale;
        const y = (e.evt.offsetY - item.zoomingPositionY) / item.zoomScale;

        item.updateDraw({ x: x, y: y });
      }

      item.setPointerPosition({ x: e.evt.offsetX, y: e.evt.offsetY });
    };

    handleMouseOver = e => {
      const { item } = this.props;

      item.freezeHistory();
    };

    handleStageMouseDown = e => {
      const { item } = this.props;
      item.freezeHistory();

      if (item.controlButtonType === "PolygonLabelsModel") {
        return;
      }

      if (e.target === e.target.getStage() || (e.target.parent && e.target.parent.attrs.name === "ruler")) {
        // draw rect

        const x = (e.evt.offsetX - item.zoomingPositionX) / item.zoomScale;
        const y = (e.evt.offsetY - item.zoomingPositionY) / item.zoomScale;

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

    /**
     * Update brightness of Image
     */
    updateBrightness = range => {
      const { item } = this.props;
      item.freezeHistory();

      item.setBrightnessGrade(range);
    };

    /**
     * Handle to zoom
     */
    handleZoom = e => {
      /**
       * Disable if user doesn't use ctrl
       */
      if (e.evt && !e.evt.ctrlKey) {
        return;
      } else if (e.evt && e.evt.ctrlKey) {
        /**
         * Disable scrolling page
         */
        e.evt.preventDefault();
      }

      const { item } = this.props;
      item.freezeHistory();

      const stage = item.stageRef;
      const scaleBy = parseFloat(item.zoomby);
      const oldScale = stage.scaleX();

      let mousePointTo;
      let newScale;
      let pos;
      let newPos;

      if (e.evt) {
        mousePointTo = {
          x: stage.getPointerPosition().x / oldScale - stage.x() / oldScale,
          y: stage.getPointerPosition().y / oldScale - stage.y() / oldScale,
        };

        newScale = e.evt.deltaY > 0 ? oldScale * scaleBy : oldScale / scaleBy;

        newPos = {
          x: -(mousePointTo.x - stage.getPointerPosition().x / newScale) * newScale,
          y: -(mousePointTo.y - stage.getPointerPosition().y / newScale) * newScale,
        };
      } else {
        pos = {
          x: stage.width() / 2,
          y: stage.height() / 2,
        };

        mousePointTo = {
          x: pos.x / oldScale - stage.x() / oldScale,
          y: pos.y / oldScale - stage.y() / oldScale,
        };

        newScale = Math.max(0.05, oldScale * e);

        newPos = {
          x: -(mousePointTo.x - pos.x / newScale) * newScale,
          y: -(mousePointTo.y - pos.y / newScale) * newScale,
        };
      }

      if (item.negativezoom !== true && newScale <= 1) {
        item.setZoom(1, 0, 0);
        stage.scale({ x: 1, y: 1 });
        stage.position({ x: 0, y: 0 });
        stage.batchDraw();
        return;
      }

      stage.scale({ x: newScale, y: newScale });

      item.setZoom(newScale, newPos.x, newPos.y);
      stage.position(newPos);
      stage.batchDraw();
    };

    renderRulers() {
      const { item } = this.props;
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
      this.props.item.onResizeSize(this.container.offsetWidth, this.container.offsetHeight, true);
    }

    componentDidMount() {
      window.addEventListener("resize", this.updateDimensions);
    }

    componentWillUnmount() {
      window.removeEventListener("resize", this.updateDimensions);
    }

    render() {
      const { item, store } = this.props;

      // TODO fix me
      if (!store.task) return null;

      const divStyle = {
        overflow: "hidden",
        // width: item.stageWidth + "px",
      };

      const imgStyle = {
        width: item.width,
        maxWidth: item.maxwidth,
        transformOrigin: "left top",
        filter: `brightness(${item.brightnessGrade}%)`,
      };

      if (item.zoomScale !== 1) {
        let { zoomingPositionX, zoomingPositionY } = item;
        const translate = "translate(" + zoomingPositionX + "px," + zoomingPositionY + "px) ";
        imgStyle["transform"] = translate + "scale(" + item.resize + ", " + item.resize + ")";
      }

      if (item.hasStates && item._value.length > 0) {
        return (
          <div
            style={{
              position: "relative",
              display: "flex",
              alignItems: "flex-start",
              justifyContent: "space-between",
            }}
          >
            <div
              ref={node => {
                this.container = node;
              }}
              style={divStyle}
            >
              <img style={imgStyle} src={item._value} onLoad={item.updateIE} onClick={this.handleOnClick} alt="LS" />
            </div>
            <Stage
              ref={ref => {
                item.setStageRef(ref);
              }}
              style={{ position: "absolute", top: 0, left: 0, brightness: "150%" }}
              width={item.stageWidth}
              height={item.stageHeight}
              scaleX={item.scale}
              scaleY={item.scale}
              onDblClick={this.handleDblClick}
              onClick={this.handleOnClick}
              onMouseDown={this.handleStageMouseDown}
              onMouseMove={this.handleMouseMove}
              onMouseUp={this.handleMouseUp}
              onWheel={item.zoom ? this.handleZoom : () => {}}
            >
              {item.grid && item.sizeUpdated && <ImageGrid item={item} />}
              <Layer>
                {item.shapes.map(shape => {
                  return Tree.renderItem(shape);
                })}
                {item.activeShape && Tree.renderItem(item.activeShape)}

                <ImageTransformer rotateEnabled={item.controlButton().canrotate} selectedShape={item.selectedShape} />
              </Layer>
            </Stage>
            {item.zoom || item.brightness ? (
              <ImageControls item={item} handleZoom={this.handleZoom} updateBrightness={this.updateBrightness} />
            ) : null}
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
  },
);
