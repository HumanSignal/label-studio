/**
 * Regression test for ImageGrid (components/ImageGrid/ImageGrid.jsx) — issue #3378.
 * The grid ("ruler") Layer must render with listening={false} so it doesn't capture
 * pointer events and block drawing/labeling. Covers the listening prop and cell count.
 */

import React from "react";
import { render } from "@testing-library/react";

// Render react-konva's Layer/Rect as plain DOM so we can inspect the props the
// component passes without spinning up a real Konva <Stage>/canvas.
jest.mock("react-konva", () => ({
  __esModule: true,
  Layer: ({ children, listening, name, ...rest }) => (
    <div data-testid="ruler-layer" data-name={name} data-listening={String(listening)} {...rest}>
      {children}
    </div>
  ),
  Rect: () => <div data-testid="grid-rect" />,
}));

import ImageGrid from "../ImageGrid";

const makeItem = (overrides = {}) => ({
  stageWidth: 80,
  stageHeight: 80,
  gridsize: 40,
  gridcolor: "#fff",
  ...overrides,
});

describe("ImageGrid", () => {
  it("does not capture pointer events so labeling still works (issue #3378)", () => {
    const { getByTestId } = render(<ImageGrid item={makeItem()} />);

    const layer = getByTestId("ruler-layer");

    expect(layer.getAttribute("data-name")).toBe("ruler");
    // The grid must be non-interactive; otherwise it swallows the mouse events
    // needed to draw regions / assign labels.
    expect(layer.getAttribute("data-listening")).toBe("false");
  });

  it("draws a rectangle for every grid cell", () => {
    // 80x80 stage with a 40px grid => 2x2 = 4 cells.
    const { getAllByTestId } = render(<ImageGrid item={makeItem()} />);

    expect(getAllByTestId("grid-rect")).toHaveLength(4);
  });
});
