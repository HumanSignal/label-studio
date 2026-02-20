import { LabelStudio, ImageView, Taxonomy, ToolBar, Modals, Sidebar } from "@humansignal/frontend-test/helpers/LSF";
import {
  simpleMIGData,
  TAXONOMY_REQUIRED_WARNING,
  perRegionMIGTaxonomyConfig,
  perRegionRegionsResult,
  perRegionTaxonomyResult,
  requiredPerRegionMIGTaxonomyConfig,
} from "../../../data/control_tags/per-item";
import { commonBeforeEach } from "./common";

beforeEach(commonBeforeEach);

/* <Taxonomy /> */
describe("Control Tags - MIG perRegion - Taxonomy", () => {
  it("should create result with item_index", () => {
    LabelStudio.params()
      .config(perRegionMIGTaxonomyConfig)
      .data(simpleMIGData)
      .withResult(perRegionRegionsResult)
      .init();

    ImageView.waitForImage();
    Sidebar.hasRegions(2);

    Sidebar.findRegionByIndex(0).click();

    Taxonomy.open();
    Taxonomy.clickItem("Choice 1");
    Taxonomy.close();

    // Wait for selection to be reflected in the UI before asserting on serialized result
    Taxonomy.hasSelected("Choice 1");

    LabelStudio.serialize().then((result) => {
      expect(result.length).to.be.eq(3);
      expect(result[1]).to.include({
        type: "taxonomy",
        item_index: 0,
      });
    });
  });

  it("should load result correctly", () => {
    LabelStudio.params()
      .config(perRegionMIGTaxonomyConfig)
      .data(simpleMIGData)
      .withResult(perRegionTaxonomyResult)
      .init();

    ImageView.waitForImage();
    Sidebar.hasRegions(2);

    Sidebar.findRegionByIndex(0).click();

    Taxonomy.hasSelected("Choice 2");

    LabelStudio.serialize().then((result) => {
      const { value, ...expectedResult } = perRegionTaxonomyResult[1];

      expect(result.length).to.be.eq(3);
      expect(result[1]).to.deep.include(expectedResult);
      expect(result[1].value.taxonomy).to.be.deep.eq(value.taxonomy);
    });
  });

  it("should require result", () => {
    LabelStudio.params()
      .config(requiredPerRegionMIGTaxonomyConfig)
      .data(simpleMIGData)
      .withResult(perRegionRegionsResult)
      .init();

    ImageView.waitForImage();

    ToolBar.updateBtn.click();
    Modals.hasWarning(TAXONOMY_REQUIRED_WARNING);
  });

  it("should require result for other region too", () => {
    LabelStudio.params()
      .config(requiredPerRegionMIGTaxonomyConfig)
      .data(simpleMIGData)
      .withResult(perRegionRegionsResult)
      .init();

    ImageView.waitForImage();

    Sidebar.findRegionByIndex(0).click();
    Taxonomy.open();
    Taxonomy.clickItem("Choice 1");

    ToolBar.updateBtn.click();
    Modals.hasWarning(TAXONOMY_REQUIRED_WARNING);
  });

  it("should not require result if there are all of them", () => {
    LabelStudio.params()
      .config(requiredPerRegionMIGTaxonomyConfig)
      .data(simpleMIGData)
      .withResult(perRegionRegionsResult)
      .init();

    ImageView.waitForImage();

    Sidebar.findRegionByIndex(0).click();
    Taxonomy.open();
    Taxonomy.clickItem("Choice 1");
    Taxonomy.hasSelected("Choice 1");

    Sidebar.findRegionByIndex(1).click();
    ImageView.waitForImage();
    Taxonomy.open();
    Taxonomy.clickItem("Choice 2");
    Taxonomy.hasSelected("Choice 2");

    ToolBar.updateBtn.click();
    Modals.hasNoWarnings();
  });
});
