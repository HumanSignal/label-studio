import React, { Fragment } from "react";
import { Icon } from "antd";
import { getType, getRoot } from "mobx-state-tree";
import { observer } from "mobx-react";

import styles from "./Node.module.scss";

const NodeViews = {
  TextRegionModel: (node, click) => (
    <div onClick={click}>
      <Icon type="font-colors" />
      Text &nbsp;
      <span style={{ color: "#5a5a5a" }}>{node.text}</span>
    </div>
  ),

  HyperTextRegionModel: (node, click) => (
    <div onClick={click}>
      <Icon type="font-colors" />
      HTML &nbsp;
      <span style={{ color: "#5a5a5a" }}>{node.text}</span>
    </div>
  ),

  AudioRegionModel: (node, click) => (
    <p>
      <span onClick={click} className={styles.node}>
        <i className="microphone icon" />
        Audio {node.start.toFixed(2)} - {node.end.toFixed(2)}
      </span>
    </p>
  ),

  TextAreaRegionModel: (node, click) => (
    <p>
      <span onClick={click} className={styles.node}>
        <i className="i cursor icon" />
        Input <span style={{ color: "#5a5a5a" }}>{node._value}</span>
      </span>
    </p>
  ),

  RectRegionModel: (node, click) => {
    const w = node.width * node.scaleX;
    const y = node.height * node.scaleY;
    return (
      <p>
        <span onClick={click} className={styles.node}>
          <i className="expand icon" />
          Rectangle {w.toFixed(2)} x {y.toFixed(2)}
        </span>
      </p>
    );
  },

  PolygonRegionModel: (node, click) => (
    <p>
      <span onClick={click} className={styles.node}>
        <i className="i object ungroup outline icon" />
        Polygon
      </span>
    </p>
  ),

  KeyPointRegionModel: (node, click) => (
    <p>
      <span onClick={click} className={styles.node}>
        <i className="i object bullseye icon" />
        KeyPoint
      </span>
    </p>
  ),

  BrushRegionModel: (node, click) => (
    <p>
      <Icon type="highlight" />
      <span onClick={click} className={styles.node}>
        &nbsp; Brush
      </span>
    </p>
  ),
};

const Node = observer(({ node }) => {
  const click = ev => {
    ev.preventDefault();
    getRoot(node).completionStore.selected.regionStore.unselectAll();
    node.selectRegion();

    return false;
  };

  const name = getType(node).name;
  if (!(name in NodeViews)) console.error(`No ${name} in NodeView`);

  return NodeViews[name](node, click);
});

const NodeMinimal = ({ node }) => {
  if (getType(node).name === "TextRegionModel") {
    return (
      <Fragment>
        <Icon type="font-colors" /> Text
      </Fragment>
    );
  }

  if (getType(node).name === "RectRegionModel") {
    return (
      <Fragment>
        <i className="expand icon" />
        Rectangle
      </Fragment>
    );
  }

  if (getType(node).name === "AudioRegionModel") {
    return (
      <Fragment>
        <i className="microphone icon" />
        Audio
      </Fragment>
    );
  }

  if (getType(node).name === "TextAreaRegionModel") {
    return (
      <Fragment>
        <i className="i cursor icon" />
        Input
      </Fragment>
    );
  }

  if (getType(node).name === "HyperTextRegionModel") {
    return (
      <Fragment>
        <Icon type="font-colors" /> HTML
      </Fragment>
    );
  }

  if (getType(node).name === "PolygonRegionModel") {
    return (
      <Fragment>
        <i className="i object ungroup outline icon" />
        Polygon
      </Fragment>
    );
  }

  if (getType(node).name === "KeyPointRegionModel") {
    return (
      <Fragment>
        <i className="i object bullseye icon" />
        KeyPoint
      </Fragment>
    );
  }

  if (getType(node).name === "BrushRegionModel") {
    return (
      <Fragment>
        <Icon type="highlight" />
        &nbsp; Brush
      </Fragment>
    );
  }
};

export { Node, NodeMinimal };
