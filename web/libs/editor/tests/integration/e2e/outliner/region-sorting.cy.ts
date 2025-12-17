import { LabelStudio, Sidebar } from "@humansignal/frontend-test/helpers/LSF";
import { FF_DEV_3873 } from "../../../../src/utils/feature-flags";
import { simpleRegionsConfig, simpleRegionsData, simpleRegionsResult } from "../../data/outliner/hide-all";

describe("Outliner - Region sorting by meta", () => {
  beforeEach(() => {
    LabelStudio.addFeatureFlagsOnPageLoad({
      [FF_DEV_3873]: true,
    });
  });

  const initWithSimpleRegions = () => {
    LabelStudio.params().config(simpleRegionsConfig).data(simpleRegionsData).withResult(simpleRegionsResult).init();

    LabelStudio.waitForObjectsReady();
  };

  it("orders regions by area", () => {
    initWithSimpleRegions();

    Sidebar.setOrderBy("Order by Area");

    Sidebar.findByRegionIndex(1).should("contain", "Label 2");
    Sidebar.findByRegionIndex(2).should("contain", "Label 3");
    Sidebar.findByRegionIndex(3).should("contain", "Label 1");

    cy.window().then((win: any) => {
      expect(win.localStorage.getItem("outliner:sort")).to.equal("area");
    });
  });

  it("orders regions by width", () => {
    initWithSimpleRegions();

    Sidebar.setOrderBy("Order by Width");

    Sidebar.findByRegionIndex(1).should("contain", "Label 1");
    Sidebar.findByRegionIndex(2).should("contain", "Label 3");
    Sidebar.findByRegionIndex(3).should("contain", "Label 2");

    cy.window().then((win: any) => {
      expect(win.localStorage.getItem("outliner:sort")).to.equal("bbox_width");
    });
  });

  it("orders regions by height", () => {
    initWithSimpleRegions();

    Sidebar.setOrderBy("Order by Height");

    Sidebar.findByRegionIndex(1).should("contain", "Label 3");
    Sidebar.findByRegionIndex(2).should("contain", "Label 1");
    Sidebar.findByRegionIndex(3).should("contain", "Label 2");

    cy.window().then((win: any) => {
      expect(win.localStorage.getItem("outliner:sort")).to.equal("bbox_height");
    });
  });
});
