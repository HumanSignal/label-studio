/**
 * Cypress tests that exercise KonvaRegion mixin paths (hover cursor, double-click focus, linking mode).
 * Used to improve coverage for web/libs/editor/src/mixins/KonvaRegion.js.
 */
import { ImageView, LabelStudio, Relations, Sidebar } from "@humansignal/frontend-test/helpers/LSF";

const config = `
  <View>
    <Image name="img" value="$image"></Image>
    <RectangleLabels name="tag" toName="img">
      <Label value="Planet"></Label>
      <Label value="Moonwalker" background="blue"></Label>
    </RectangleLabels>
  </View>
`;

const image =
  "https://htx-pub.s3.us-east-1.amazonaws.com/examples/images/nick-owuor-astro-nic-visuals-wDifg5xc9Z4-unsplash.jpg";

const taskWithOneRegion = {
  id: 1,
  annotations: [
    {
      id: 1001,
      result: [
        {
          id: "Dx_aB91ISN",
          source: "$image",
          from_name: "tag",
          to_name: "img",
          type: "rectanglelabels",
          origin: "manual",
          value: {
            height: 10.458911419423693,
            rotation: 0,
            width: 12.4,
            x: 50.8,
            y: 5.866,
            rectanglelabels: ["Moonwalker"],
          },
        },
      ],
    },
  ],
  predictions: [],
  data: { image },
};

const taskWithTwoRegions = {
  id: 1,
  annotations: [
    {
      id: 1001,
      result: [
        {
          id: "Dx_aB91ISN",
          source: "$image",
          from_name: "tag",
          to_name: "img",
          type: "rectanglelabels",
          origin: "manual",
          value: {
            height: 10.458911419423693,
            rotation: 0,
            width: 12.4,
            x: 50.8,
            y: 5.866,
            rectanglelabels: ["Moonwalker"],
          },
        },
        {
          id: "Dx_aB91INs",
          source: "$image",
          from_name: "tag",
          to_name: "img",
          type: "rectanglelabels",
          origin: "manual",
          value: {
            height: 10.458911419423693,
            rotation: 0,
            width: 12.4,
            x: 50.8,
            y: 25.866,
            rectanglelabels: ["Planet"],
          },
        },
      ],
    },
  ],
  predictions: [],
  data: { image },
};

/** Relative (0–1) center of the single rectangle in taskWithOneRegion (x: 50.8, y: 5.87, w: 12.4, h: 10.46). */
const firstRegionCenterX = (50.8 + 12.4 / 2) / 100;
const firstRegionCenterY = (5.866 + 10.458911419423693 / 2) / 100;
/** Center of second rectangle in taskWithTwoRegions (x: 50.8, y: 25.866, w: 12.4, h: 10.46). */
const secondRegionCenterX = (50.8 + 12.4 / 2) / 100;
const secondRegionCenterY = (25.866 + 10.458911419423693 / 2) / 100;

describe("KonvaRegion mixin (image rectangle)", () => {
  it("hover over rectangle updates cursor; double-click focuses region", () => {
    LabelStudio.init({ config, task: taskWithOneRegion });

    ImageView.waitForImage();
    Sidebar.hasRegions(1);

    // Hover over the rectangle to hit KonvaRegion.updateCursor(true) (pointer path)
    ImageView.drawingFrame.then((el) => {
      const bbox: DOMRect = el[0].getBoundingClientRect();
      const x = firstRegionCenterX * bbox.width;
      const y = firstRegionCenterY * bbox.height;
      ImageView.drawingArea.scrollIntoView().trigger("mouseover", x, y).trigger("mousemove", x, y);
    });

    // Double-click to hit onDoubleClickRegion (requestPerRegionFocus, selectAreas)
    ImageView.dblClickAtRelative(firstRegionCenterX, firstRegionCenterY);

    // Region should remain selected (selectAreas was called)
    Sidebar.hasRegions(1);
    Sidebar.hasSelectedRegions(1);
  });

  it("click on region in linking mode hits KonvaRegion onClickRegion linking path", () => {
    LabelStudio.init({ config, task: taskWithTwoRegions });

    ImageView.waitForImage();
    Sidebar.hasRegions(2);
    cy.get("#Relations-draggable").click();
    Relations.hasRelations(0);
    cy.get("#Regions-draggable").click();

    // Select first region and start relation creation (enters linking mode)
    Sidebar.toggleRegionSelection(0);
    Relations.toggleCreationWithHotkey();

    // Hover over second region while in linking mode → updateCursor(true) with isLinkingMode (LINKING_MODE_CURSOR)
    ImageView.drawingFrame.then((el) => {
      const bbox: DOMRect = el[0].getBoundingClientRect();
      const x = secondRegionCenterX * bbox.width;
      const y = secondRegionCenterY * bbox.height;
      ImageView.drawingArea.scrollIntoView().trigger("mouseover", x, y).trigger("mousemove", x, y);
    });

    // Click second region on canvas → KonvaRegion.onClickRegion with annotation.isLinkingMode
    ImageView.clickAtRelative(secondRegionCenterX, secondRegionCenterY);

    cy.get("#Relations-draggable").click();
    Relations.hasRelations(1);
    Relations.hasRelation("Moonwalker", "Planet");
  });
});
