import { ImageView, LabelStudio, Sidebar } from "@humansignal/frontend-test/helpers/LSF/index";
import {
  polygonConfig,
  imageData,
  closedPolygonResult,
  unfinishedPolygonResult,
} from "../../data/outliner/polygon-lock";

function toggleRegionLock(idx: number) {
  Sidebar.regions
    .eq(idx)
    .trigger("mouseover")
    .find(".lsf-outliner-item__controls")
    .find(".lsf-outliner-item__control_type_lock button")
    .click({ force: true });
}

describe("Outliner - Polygon lock isolation", () => {
  it("should keep an unfinished polygon visible on the canvas when locked", () => {
    LabelStudio.params()
      .config(polygonConfig)
      .data(imageData)
      .withResult(unfinishedPolygonResult)
      .init();

    LabelStudio.waitForObjectsReady();
    ImageView.waitForImage();
    Sidebar.hasRegions(1);

    cy.log("Capture canvas before locking the unfinished polygon");
    ImageView.capture("before_lock_unfinished");

    cy.log("Lock the unfinished polygon region");
    toggleRegionLock(0);

    cy.log("The canvas should NOT change because the polygon should stay visible");
    ImageView.drawingArea.compareScreenshot("before_lock_unfinished", "shouldNotChange", {
      threshold: 0.05,
    });
  });

  it("should not mark an unfinished polygon as hidden when locking", () => {
    LabelStudio.params()
      .config(polygonConfig)
      .data(imageData)
      .withResult(unfinishedPolygonResult)
      .init();

    LabelStudio.waitForObjectsReady();
    ImageView.waitForImage();
    Sidebar.hasRegions(1);

    cy.log("Lock the unfinished polygon region");
    toggleRegionLock(0);

    cy.log("Verify the region is NOT hidden in the sidebar");
    Sidebar.hasHiddenRegion(0);

    cy.log("Verify the region model is locked but not hidden");
    cy.window().then((win: any) => {
      const annotation = win.Htx.annotationStore.selected;
      const region = annotation.regions[0];

      expect(region.locked).to.equal(true);
      expect(region.hidden).to.equal(false);
      expect(region.closed).to.equal(false);
    });
  });

  it("should correctly hide a finished polygon when locked (unchanged behaviour)", () => {
    LabelStudio.params()
      .config(polygonConfig)
      .data(imageData)
      .withResult(closedPolygonResult)
      .init();

    LabelStudio.waitForObjectsReady();
    ImageView.waitForImage();
    Sidebar.hasRegions(1);

    cy.log("Verify the finished polygon model state before locking");
    cy.window().then((win: any) => {
      const annotation = win.Htx.annotationStore.selected;
      const region = annotation.regions[0];

      expect(region.locked).to.equal(false);
      expect(region.hidden).to.equal(false);
      expect(region.closed).to.equal(true);
    });

    cy.log("Lock the finished polygon region");
    toggleRegionLock(0);

    cy.log("Finished polygon should still be locked and not hidden");
    cy.window().then((win: any) => {
      const annotation = win.Htx.annotationStore.selected;
      const region = annotation.regions[0];

      expect(region.locked).to.equal(true);
      expect(region.hidden).to.equal(false);
      expect(region.closed).to.equal(true);
    });

    Sidebar.hasHiddenRegion(0);
  });
});
