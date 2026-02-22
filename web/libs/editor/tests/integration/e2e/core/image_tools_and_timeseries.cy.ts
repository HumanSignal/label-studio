import { Hotkeys, ImageView, LabelStudio, Sidebar, Labels, TimeSeries } from "@humansignal/frontend-test/helpers/LSF";
import { imageData, imageToolsConfig } from "../../data/image_segmentation/stage_interactions";
import { singleChannelConfig, heavyDatasetForDisplacement } from "../../data/timeseries/charts-displaying";

describe("Image toolbar tool switching", () => {
  it("switches between rectangle, polygon, and brush tools", () => {
    LabelStudio.params().config(imageToolsConfig).data(imageData).withResult([]).init();
    LabelStudio.waitForImageReady();

    ImageView.selectRectangleToolByButton();
    ImageView.selectPolygonToolByButton();
    ImageView.selectBrushToolByButton();
    ImageView.selectRectangleToolByButton();

    Sidebar.hasNoRegions();
  });

  it("switches between ellipse and keypoint tools", () => {
    LabelStudio.params().config(imageToolsConfig).data(imageData).withResult([]).init();
    LabelStudio.waitForImageReady();

    ImageView.selectEllipseToolByButton();
    ImageView.selectKeypointToolByButton();
    ImageView.selectRectangleToolByButton();

    Sidebar.hasNoRegions();
  });
});

describe("Polygon tool", () => {
  it("draws a closed polygon", () => {
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

  it("draws two polygons", () => {
    LabelStudio.params().config(imageToolsConfig).data(imageData).withResult([]).init();
    LabelStudio.waitForImageReady();

    ImageView.selectPolygonToolByButton();
    ImageView.drawPolygonRelative(
      [
        [0.15, 0.15],
        [0.35, 0.15],
        [0.35, 0.35],
        [0.15, 0.35],
      ],
      true,
    );
    ImageView.drawPolygonRelative(
      [
        [0.55, 0.55],
        [0.75, 0.55],
        [0.75, 0.75],
        [0.55, 0.75],
      ],
      true,
    );
    Sidebar.hasRegions(2);
  });

  it("undo last point while drawing polygon", () => {
    LabelStudio.params().config(imageToolsConfig).data(imageData).withResult([]).init();
    LabelStudio.waitForImageReady();

    ImageView.selectPolygonToolByButton();
    ImageView.drawPolygonRelative(
      [
        [0.15, 0.15],
        [0.35, 0.15],
        [0.35, 0.35],
      ],
      false,
    );
    Hotkeys.undo();
    ImageView.drawPolygonRelative(
      [
        [0.35, 0.35],
        [0.55, 0.55],
        [0.15, 0.15],
      ],
      true,
    );
    Sidebar.hasRegions(1);
  });

  it("redo point after undo while drawing polygon", () => {
    LabelStudio.params().config(imageToolsConfig).data(imageData).withResult([]).init();
    LabelStudio.waitForImageReady();

    ImageView.selectPolygonToolByButton();
    ImageView.drawPolygonRelative(
      [
        [0.2, 0.2],
        [0.35, 0.2],
      ],
      false,
    );
    Hotkeys.undo();
    Hotkeys.redo();
    ImageView.drawPolygonRelative(
      [
        [0.35, 0.35],
        [0.2, 0.2],
      ],
      true,
    );
    Sidebar.hasRegions(1);
  });
});

describe("Brush tool", () => {
  it("draws a brush region on image", () => {
    LabelStudio.params().config(imageToolsConfig).data(imageData).withResult([]).init();
    LabelStudio.waitForImageReady();

    ImageView.selectBrushToolByButton();
    ImageView.drawRectRelative(0.3, 0.3, 0.1, 0.1);

    Sidebar.hasRegions(1);
  });

  it("clicks on drawn brush region after switching to rectangle tool", () => {
    LabelStudio.params().config(imageToolsConfig).data(imageData).withResult([]).init();
    LabelStudio.waitForImageReady();

    ImageView.selectBrushToolByButton();
    ImageView.drawRectRelative(0.35, 0.35, 0.2, 0.2);
    Sidebar.hasRegions(1);

    ImageView.selectRectangleToolByButton();
    ImageView.clickAtStageRelative(0.45, 0.45);
    Sidebar.hasRegions(1);
  });
});

describe("TimeSeries region drawing and selection", () => {
  it("draws a TimeSeries region", () => {
    LabelStudio.params().config(singleChannelConfig).data(heavyDatasetForDisplacement).withResult([]).init();

    LabelStudio.waitForObjectsReady();
    TimeSeries.waitForReady();

    Labels.select("Peak");
    TimeSeries.drawRegionRelative(0.2, 0.5);

    Sidebar.hasRegions(1);
  });

  it("selects drawn TimeSeries region via outliner and shows details", () => {
    LabelStudio.params().config(singleChannelConfig).data(heavyDatasetForDisplacement).withResult([]).init();

    LabelStudio.waitForObjectsReady();
    TimeSeries.waitForReady();

    Labels.select("Peak");
    TimeSeries.drawRegionRelative(0.25, 0.55);
    Sidebar.hasRegions(1);

    cy.get("#Regions-draggable").click();
    cy.get(".lsf-outliner-item").first().click();
    cy.get("[data-testid='detailed-region']").should("be.visible");
  });
});
