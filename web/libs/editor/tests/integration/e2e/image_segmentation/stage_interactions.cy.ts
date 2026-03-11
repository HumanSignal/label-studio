import { ImageView, LabelStudio, Sidebar } from "@humansignal/frontend-test/helpers/LSF";
import { Hotkeys } from "@humansignal/frontend-test/helpers/LSF/Hotkeys";
import {
  imageData,
  imageToolsConfig,
  imageToolsConfigWithRotate,
} from "../../data/image_segmentation/stage_interactions";

beforeEach(() => {
  LabelStudio.addFeatureFlagsOnPageLoad({
    fflag_fix_front_leap_32_zoom_perf_190923_short: true,
  });
});

describe("Image Segmentation Stage Interactions", () => {
  it("should not be able to draw outside of image's boundaries", () => {
    LabelStudio.params().config(imageToolsConfig).data(imageData).withResult([]).init();
    LabelStudio.waitForObjectsReady();

    // Check all interactions at space between

    ImageView.selectRectangleToolByButton();
    // two clicks
    ImageView.clickAtRelative(1.1, 0.4);
    ImageView.clickAtRelative(1.3, 0.5);
    // drag and drop
    ImageView.drawRectRelative(1.1, 0.4, 0.2, 0.2);
    // dblclick
    ImageView.dblClickAtRelative(1.1, 0.4);

    ImageView.selectEllipseToolByButton();
    // two clicks
    ImageView.clickAtRelative(1.1, 0.4);
    ImageView.clickAtRelative(1.3, 0.5);
    // drag and drop
    ImageView.drawRectRelative(1.1, 0.4, 0.2, 0.2);
    // dblclick
    ImageView.dblClickAtRelative(1.1, 0.4);

    ImageView.selectPolygonToolByButton();
    // draw triangle
    ImageView.drawPolygonRelative(
      [
        [1.1, 0.4],
        [1.3, 0.5],
        [1.1, 0.6],
      ],
      true,
    );
    // dblclick
    ImageView.dblClickAtRelative(1.1, 0.4);

    ImageView.selectKeypointToolByButton();
    // click
    ImageView.clickAtRelative(1.1, 0.4);

    ImageView.selectBrushToolByButton();
    // click
    ImageView.clickAtRelative(1.1, 0.4);
    // draw
    ImageView.drawRectRelative(1.1, 0.4, 0.2, 0.2);

    Sidebar.hasRegions(0);
  });

  it("should be able to draw outside of initial image boundaries after zoom (Rectangle)", () => {
    LabelStudio.params().config(imageToolsConfig).data(imageData).withResult([]).init();
    LabelStudio.waitForObjectsReady();

    for (let i = 0; i < 10; i++) {
      ImageView.zoomInWithHotkey();
    }

    ImageView.selectRectangleToolByButton();
    // two clicks
    ImageView.clickAtRelative(0.8, 0.1);
    ImageView.clickAtRelative(0.9, 0.2);
    Sidebar.hasRegions(1);
    // drag and drop
    ImageView.drawRectRelative(0.8, 0.3, 0.1, 0.1);
    Sidebar.hasRegions(2);
    // dblclick
    ImageView.dblClickAtRelative(0.8, 0.5);
    Sidebar.hasRegions(3);
  });
  it("should be able to draw outside of initial image boundaries after zoom (Ellipse)", () => {
    LabelStudio.params().config(imageToolsConfig).data(imageData).withResult([]).init();
    LabelStudio.waitForObjectsReady();

    for (let i = 0; i < 10; i++) {
      ImageView.zoomInWithHotkey();
    }

    ImageView.selectEllipseToolByButton();
    // two clicks
    ImageView.clickAtRelative(0.8, 0.1);
    ImageView.clickAtRelative(0.9, 0.2);
    Sidebar.hasRegions(1);
    // drag and drop
    ImageView.drawRectRelative(0.8, 0.3, 0.1, 0.1);
    Sidebar.hasRegions(2);
    // dblclick
    ImageView.dblClickAtRelative(0.8, 0.5);
    Sidebar.hasRegions(3);
  });
  it("should be able to draw outside of initial image boundaries after zoom (Polygon)", () => {
    LabelStudio.params().config(imageToolsConfig).data(imageData).withResult([]).init();
    LabelStudio.waitForObjectsReady();

    for (let i = 0; i < 10; i++) {
      ImageView.zoomInWithHotkey();
    }

    ImageView.selectPolygonToolByButton();
    // draw triangle
    ImageView.drawPolygonRelative(
      [
        [0.8, 0.1],
        [0.9, 0.2],
        [0.8, 0.3],
      ],
      false,
    );
    // Wait for polygon segments to be rendered before closing (yield to render loop)
    ImageView.drawingArea.get("canvas").should("be.visible");
    cy.window().then(
      (win) => new Promise<void>((r) => win.requestAnimationFrame(() => win.requestAnimationFrame(() => r()))),
    );
    ImageView.clickAtRelative(0.8, 0.1);
    Sidebar.hasRegions(1);
    // dblclick
    ImageView.dblClickAtRelative(0.8, 0.4);
    Sidebar.hasRegions(2);
  });
  it("should be able to draw outside of initial image boundaries after zoom (KeyPoint)", () => {
    LabelStudio.params().config(imageToolsConfig).data(imageData).withResult([]).init();
    LabelStudio.waitForObjectsReady();

    for (let i = 0; i < 10; i++) {
      ImageView.zoomInWithHotkey();
    }

    ImageView.selectKeypointToolByButton();
    // click
    ImageView.clickAtRelative(0.8, 0.4);
    Sidebar.hasRegions(1);
  });
  it("should be able to draw outside of initial image boundaries after zoom (Brush)", () => {
    LabelStudio.params().config(imageToolsConfig).data(imageData).withResult([]).init();
    LabelStudio.waitForObjectsReady();

    for (let i = 0; i < 10; i++) {
      ImageView.zoomInWithHotkey();
    }

    ImageView.selectBrushToolByButton();
    // click
    ImageView.clickAtRelative(0.8, 0.1);
    Sidebar.hasRegions(1);
    // draw
    Hotkeys.unselectAllRegions();
    ImageView.drawRectRelative(0.8, 0.4, 0.1, 0.2);
    Sidebar.hasRegions(2);
  });

  describe("Rotate and Zoom toolbar", () => {
    it("should rotate image left and right via toolbar buttons", () => {
      LabelStudio.params().config(imageToolsConfigWithRotate).data(imageData).withResult([]).init();
      LabelStudio.waitForImageReady();

      ImageView.rotateLeft();
      ImageView.rotateRight();
      ImageView.rotateRight();
      ImageView.rotateLeft();
      // Image still visible after rotations
      ImageView.drawingArea.get("canvas").should("be.visible");
    });

    it("should rotate image via keyboard shortcuts (alt+ArrowLeft, alt+ArrowRight)", () => {
      LabelStudio.params().config(imageToolsConfigWithRotate).data(imageData).withResult([]).init();
      LabelStudio.waitForImageReady();

      cy.get("body").focus().trigger("keydown", { key: "ArrowLeft", altKey: true });
      cy.get("body").focus().trigger("keydown", { key: "ArrowRight", altKey: true });
      ImageView.drawingArea.get("canvas").should("be.visible");
    });

    it("should allow drawing after rotate", () => {
      LabelStudio.params().config(imageToolsConfigWithRotate).data(imageData).withResult([]).init();
      LabelStudio.waitForImageReady();

      ImageView.rotateRight();
      ImageView.selectRectangleToolByButton();
      ImageView.drawRectRelative(0.2, 0.2, 0.3, 0.3);
      Sidebar.hasRegions(1);
    });

    it("should zoom in and out via toolbar buttons", () => {
      LabelStudio.params().config(imageToolsConfig).data(imageData).withResult([]).init();
      LabelStudio.waitForImageReady();

      ImageView.zoomInByButton();
      ImageView.zoomInByButton();
      ImageView.zoomOutByButton();
      ImageView.drawingArea.get("canvas").should("be.visible");
    });

    it("should zoom to fit and zoom to actual size via flyout", () => {
      LabelStudio.params().config(imageToolsConfig).data(imageData).withResult([]).init();
      LabelStudio.waitForImageReady();

      ImageView.toolBar.find('[title="Zoom presets (click to see options)"]').click();
      cy.contains("Zoom to fit").click();
      ImageView.drawingArea.get("canvas").should("be.visible");

      ImageView.toolBar.find('[title="Zoom presets (click to see options)"]').click();
      cy.contains("Zoom to actual size").click();
      ImageView.drawingArea.get("canvas").should("be.visible");
    });

    it("should toggle pan tool", () => {
      LabelStudio.params().config(imageToolsConfig).data(imageData).withResult([]).init();
      LabelStudio.waitForImageReady();

      ImageView.toolBar.find('[aria-label="pan"]').should("be.visible").click();
      ImageView.toolBar.find('[aria-label="pan"]').should("have.class", "lsf-tool_active");
      ImageView.toolBar.find('[aria-label="pan"]').click();
      ImageView.toolBar.find('[aria-label="pan"]').should("not.have.class", "lsf-tool_active");
    });

    it("should pan the stage when pan tool is active and user drags", () => {
      LabelStudio.params().config(imageToolsConfig).data(imageData).withResult([]).init();
      LabelStudio.waitForImageReady();

      ImageView.zoomInByButton();
      ImageView.zoomInByButton();
      ImageView.toolBar.find('[aria-label="pan"]').click();
      ImageView.toolBar.find('[aria-label="pan"]').should("have.class", "lsf-tool_active");

      ImageView.drawingArea
        .scrollIntoView()
        .trigger("mousedown", 100, 100, { eventConstructor: "MouseEvent", button: 0, buttons: 1 })
        .trigger("mousemove", 150, 100, {
          eventConstructor: "MouseEvent",
          button: 0,
          buttons: 1,
          movementX: 50,
          movementY: 0,
        })
        .trigger("mouseup", 150, 100, { eventConstructor: "MouseEvent", button: 0, buttons: 1 });

      ImageView.drawingArea.get("canvas").should("be.visible");
    });
  });
});
