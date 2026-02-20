import { ImageView, LabelStudio, Sidebar, Labels, TimeSeries } from "@humansignal/frontend-test/helpers/LSF";
import { imageData, imageToolsConfig } from "../../data/image_segmentation/stage_interactions";
import { singleChannelConfig, heavyDatasetForDisplacement } from "../../data/timeseries/charts-displaying";

/**
 * Codecov: components/Toolbar/Toolbar.jsx
 * Exercises toolbar by switching between image tools (rectangle, polygon, brush).
 */
describe("Codecov: Toolbar.jsx", () => {
  it("toolbar renders and tool switches run when switching rectangle, polygon, brush", () => {
    LabelStudio.params().config(imageToolsConfig).data(imageData).withResult([]).init();
    LabelStudio.waitForImageReady();

    ImageView.selectRectangleToolByButton();
    ImageView.selectPolygonToolByButton();
    ImageView.selectBrushToolByButton();
    ImageView.selectRectangleToolByButton();

    Sidebar.hasNoRegions();
  });
});

/**
 * Codecov: tags/control/Polygon.js
 * Polygon tool and hotkeys path when drawing a polygon.
 */
describe("Codecov: Polygon.js", () => {
  it("draws polygon and exercises Polygon model/hotkeys", () => {
    LabelStudio.params().config(imageToolsConfig).data(imageData).withResult([]).init();
    LabelStudio.waitForImageReady();

    ImageView.selectPolygonToolByButton();
    ImageView.drawPolygonRelative(
      [
        [0.2, 0.2],
        [0.4, 0.2],
        [0.4, 0.4],
        [0.2, 0.4],
      ],
      true,
    );

    Sidebar.hasRegions(1);
  });
});

/**
 * Codecov: utils/canvas.js (brush path uses labelToSVG, RLE, etc.)
 * Selecting brush tool and drawing exercises canvas utilities.
 */
describe("Codecov: canvas.js (brush)", () => {
  it("brush tool selected and draw exercises canvas labelToSVG / brush path", () => {
    LabelStudio.params().config(imageToolsConfig).data(imageData).withResult([]).init();
    LabelStudio.waitForImageReady();

    ImageView.selectBrushToolByButton();
    ImageView.drawRectRelative(0.3, 0.3, 0.1, 0.1);

    Sidebar.hasRegions(1);
  });
});

/**
 * Codecov: regions/TimeSeriesRegion.js
 * Drawing a timeseries region exercises TimeSeriesRegion.
 */
describe("Codecov: TimeSeriesRegion.js", () => {
  it("draws a TimeSeries region", () => {
    LabelStudio.params().config(singleChannelConfig).data(heavyDatasetForDisplacement).withResult([]).init();

    LabelStudio.waitForObjectsReady();
    TimeSeries.waitForReady();

    Labels.select("Peak");
    TimeSeries.drawRegionRelative(0.2, 0.5);

    Sidebar.hasRegions(1);
  });
});
