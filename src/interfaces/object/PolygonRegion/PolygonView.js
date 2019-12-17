import React, { createRef, Component, Fragment } from "react";

import Konva from "konva";
import { Group, Line } from "react-konva";

import { guidGenerator } from "../../../core/Helpers";

import { PolygonPointView } from "../PolygonPoint";

import Utils from "../../../utils";

const HtxPolygonView = ({ store, item }) => {
  /**
   * Render line between 2 points
   */
  function renderLine({ points, idx1, idx2 }) {
    let name = `border_${idx1}_${idx2}`;
    let insertIdx = idx1 + 1; // idx1 + 1 or idx2
    let flattenedPoints = Utils.Obj.getFlattenedCoordinates([points[idx1], points[idx2]]);
    return (
      <Group
        key={name}
        name={name}
        onClick={e => item.handleLineClick({ e, flattenedPoints, insertIdx })}
        onMouseMove={e => {
          if (!item.closed) return;

          item.handleMouseMove({ e, flattenedPoints });
        }}
        onMouseLeave={e => item.handleMouseLeave({ e })}
      >
        <Line
          points={flattenedPoints}
          stroke={item.strokecolor}
          opacity={item.opacity}
          lineJoin="bevel"
          lineCap="round"
          strokeWidth={item.strokewidth}
        />
      </Group>
    );
  }

  /**
   *
   * @param {*} points
   */
  function renderLines(points) {
    let name = "borders";
    /**
     * Amount of Points into current Polygon
     */
    let amount = points.length;

    /**
     * Return all lines in current Polygon
     * One line is Konva.Line between 2 points
     */
    let lines = points.map((point, idx) => {
      /**
       * First point
       */
      let idx1 = idx;
      /**
       * Second point
       */
      let idx2 = idx === amount - 1 ? 0 : idx + 1;
      return renderLine({ points, idx1, idx2 });
    });

    return (
      <Group key={name} name={name}>
        {lines}
      </Group>
    );
  }

  /**
   * Render Polygon object
   * @param {*} points
   */
  function renderPolygon(points) {
    let name = "polygon";

    return (
      <Group key={name} name={name}>
        <Line
          lineJoin="bevel"
          points={Utils.Obj.getFlattenedCoordinates(points)}
          fill={item.strokecolor}
          closed={true}
          opacity={0.2}
        />
      </Group>
    );
  }

  /**
   * Render circle
   */
  function renderCircle(point) {
    const name = `anchor_${point.parent.points.length}_${point.index}`;

    if (!item.closed || (item.closed && item.selected)) {
      return <PolygonPointView item={point} name={name} key={name} />;
    }
  }

  function renderCircles(points) {
    const name = "anchors";

    return (
      <Group key={name} name={name}>
        {points.map(point => renderCircle(point))}
      </Group>
    );
  }

  return (
    <Group
      key={item.id ? item.id : guidGenerator(5)}
      onDragStart={event => item.completion.setDragMode(true)}
      dragBoundFunc={function(pos) {
        let { x, y } = pos;

        let width = item.parent.stageWidth;
        let height = item.parent.stageHeight;

        /**
         * If X or Y bigger then width or height
         */
        if (x > width) x = width;
        if (y > height) y = height;

        item.points.forEach(point => {
          if (x + point.initialX <= 0) x = x - (point.initialX + x);
          if (y + point.initialY <= 0) y = y - (point.initialY + y);
          if (x + point.initialX >= width) x = width - point.initialX;
          if (y + point.initialY >= height) y = height - point.initialY;
        });

        item.points.forEach(point => {
          point.movePoint(x, y);
        });

        return { x: 0, y: 0 };
      }}
      onDragEnd={e => {
        item.completion.setDragMode(false);

        if (!item.closed) item.closePoly();

        item.parent.setActivePolygon(null);

        item.points.forEach(point => {
          point.dragEnd();
        });
      }}
      onMouseOver={e => {
        const stage = item.parent.stageRef;

        if (store.completionStore.selected.relationMode) {
          item.setHighlight(true);
          stage.container().style.cursor = "crosshair";
        } else {
          stage.container().style.cursor = "pointer";
        }
      }}
      onMouseOut={e => {
        const stage = item.parent.stageRef;
        stage.container().style.cursor = "default";

        if (store.completionStore.selected.relationMode) {
          item.setHighlight(false);
        }
      }}
      onClick={event => {
        /**
         * HTML5 Canvas Cancel Event Bubble Propagation
         * https://konvajs.org/docs/events/Cancel_Propagation.html
         */
        event.cancelBubble = true;

        if (!item.closed) return;

        const stage = item.parent.stageRef;

        if (store.completionStore.selected.relationMode) {
          stage.container().style.cursor = "default";
        }

        item.setHighlight(false);
        item.onClickRegion();
      }}
      draggable
    >
      {item.mouseOverStartPoint}
      {item.points ? renderPolygon(item.points) : null}
      {item.points ? renderLines(item.points) : null}
      {item.points ? renderCircles(item.points) : null}
    </Group>
  );
};

export default HtxPolygonView;
