import React, { Component } from 'react';
import { MIN_SIZE } from '../../tools/Base';
import { getBoundingBoxAfterChanges } from '../../utils/image';
import LSTransformer from './LSTransformer';
import LSTransformerOld from './LSTransformerOld';
import { FF_DEV_2671, FF_ZOOM_OPTIM, isFF } from '../../utils/feature-flags';

const EPSILON = 0.001;

export default class TransformerComponent extends Component {
  componentDidMount() {
    setTimeout(this.checkNode);
  }

  componentDidUpdate() {
    setTimeout(this.checkNode);
  }

  get freezeKey() {
    const freezeKey = `ImageTransformer_${this.props.item.id}`;

    return freezeKey;
  }

  freeze() {
    const { item } = this.props;
    const { freezeKey } = this;

    item.annotation.history.freeze(freezeKey);
  }

  unfreeze() {
    const { item } = this.props;
    const { freezeKey } = this;

    item.annotation.history.unfreeze(freezeKey);
  }

  checkNode = () => {
    if (!this.transformer) return;

    // here we need to manually attach or detach Transformer node
    const stage = this.transformer.getStage();
    const { item: { selectedRegions } } = this.props;

    if (!selectedRegions?.length) {
      this.transformer.detach();
      this.transformer.getLayer().batchDraw();
      return;
    }

    if (selectedRegions.find(shape => !shape.supportsTransform)) return;

    const selectedNodes = [];

    selectedRegions.forEach(shape => {
      const shapeContainer = stage.findOne(node => {
        return node.hasName(shape.id) && node.parent;
      });

      if (!shapeContainer) return;
      if (shapeContainer.hasName('_transformable')) selectedNodes.push(shapeContainer);
      if (!shapeContainer.find) return;

      const transformableElements = shapeContainer.find(node => {
        return node.hasName('_transformable');
      }, true);

      selectedNodes.push(...transformableElements);
    });
    const prevNodes = this.transformer.nodes();
    // do nothing if selected node is already attached
    const nodesWereNotChanged = selectedNodes?.length === prevNodes?.length && !selectedNodes.find((node, idx) => node !== prevNodes[idx]);

    if (nodesWereNotChanged) {
      return;
    }

    if (selectedNodes.length) {
      this.transformer.nodes(selectedNodes);
    } else {
      // remove transformer
      this.transformer.nodes([]);
    }
    this.transformer.getLayer().batchDraw();
  };

  fitBBoxToScaledStage(box, stage) {
    let { x, y, width, height } = box;

    const [realX, realY] = [box.x - stage.x, box.y - stage.y];

    if (realX < 0) {
      x = isFF(FF_ZOOM_OPTIM) ? stage.x : 0;
      width += realX;
    } else if (realX + box.width > stage.width) {
      width = stage.width - realX;
    }

    if (realY < 0) {
      y = isFF(FF_ZOOM_OPTIM) ? stage.y : 0;
      height += realY;
    } else if (realY + box.height > stage.height) {
      height = stage.height - realY;
    }

    return { ...box, x, y, width, height };
  }

  getStageAbsoluteDimensions() {
    const stage = this.transformer.getStage();
    const { stageWidth, stageHeight } = this.props.item;

    let [scaledStageWidth, scaledStageHeight] = [stageWidth * stage.scaleX(), stageHeight * stage.scaleY()];

    if (isFF(FF_ZOOM_OPTIM) && this.props.item.isSideways) {
      [scaledStageWidth, scaledStageHeight] = [scaledStageHeight, scaledStageWidth];
    }
    const [stageX, stageY] = [stage.x(), stage.y()];

    return {
      width: scaledStageWidth,
      height: scaledStageHeight,
      x: stageX,
      y: stageY,
    };
  }

  constrainSizes = (oldBox, newBox) => {
    // it's important to compare against `undefined` because it can be missed (not rotated box?)
    const rotation = newBox.rotation !== undefined ? newBox.rotation : oldBox.rotation;
    const isRotated = rotation !== oldBox.rotation;
    const stageDimensions = this.getStageAbsoluteDimensions();

    if (newBox.width < MIN_SIZE) newBox.width = MIN_SIZE;
    if (newBox.height < MIN_SIZE) newBox.height = MIN_SIZE;

    // // it's harder to fix sizes for rotated box, so just block changes out of stage
    if (rotation || isRotated) {
      const { x, y, width, height } = newBox;
      const selfRect = { x: 0, y: 0, width, height };

      // bounding box, got by applying current shift and rotation to normalized box
      const clientRect = getBoundingBoxAfterChanges(selfRect, { x, y }, rotation);
      const fixed = this.fitBBoxToScaledStage(clientRect, stageDimensions);

      // if bounding box is out of stage — do nothing
      if (['x', 'y', 'width', 'height'].some(key => Math.abs(fixed[key] - clientRect[key]) > EPSILON)) return oldBox;
      return newBox;
    } else {
      return this.fitBBoxToScaledStage(newBox, stageDimensions);
    }
  };

  dragBoundFunc = (pos) => {
    const { item } = this.props;

    return item.fixForZoomWrapper(pos, pos => {
      if (!this.transformer || !item) return;

      let { x, y } = pos;
      const { width, height } = this.draggingAreaBBox;
      const { stageHeight, stageWidth } = item;

      if (x < 0) x = 0;
      if (y < 0) y = 0;

      if (x + width > stageWidth) x = stageWidth - width;
      if (y + height > stageHeight) y = stageHeight - height;

      return { x, y };
    });
  };

  renderLSTransformer() {
    return (
      <>
        <LSTransformer
          ref={node => {
            this.transformer = node;

            if (this.transformer) {
              this.transformer.rotateEnabled(false);
            }
          }}
          resizeEnabled={true}
          ignoreStroke={true}
          keepRatio={this.props.singleNodeMode !== true}
          useSingleNodeRotation={this.props.useSingleNodeRotation}
          rotateEnabled={this.props.rotateEnabled}
          borderDash={[3, 1]}
          // borderStroke={"red"}
          boundBoxFunc={this.constrainSizes}
          anchorSize={8}
          flipEnabled={false}
          zoomedIn={this.props.item.zoomScale > 1}
          onDragStart={e => {
            const { item: { selectedRegionsBBox } } = this.props;

            this.freeze();

            if (!this.transformer || e.target !== e.currentTarget || !selectedRegionsBBox) return;

            this.draggingAreaBBox = {
              x: selectedRegionsBBox.left,
              y: selectedRegionsBBox.top,
              width: selectedRegionsBBox.right - selectedRegionsBBox.left,
              height: selectedRegionsBBox.bottom - selectedRegionsBBox.top,
            };
          }}
          dragBoundFunc={this.dragBoundFunc}
          onDragEnd={() => {
            this.unfreeze();
            setTimeout(this.checkNode);
          }}
          onTransformEnd={() => {
            setTimeout(this.checkNode);
          }}
          backSelector={this.props.draggableBackgroundSelector}
        />
      </>
    );
  }

  renderOldLSTransformer() {
    return (
      <>
        <LSTransformerOld
          ref={node => {
            this.transformer = node;
          }}
          resizeEnabled={true}
          ignoreStroke={true}
          keepRatio={this.props.singleNodeMode !== true}
          useSingleNodeRotation={this.props.useSingleNodeRotation}
          rotateEnabled={this.props.rotateEnabled}
          borderDash={[3, 1]}
          // borderStroke={"red"}
          boundBoxFunc={this.constrainSizes}
          anchorSize={8}
          flipEnabled={false}
          zoomedIn={this.props.item.zoomScale > 1}
          onDragStart={e => {
            const { item: { selectedRegionsBBox } } = this.props;

            this.freeze();

            if (!this.transformer || e.target !== e.currentTarget || !selectedRegionsBBox) return;

            this.draggingAreaBBox = {
              x: selectedRegionsBBox.left,
              y: selectedRegionsBBox.top,
              width: selectedRegionsBBox.right - selectedRegionsBBox.left,
              height: selectedRegionsBBox.bottom - selectedRegionsBBox.top,
            };
          }}
          dragBoundFunc={this.dragBoundFunc}
          onDragEnd={() => {
            this.unfreeze();
            setTimeout(this.checkNode);
          }}
          onTransformEnd={() => {
            setTimeout(this.checkNode);
          }}
          backSelector={this.props.draggableBackgroundSelector}
        />
      </>
    );
  }

  render() {
    if (!this.props.supportsTransform) return null;

    if (isFF(FF_DEV_2671)) {
      return this.renderLSTransformer();
    } else {
      return this.renderOldLSTransformer();
    }
  }
}
