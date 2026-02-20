import { Labels, LabelStudio, Relations, Sidebar } from "@humansignal/frontend-test/helpers/LSF";
import {
  labelStudio_settings,
  panelState,
  resultWithRelations,
  simpleConfig,
  simpleData,
} from "../../data/outliner/region-index";
import { RichText } from "@humansignal/frontend-test/helpers/LSF/RichText";
import { Hotkeys } from "@humansignal/frontend-test/helpers/LSF/Hotkeys";

describe("Region Index", () => {
  it("should be visible at the outliner", () => {
    LabelStudio.params().config(simpleConfig).data(simpleData).withResult(resultWithRelations).init();
    LabelStudio.waitForObjectsReady();

    Sidebar.findByRegionIndex(1).should("contain", "Label 1");
    Sidebar.findByRegionIndex(3).should("contain", "Label 3");
  });

  it("should depends on the order of the regions", () => {
    LabelStudio.params().config(simpleConfig).data(simpleData).withResult(resultWithRelations).init();
    LabelStudio.waitForObjectsReady();

    Sidebar.toggleOrderByTime();
    Sidebar.findByRegionIndex(1).should("contain", "Label 3");
    Sidebar.findByRegionIndex(3).should("contain", "Label 1");
  });

  it("should affect the labels on region on changing order", () => {
    LabelStudio.params()
      .config(simpleConfig)
      .data(simpleData)
      .withResult(resultWithRelations)
      .withLocalStorageItem("labelStudio:settings", labelStudio_settings)
      .init();

    LabelStudio.waitForObjectsReady();

    Sidebar.toggleOrderByTime();

    RichText.hasRegionWithLabel("1:Label 3");
    RichText.hasRegionWithLabel("2:Label 2");
    RichText.hasRegionWithLabel("3:Label 1");
  });

  it("should be displayed in region's label", () => {
    LabelStudio.params()
      .config(simpleConfig)
      .data(simpleData)
      .withResult(resultWithRelations)
      .localStorageItems({
        "labelStudio:settings": labelStudio_settings,
      })
      .init();

    RichText.hasRegionWithLabel("1:Label 1");
    RichText.hasRegionWithLabel("2:Label 2");
    RichText.hasRegionWithLabel("3:Label 3");
  });

  it("should not depend on the visibility of the region panel", () => {
    LabelStudio.params()
      .config(simpleConfig)
      .data(simpleData)
      .withResult(resultWithRelations)
      .localStorageItems({
        panelState,
        "labelStudio:settings": labelStudio_settings,
      })
      .init();
    LabelStudio.waitForObjectsReady();

    RichText.hasRegionWithLabel("1:Label 1");
    RichText.hasRegionWithLabel("2:Label 2");
    RichText.hasRegionWithLabel("3:Label 3");
  });

  it("should be displayed on relations panel", () => {
    LabelStudio.params()
      .config(simpleConfig)
      .data(simpleData)
      .withResult(resultWithRelations)
      .localStorageItems({
        panelState,
        "labelStudio:settings": labelStudio_settings,
      })
      .init();
    LabelStudio.waitForObjectsReady();

    Relations.relationRegions.eq(0).contains(".lsf-detailed-region__index", "1").should("exist");
    Relations.relationRegions.eq(1).contains(".lsf-detailed-region__index", "3").should("exist");
  });

  it("should be consistent on region delete / create", () => {
    LabelStudio.params()
      .config(simpleConfig)
      .data(simpleData)
      .withResult(resultWithRelations)
      .localStorageItems({
        panelState,
        "labelStudio:settings": labelStudio_settings,
      })
      .init();
    LabelStudio.waitForObjectsReady();

    RichText.hasRegionWithLabel("1:Label 1");
    RichText.hasRegionWithLabel("2:Label 2");
    RichText.hasRegionWithLabel("3:Label 3");

    RichText.findRegionWithLabel("2:Label 2").trigger("click");
    Hotkeys.deleteRegion();
    RichText.hasRegionWithLabel("1:Label 1");
    RichText.hasRegionWithLabel("2:Label 3");

    Labels.select("Label 2");
    RichText.selectText("is");
    RichText.hasRegionWithLabel("3:Label 2");
  });

  it("should be consistent on region delete / create with full list affected by change", () => {
    LabelStudio.params()
      .config(simpleConfig)
      .data(simpleData)
      .withResult(resultWithRelations)
      .localStorageItems({
        panelState,
        "labelStudio:settings": labelStudio_settings,
        "outliner:sort": "date",
        "outliner:sort-direction": "desc",
      })
      .init();
    LabelStudio.waitForObjectsReady();

    RichText.hasRegionWithLabel("3:Label 1");
    RichText.hasRegionWithLabel("2:Label 2");
    RichText.hasRegionWithLabel("1:Label 3");

    RichText.findRegionWithLabel("2:Label 2").trigger("click");
    Hotkeys.deleteRegion();
    RichText.hasRegionWithLabel("2:Label 1");
    RichText.hasRegionWithLabel("1:Label 3");

    Labels.select("Label 2");
    RichText.selectText("is");

    RichText.hasRegionWithLabel("3:Label 1");
    RichText.hasRegionWithLabel("2:Label 3");
    RichText.hasRegionWithLabel("1:Label 2");
  });

  it("should work with history traveling", () => {
    LabelStudio.params()
      .config(simpleConfig)
      .data(simpleData)
      .withResult(resultWithRelations)
      .localStorageItems({
        "labelStudio:settings": labelStudio_settings,
      })
      .init();
    LabelStudio.waitForObjectsReady();

    RichText.findRegionWithLabel("2:Label 2").trigger("click");
    Hotkeys.deleteRegion();

    cy.wait(1);
    Hotkeys.undo();
    cy.wait(1);
    Hotkeys.redo();
  });
});
