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

describe("Outliner - Polygon lock/hide controls for unfinished polygons", () => {
  it("should not show lock button for unfinished polygons", () => {
    LabelStudio.params().config(polygonConfig).data(imageData).withResult(unfinishedPolygonResult).init();

    LabelStudio.waitForObjectsReady();
    ImageView.waitForImage();
    Sidebar.hasRegions(1);

    cy.log("Verify the unfinished polygon is in incomplete state");
    cy.window().then((win: any) => {
      const annotation = win.Htx.annotationStore.selected;
      const region = annotation.regions[0];

      expect(region.closed).to.equal(false);
      expect(region.incomplete).to.equal(true);
    });

    cy.log("Lock button should not be present for unfinished polygon");
    Sidebar.regions
      .eq(0)
      .trigger("mouseover")
      .find(".lsf-outliner-item__controls")
      .find(".lsf-outliner-item__control_type_lock button")
      .should("not.exist");
  });

  it("should not show hide button for unfinished polygons", () => {
    LabelStudio.params().config(polygonConfig).data(imageData).withResult(unfinishedPolygonResult).init();

    LabelStudio.waitForObjectsReady();
    ImageView.waitForImage();
    Sidebar.hasRegions(1);

    cy.log("Hide button should not be present for unfinished polygon");
    Sidebar.regions
      .eq(0)
      .trigger("mouseover")
      .find(".lsf-outliner-item__controls")
      .find(".lsf-outliner-item__control_type_visibility button")
      .should("not.exist");
  });

  it("should show lock and hide buttons for finished polygons", () => {
    LabelStudio.params().config(polygonConfig).data(imageData).withResult(closedPolygonResult).init();

    LabelStudio.waitForObjectsReady();
    ImageView.waitForImage();
    Sidebar.hasRegions(1);

    cy.log("Verify the finished polygon model state");
    cy.window().then((win: any) => {
      const annotation = win.Htx.annotationStore.selected;
      const region = annotation.regions[0];

      expect(region.locked).to.equal(false);
      expect(region.hidden).to.equal(false);
      expect(region.closed).to.equal(true);
      expect(region.incomplete).to.equal(false);
    });

    cy.log("Lock button should be present for finished polygon");
    Sidebar.regions
      .eq(0)
      .trigger("mouseover")
      .find(".lsf-outliner-item__controls")
      .find(".lsf-outliner-item__control_type_lock button")
      .should("exist");

    cy.log("Lock the finished polygon region");
    toggleRegionLock(0);

    cy.log("Finished polygon should be locked and not hidden");
    cy.window().then((win: any) => {
      const annotation = win.Htx.annotationStore.selected;
      const region = annotation.regions[0];

      expect(region.locked).to.equal(true);
      expect(region.hidden).to.equal(false);
      expect(region.closed).to.equal(true);
    });
  });

  it("should not lock unfinished polygon via hotkey", () => {
    LabelStudio.params().config(polygonConfig).data(imageData).withResult(unfinishedPolygonResult).init();

    LabelStudio.waitForObjectsReady();
    ImageView.waitForImage();
    Sidebar.hasRegions(1);

    cy.log("Select the unfinished polygon");
    Sidebar.regions.eq(0).click();

    cy.log("Verify unfinished polygon is selected");
    cy.window().then((win: any) => {
      const annotation = win.Htx.annotationStore.selected;
      const region = annotation.regions[0];

      expect(region.selected).to.equal(true);
      expect(region.closed).to.equal(false);
      expect(region.incomplete).to.equal(true);
      expect(region.locked).to.equal(false);
    });

    cy.log("Press lock hotkey (Ctrl+L)");
    cy.get("body").type("{ctrl}l");

    cy.log("Unfinished polygon should remain unlocked");
    cy.window().then((win: any) => {
      const annotation = win.Htx.annotationStore.selected;
      const region = annotation.regions[0];

      expect(region.locked).to.equal(false);
    });
  });

  it("should not hide unfinished polygon via hotkey", () => {
    LabelStudio.params().config(polygonConfig).data(imageData).withResult(unfinishedPolygonResult).init();

    LabelStudio.waitForObjectsReady();
    ImageView.waitForImage();
    Sidebar.hasRegions(1);

    cy.log("Select the unfinished polygon");
    Sidebar.regions.eq(0).click();

    cy.log("Verify unfinished polygon is selected and visible");
    cy.window().then((win: any) => {
      const annotation = win.Htx.annotationStore.selected;
      const region = annotation.regions[0];

      expect(region.selected).to.equal(true);
      expect(region.closed).to.equal(false);
      expect(region.incomplete).to.equal(true);
      expect(region.hidden).to.equal(false);
    });

    cy.log("Press hide hotkey (Ctrl+H)");
    cy.get("body").type("{ctrl}h");

    cy.log("Unfinished polygon should remain visible");
    cy.window().then((win: any) => {
      const annotation = win.Htx.annotationStore.selected;
      const region = annotation.regions[0];

      expect(region.hidden).to.equal(false);
    });
  });
});
