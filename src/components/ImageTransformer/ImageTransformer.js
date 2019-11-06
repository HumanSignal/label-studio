import React, { Component } from "react";
import { Transformer } from "react-konva";

export default class TransformerComponent extends Component {
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
        keepRatio={false}
        rotateEnabled={this.props.rotateEnabled}
        boundBoxFunc={(oldBox, newBox) => {
          newBox.width = Math.max(30, newBox.width);
          newBox.height = Math.max(30, newBox.height);
          return newBox;
        }}
        anchorSize={8}
        ref={node => {
          this.transformer = node;
        }}
      />
    );
  }
}
