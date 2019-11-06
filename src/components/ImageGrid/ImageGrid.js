import React, { Component } from "react";
import { observer } from "mobx-react";
import { Layer, Rect } from "react-konva";

/**
 * Create grid for Image Canvas
 * @param {number} width
 * @param {number} height
 * @param {number} nodeSize
 */
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

export default observer(
  class ImageGrid extends Component {
    render() {
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
  },
);
