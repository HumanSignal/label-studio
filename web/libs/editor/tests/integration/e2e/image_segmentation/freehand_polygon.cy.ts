import { Hotkeys, ImageView, LabelStudio, Sidebar } from "@humansignal/frontend-test/helpers/LSF";
import { FF_DEV_1442, FF_POLYGON_FREEHAND } from "../../../../src/utils/feature-flags";
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

const repairSelectedPolygon = (includeCompatibilityMouseEvents = false) => {
  ImageView.drawingArea.then(($element) => {
    const { width, height } = $element[0].getBoundingClientRect();
    const points = [
      [width * 0.3, height * 0.2],
      [width * 0.34, height * 0.17],
      [width * 0.38, height * 0.15],
      [width * 0.42, height * 0.14],
      [width * 0.46, height * 0.13],
      [width * 0.5, height * 0.14],
      [width * 0.54, height * 0.15],
      [width * 0.57, height * 0.17],
      [width * 0.6, height * 0.2],
    ];
    const pointer = { eventConstructor: "PointerEvent", pointerId: 2, pointerType: "mouse", isPrimary: true };
    let interaction = cy
      .wrap($element)
      .trigger("pointerdown", points[0][0], points[0][1], { ...pointer, button: 0, buttons: 1 });

    if (includeCompatibilityMouseEvents) {
      interaction = interaction.trigger("mousedown", points[0][0], points[0][1], { button: 0, buttons: 1 });
    }

    points.slice(1, -1).forEach(([x, y]) => {
      interaction = interaction.trigger("pointermove", x, y, { ...pointer, buttons: 1 });
      if (includeCompatibilityMouseEvents) interaction = interaction.trigger("mousemove", x, y, { buttons: 1 });
    });
    interaction = interaction.trigger("pointerup", points[points.length - 1][0], points[points.length - 1][1], {
      ...pointer,
      button: 0,
      buttons: 0,
    });
    if (includeCompatibilityMouseEvents) {
      interaction
        .trigger("mouseup", points[points.length - 1][0], points[points.length - 1][1], {
          button: 0,
          buttons: 0,
        })
        .trigger("click", points[points.length - 1][0], points[points.length - 1][1], {
          button: 0,
          buttons: 0,
        });
    }
  });
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

  [false, true].forEach((deferredClickEnabled) => {
    it(`creates only one contour with compatibility mouse events and deferred click ${
      deferredClickEnabled ? "enabled" : "disabled"
    }`, () => {
      LabelStudio.addFeatureFlagsOnPageLoad({
        [FF_POLYGON_FREEHAND]: true,
        [FF_DEV_1442]: deferredClickEnabled,
      });
      LabelStudio.params().config(imageToolsConfig).data(imageData).withResult([]).init();
      LabelStudio.waitForImageReady();
      ImageView.selectPolygonToolByButton();

      drawFreehand("mouse", true);

      Sidebar.hasRegions(1);
      Hotkeys.undo();
      Sidebar.hasNoRegions();
    });
  });

  it("repairs a selected contour in one undoable edit without replacing the region", () => {
    LabelStudio.addFeatureFlagsOnPageLoad({ [FF_POLYGON_FREEHAND]: true });
    LabelStudio.params().config(imageToolsConfig).data(imageData).withResult([]).init();
    LabelStudio.waitForImageReady();
    ImageView.selectPolygonToolByButton();
    drawClickPolygon();
    Sidebar.hasRegions(1);

    ImageView.clickAtRelative(0.45, 0.45);
    Sidebar.hasSelectedRegions(1);

    LabelStudio.serialize().then((beforeResult) => {
      const before = beforeResult[0];
      const beforePoints = before.value.points.map((point) => [...point]);

      repairSelectedPolygon(true);
      Sidebar.hasRegions(1);

      LabelStudio.serialize().then((afterResult) => {
        const after = afterResult[0];
        const afterPoints = after.value.points.map((point) => [...point]);

        expect(after.id).to.equal(before.id);
        expect(afterPoints).not.to.deep.equal(beforePoints);

        Hotkeys.undo();
        Sidebar.hasRegions(1);
        LabelStudio.serialize().then((undoResult) => {
          expect(undoResult[0].id).to.equal(before.id);
          expect(undoResult[0].value.points).to.deep.equal(beforePoints);
        });

        Hotkeys.redo();
        Sidebar.hasRegions(1);
        LabelStudio.serialize().then((redoResult) => {
          expect(redoResult[0].id).to.equal(before.id);
          expect(redoResult[0].value.points).to.deep.equal(afterPoints);
        });
      });
    });
  });
});
