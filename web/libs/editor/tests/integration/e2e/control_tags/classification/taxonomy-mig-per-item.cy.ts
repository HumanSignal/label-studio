import { LabelStudio, ImageView, Taxonomy, ToolBar, Modals } from "@humansignal/frontend-test/helpers/LSF";
import {
  simpleMIGData,
  TAXONOMY_REQUIRED_WARNING,
  perRegionRegionsResult,
  perItemMIGTaxonomyConfig,
  perItemTaxonomyResult,
  requiredPerItemMIGTaxonomyConfig,
} from "../../../data/control_tags/per-item";
import { commonBeforeEach } from "./common";

beforeEach(commonBeforeEach);

/* <Taxonomy /> */
describe("Control Tags - MIG perItem - Taxonomy", () => {
  it("should create result with item_index", () => {
    LabelStudio.params().config(perItemMIGTaxonomyConfig).data(simpleMIGData).withResult([]).init();

    ImageView.waitForImage();

    Taxonomy.open();
    Taxonomy.clickItem("Choice 1");

    Taxonomy.hasSelected("Choice 1");
    LabelStudio.serialize().then((result) => {
      expect(result).to.have.length.at.least(1);
      expect(result[0]).to.have.property("item_index", 0);
    });
  });

  it("should load perItem result correctly", () => {
    LabelStudio.params().config(perItemMIGTaxonomyConfig).data(simpleMIGData).withResult(perItemTaxonomyResult).init();

    ImageView.waitForImage();

    Taxonomy.hasSelected("Choice 1");
    ImageView.paginationNextBtn.click();
    ImageView.waitForImage();
    Taxonomy.hasSelected("Choice 2");
    ImageView.paginationNextBtn.click();
    ImageView.waitForImage();
    Taxonomy.hasSelected("Choice 3");

    LabelStudio.serialize().then((result) => {
      expect(result[0]).to.deep.include(perItemTaxonomyResult[0]);
      expect(result[1]).to.deep.include(perItemTaxonomyResult[1]);
      expect(result[2]).to.deep.include(perItemTaxonomyResult[2]);
    });
  });

  it("should be able to create result for second item", () => {
    LabelStudio.params().config(perItemMIGTaxonomyConfig).data(simpleMIGData).withResult([]).init();

    ImageView.waitForImage();

    ImageView.paginationNextBtn.click();
    ImageView.waitForImage();

    Taxonomy.open();
    ImageView.waitForImage();
    // TODO: Fix this flakey test
    // Taxonomy.findItem("Choice 2").as("choice2");
    // cy.wait(50);
    // cy.get("@choice2").click();

    // LabelStudio.serialize().then((result) => {
    //   expect(result[0]).to.have.property("item_index", 1);
    // });
  });

  it("should be able to create more that one result", () => {
    LabelStudio.params().config(perItemMIGTaxonomyConfig).data(simpleMIGData).withResult([]).init();

    ImageView.waitForImage();

    Taxonomy.open();
    Taxonomy.clickItem("Choice 1");
    Taxonomy.hasSelected("Choice 1");

    ImageView.paginationNextBtn.click();
    ImageView.waitForImage();
    Taxonomy.open();
    Taxonomy.clickItem("Choice 2");
    Taxonomy.hasSelected("Choice 2");

    ImageView.paginationNextBtn.click();
    ImageView.waitForImage();
    Taxonomy.open();
    Taxonomy.clickItem("Choice 3");
    Taxonomy.hasSelected("Choice 3");

    LabelStudio.serialize().then((result) => {
      expect(result).to.have.length.at.least(3);
      expect(result[0]).to.include({ item_index: 0 });
      expect(result[0].value.taxonomy).to.be.deep.eq([["Choice 1"]]);

      expect(result[1]).to.include({ item_index: 1 });
      expect(result[1].value.taxonomy).to.be.deep.eq([["Choice 2"]]);

      expect(result[2]).to.include({ item_index: 2 });
      expect(result[2].value.taxonomy).to.be.deep.eq([["Choice 3"]]);
    });
  });

  it("should require result", () => {
    LabelStudio.params()
      .config(requiredPerItemMIGTaxonomyConfig)
      .data(simpleMIGData)
      .withResult(perRegionRegionsResult)
      .init();

    ImageView.waitForImage();

    ToolBar.updateBtn.click();
    Modals.hasWarning(TAXONOMY_REQUIRED_WARNING);
  });

  it("should require result for other region too", () => {
    LabelStudio.params()
      .config(requiredPerItemMIGTaxonomyConfig)
      .data(simpleMIGData)
      .withResult(perRegionRegionsResult)
      .init();

    ImageView.waitForImage();

    Taxonomy.open();
    Taxonomy.clickItem("Choice 1");

    ToolBar.updateBtn.click();
    Modals.hasWarning(TAXONOMY_REQUIRED_WARNING);
  });

  it("should not require result if there are all of them", () => {
    LabelStudio.params()
      .config(requiredPerItemMIGTaxonomyConfig)
      .data(simpleMIGData)
      .withResult(perRegionRegionsResult)
      .init();

    ImageView.waitForImage();

    Taxonomy.open();
    Taxonomy.clickItem("Choice 1");
    Taxonomy.hasSelected("Choice 1");
    ImageView.paginationNextBtn.click();
    ImageView.waitForImage();

    Taxonomy.open();
    Taxonomy.clickItem("Choice 2");
    Taxonomy.hasSelected("Choice 2");
    ImageView.paginationNextBtn.click();
    ImageView.waitForImage();

    Taxonomy.open();
    Taxonomy.clickItem("Choice 3");
    Taxonomy.hasSelected("Choice 3");
    ImageView.paginationNextBtn.click();
    ImageView.waitForImage();

    Taxonomy.open();
    Taxonomy.clickItem("Choice 2");
    Taxonomy.hasSelected("Choice 2");

    ToolBar.updateBtn.click();
    Modals.hasNoWarnings();
  });
});
