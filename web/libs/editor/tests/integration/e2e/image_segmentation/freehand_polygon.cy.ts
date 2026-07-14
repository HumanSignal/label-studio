import { Hotkeys, ImageView, LabelStudio, Sidebar } from "@humansignal/frontend-test/helpers/LSF";
import { FF_POLYGON_FREEHAND } from "../../../../src/utils/feature-flags";
import { imageData, imageToolsConfig } from "../../data/image_segmentation/stage_interactions";

const drawFreehand = (pointerType = "mouse", includeCompatibilityMouseEvents = false) => {
  ImageView.drawingArea.then(($element) => {
    const { width, height } = $element[0].getBoundingClientRect();
    const points = [
      [width * 0.2, height * 0.2],
      [width * 0.7, height * 0.2],
      [width * 0.7, height * 0.7],
      [width * 0.2, height * 0.7],
    ];
    const pointer = { eventConstructor: "PointerEvent", pointerId: 1, pointerType, isPrimary: true };

    let interaction = cy
      .wrap($element)
      .trigger("pointerdown", points[0][0], points[0][1], { ...pointer, button: 0, buttons: 1 });

    if (includeCompatibilityMouseEvents) {
      interaction = interaction.trigger("mousedown", points[0][0], points[0][1], { button: 0, buttons: 1 });
    }

    points.slice(1).forEach(([x, y]) => {
      interaction = interaction.trigger("pointermove", x, y, { ...pointer, buttons: 1 });
      if (includeCompatibilityMouseEvents) interaction = interaction.trigger("mousemove", x, y, { buttons: 1 });
    });

    interaction = interaction.trigger("pointerup", points[3][0], points[3][1], {
      ...pointer,
      button: 0,
      buttons: 0,
    });
    if (includeCompatibilityMouseEvents) {
      interaction
        .trigger("mouseup", points[3][0], points[3][1], { button: 0, buttons: 0 })
        .trigger("click", points[3][0], points[3][1], { button: 0, buttons: 0 });
    }
  });
};

const drawClickPolygon = () => {
  ImageView.drawPolygonRelative(
    [
      [0.2, 0.2],
      [0.7, 0.2],
      [0.7, 0.7],
      [0.2, 0.7],
    ],
    true,
  );
};

describe("Freehand Polygon", () => {
  it("ignores pointer drags while the feature flag is off", () => {
    LabelStudio.addFeatureFlagsOnPageLoad({ [FF_POLYGON_FREEHAND]: false });
    LabelStudio.params().config(imageToolsConfig).data(imageData).withResult([]).init();
    LabelStudio.waitForImageReady();
    ImageView.selectPolygonToolByButton();

    drawFreehand();

    Sidebar.hasNoRegions();
  });

  [false, true].forEach((freehandEnabled) => {
    it(`preserves click-to-place drawing while the feature flag is ${freehandEnabled ? "on" : "off"}`, () => {
      LabelStudio.addFeatureFlagsOnPageLoad({ [FF_POLYGON_FREEHAND]: freehandEnabled });
      LabelStudio.params().config(imageToolsConfig).data(imageData).withResult([]).init();
      LabelStudio.waitForImageReady();
      ImageView.selectPolygonToolByButton();

      drawClickPolygon();

      Sidebar.hasRegions(1);
    });
  });

  ["mouse", "pen", "touch"].forEach((pointerType) => {
    it(`draws one undoable contour with ${pointerType} input`, () => {
      LabelStudio.addFeatureFlagsOnPageLoad({ [FF_POLYGON_FREEHAND]: true });
      LabelStudio.params().config(imageToolsConfig).data(imageData).withResult([]).init();
      LabelStudio.waitForImageReady();
      ImageView.selectPolygonToolByButton();

      drawFreehand(pointerType);

      Sidebar.hasRegions(1);
      Hotkeys.undo();
      Sidebar.hasNoRegions();
    });
  });

  it("creates only one contour when the browser emits compatibility mouse events", () => {
    LabelStudio.addFeatureFlagsOnPageLoad({ [FF_POLYGON_FREEHAND]: true });
    LabelStudio.params().config(imageToolsConfig).data(imageData).withResult([]).init();
    LabelStudio.waitForImageReady();
    ImageView.selectPolygonToolByButton();

    drawFreehand("mouse", true);

    Sidebar.hasRegions(1);
    Hotkeys.undo();
    Sidebar.hasNoRegions();
  });
});
