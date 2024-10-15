import { ImageView, LabelStudio, Sidebar } from "@humansignal/frontend-test/helpers/LSF";
import { image, imageToolsConfig } from "../../data/image_segmentation/ctrl";

describe("Image Segmentation - Drawing with ctrl pressed", () => {
  it("should add region to selection when something selected - Rectangle", () => {
    LabelStudio.params().config(imageToolsConfig).data({ image }).withResult([]).init();

    ImageView.waitForImage();
    ImageView.selectRectangleToolByButton();
    cy.log("Prepare 2 rectangles");
    ImageView.drawRectRelative(0.1, 0.1, 0.4, 0.8);
    ImageView.drawRectRelative(0.55, 0.1, 0.4, 0.8);
    cy.log("Select first rectangle");
    ImageView.clickAtRelative(0.3, 0.3);
    cy.log("Add second rectangle to selection with ctrl pressed");
    ImageView.clickAtRelative(0.7, 0.3, { metaKey: true });
    Sidebar.hasSelectedRegions(2);
  });

  it("should add region to selection when something selected - Ellipse", () => {
    LabelStudio.params().config(imageToolsConfig).data({ image }).withResult([]).init();

    ImageView.waitForImage();
    ImageView.selectEllipseToolByButton();
    cy.log("Prepare 2 ellipses");
    ImageView.drawRectRelative(0.25, 0.5, 0.2, 0.4);
    ImageView.drawRectRelative(0.75, 0.5, 0.2, 0.4);
    cy.log("Select first ellipse");
    ImageView.clickAtRelative(0.25, 0.5);
    cy.log("Add second ellipse to selection with ctrl pressed");
    ImageView.clickAtRelative(0.75, 0.5, { metaKey: true });
    Sidebar.hasSelectedRegions(2);
  });

  it("should add region to selection when something selected - Polygon", () => {
    LabelStudio.params().config(imageToolsConfig).data({ image }).withResult([]).init();

    ImageView.waitForImage();
    ImageView.selectPolygonToolByButton();
    cy.log("Prepare 2 polygons");
    ImageView.drawPolygonRelative(
      [
        [0.1, 0.1],
        [0.4, 0.1],
        [0.25, 0.9],
      ],
      true,
    );
    ImageView.drawPolygonRelative(
      [
        [0.6, 0.1],
        [0.9, 0.1],
        [0.75, 0.9],
      ],
      true,
    );
    cy.log("Select first polygon");
    ImageView.clickAtRelative(0.25, 0.5);
    cy.log("Add second polygon to selection with ctrl pressed");
    ImageView.clickAtRelative(0.75, 0.5, { metaKey: true });
    Sidebar.hasSelectedRegions(2);
  });

  it("should draw region through other region - Rectangle", () => {
    LabelStudio.params().config(imageToolsConfig).data({ image }).withResult([]).init();

    ImageView.waitForImage();
    ImageView.selectRectangleToolByButton();
    cy.log("Prepare 2 rectangles");
    ImageView.drawRectRelative(0.1, 0.1, 0.4, 0.8);
    ImageView.drawRectRelative(0.55, 0.1, 0.4, 0.8);
    cy.log("Draw rectangle through other rectangle with ctrl pressed");
    ImageView.drawRectRelative(0.3, 0.3, 0.4, 0.4, { metaKey: true });
    Sidebar.hasSelectedRegions(0);
    Sidebar.hasRegions(3);
  });

  it("should draw region through other region - Ellipse", () => {
    LabelStudio.params().config(imageToolsConfig).data({ image }).withResult([]).init();

    ImageView.waitForImage();
    ImageView.selectEllipseToolByButton();
    cy.log("Prepare 2 ellipses");
    ImageView.drawRectRelative(0.25, 0.5, 0.2, 0.4);
    ImageView.drawRectRelative(0.75, 0.5, 0.2, 0.4);
    cy.log("Draw ellipse through other ellipse with ctrl pressed");
    ImageView.drawRectRelative(0.25, 0.5, 0.4, 0.4, { metaKey: true });
    Sidebar.hasSelectedRegions(0);
    Sidebar.hasRegions(3);
  });

  it("should draw region through other region - Polygon", () => {
    LabelStudio.params().config(imageToolsConfig).data({ image }).withResult([]).init();

    ImageView.waitForImage();
    ImageView.selectPolygonToolByButton();
    cy.log("Prepare 2 polygons");
    ImageView.drawPolygonRelative(
      [
        [0.1, 0.1],
        [0.4, 0.1],
        [0.25, 0.9],
      ],
      true,
    );
    ImageView.drawPolygonRelative(
      [
        [0.6, 0.1],
        [0.9, 0.1],
        [0.75, 0.9],
      ],
      true,
    );
    cy.log("Draw polygon through other polygon with ctrl pressed");
    ImageView.drawPolygonRelative(
      [
        [0.25, 0.2],
        [0.75, 0.2],
        [0.75, 0.3],
        [0.25, 0.3],
      ],
      true,
      { metaKey: true },
    );
    Sidebar.hasSelectedRegions(0);
    Sidebar.hasRegions(3);
  });

  it("should add region to selection when something selected - MoveTool", () => {
    LabelStudio.params().config(imageToolsConfig).data({ image }).withResult([]).init();

    ImageView.waitForImage();
    ImageView.selectRectangleToolByButton();
    cy.log("Prepare 2 rectangles");
    ImageView.drawRectRelative(0.1, 0.1, 0.4, 0.8);
    ImageView.drawRectRelative(0.55, 0.1, 0.4, 0.8);
    cy.log("Switch to MoveTool");
    ImageView.selectMoveToolByButton();
    cy.log("Select first rectangle");
    ImageView.clickAtRelative(0.3, 0.3);
    cy.log("Add second rectangle to selection with ctrl pressed");
    ImageView.clickAtRelative(0.7, 0.3, { metaKey: true });
    Sidebar.hasSelectedRegions(2);
  });

  it("should add region to selection from scratch - MoveTool", () => {
    LabelStudio.params().config(imageToolsConfig).data({ image }).withResult([]).init();

    ImageView.waitForImage();
    ImageView.selectRectangleToolByButton();
    cy.log("Prepare 2 rectangles");
    ImageView.drawRectRelative(0.1, 0.1, 0.4, 0.8);
    ImageView.drawRectRelative(0.55, 0.1, 0.4, 0.8);
    cy.log("Switch to MoveTool");
    ImageView.selectMoveToolByButton();
    cy.log("Select first rectangle");
    ImageView.clickAtRelative(0.3, 0.3, { metaKey: true });
    cy.log("Add second rectangle to selection with ctrl pressed");
    ImageView.clickAtRelative(0.7, 0.3, { metaKey: true });
    Sidebar.hasSelectedRegions(2);
  });
});
