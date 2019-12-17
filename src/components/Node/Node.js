import React, { Component, Fragment } from "react";
import { observer, inject } from "mobx-react";
import { getType, getRoot, getSnapshot } from "mobx-state-tree";
import { Icon, Tag } from "antd";

import styles from "./Node.module.scss";

const Node = observer(({ node }) => {
  const clickHandler = event => {
    event.preventDefault();

    if (!node.selected) {
      getRoot(node).completionStore.selected.regionStore.unselectAll();
      node.selectRegion();
    } else {
      getRoot(node).completionStore.selected.regionStore.unselectAll();
    }
  };

  if (getType(node).name === "TextRegionModel") {
    return (
      <div>
        <Icon type="font-colors" />
        Text &nbsp;
        <span style={{ color: "#5a5a5a" }}>{node.text}</span>
      </div>
    );
  }

  if (getType(node).name === "AudioRegionModel") {
    return (
      <p>
        <a href="" onClick={clickHandler} className={styles.node}>
          <i className="microphone icon" />
          Audio {node.start.toFixed(2)} - {node.end.toFixed(2)}
        </a>
      </p>
    );
  }

  if (getType(node).name === "TextAreaRegionModel") {
    return (
      <p>
        <a href="" onClick={clickHandler} className={styles.node}>
          <i className="i cursor icon" />
          Input <span style={{ color: "#5a5a5a" }}>{node._value}</span>
        </a>
      </p>
    );
  }

  if (getType(node).name === "RectRegionModel") {
    const w = node.width * node.scaleX;
    const y = node.height * node.scaleY;
    return (
      <p>
        <a href="" onClick={clickHandler} className={styles.node}>
          <i className="expand icon" />
          Rectangle {w.toFixed(2)} x {y.toFixed(2)}
        </a>
      </p>
    );
  }

  if (getType(node).name === "PolygonRegionModel") {
    let labels = [];

    node.states.forEach(item => {
      labels.push(<Tag>{item.getSelectedNames()}</Tag>);
    });

    return (
      <span onClick={clickHandler} className={styles.node}>
        Polygon {labels}
      </span>
    );
  }

  if (getType(node).name === "KeyPointRegionModel") {
    return (
      <p>
        <a href="" onClick={clickHandler} className={styles.node}>
          <i className="i object bullseye icon" />
          KeyPoint
        </a>
      </p>
    );
  }
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
};

export { Node, NodeMinimal };
