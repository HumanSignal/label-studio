import { LabelStudio, ImageView, Taxonomy, ToolBar, Modals, Sidebar } from "@humansignal/frontend-test/helpers/LSF";
import {
  simpleImageTaxonomyConfig,
  simpleImageData,
  perTagTaxonomyResult,
  perTagMIGTaxonomyConfig,
  simpleMIGData,
  requiredPerTagMIGTaxonomyConfig,
  TAXONOMY_REQUIRED_WARNING,
  perRegionMIGTaxonomyConfig,
  perRegionRegionsResult,
  perRegionTaxonomyResult,
  requiredPerRegionMIGTaxonomyConfig,
  perItemMIGTaxonomyConfig,
  perItemTaxonomyResult,
  requiredPerItemMIGTaxonomyConfig,
} from "../../../data/control_tags/per-item";
import { commonBeforeEach } from "./common";

beforeEach(commonBeforeEach);

/* <Taxonomy /> */
describe("Classification - single image - Taxonomy", () => {
  it("should create result without item_index", () => {
    LabelStudio.params().config(simpleImageTaxonomyConfig).data(simpleImageData).withResult([]).init();

    ImageView.waitForImage();

    Taxonomy.open();
    Taxonomy.findItem("Choice 2").click();
    Taxonomy.close();

    LabelStudio.serialize().then((result) => {
      expect(result[0]).not.to.haveOwnProperty("item_index");
    });
  });

  it("should load perTag result correctly", () => {
    LabelStudio.params()
      .config(simpleImageTaxonomyConfig)
      .data(simpleImageData)
      .withResult(perTagTaxonomyResult)
      .init();

    ImageView.waitForImage();

    Taxonomy.hasSelected("Choice 1");

    LabelStudio.serialize().then((result) => {
      expect(result[0]).to.deep.include(perTagTaxonomyResult[0]);
      expect(result[0]).not.to.haveOwnProperty("item_index");
    });
  });
});
describe("Classification - MIG perTag - Taxonomy", () => {
  it("should not have item_index in result", () => {
    LabelStudio.params().config(perTagMIGTaxonomyConfig).data(simpleMIGData).withResult([]).init();

    ImageView.waitForImage();

    Taxonomy.open();
    Taxonomy.findItem("Choice 1").click();
    Taxonomy.close();

    LabelStudio.serialize().then((result) => {
      expect(result[0]).not.to.haveOwnProperty("item_index");
    });
  });

  it("should load perTag result correctly", () => {
    LabelStudio.params().config(perTagMIGTaxonomyConfig).data(simpleMIGData).withResult(perTagTaxonomyResult).init();

    ImageView.waitForImage();

    Taxonomy.hasSelected("Choice 1");

    LabelStudio.serialize().then((result) => {
      expect(result[0]).to.deep.include(perTagTaxonomyResult[0]);
      expect(result[0]).not.to.haveOwnProperty("item_index");
    });
  });

  it("should keep value between items", () => {
    LabelStudio.params().config(perTagMIGTaxonomyConfig).data(simpleMIGData).withResult([]).init();

    ImageView.waitForImage();

    Taxonomy.open();
    Taxonomy.findItem("Choice 1").click();
    Taxonomy.close();
    Taxonomy.hasSelected("Choice 1");

    ImageView.paginationNextBtn.click();

    Taxonomy.hasSelected("Choice 1");
  });

  it("should require result", () => {
    LabelStudio.params().config(requiredPerTagMIGTaxonomyConfig).data(simpleMIGData).withResult([]).init();

    ImageView.waitForImage();

    ToolBar.submitBtn.click();
    Modals.hasWarning(TAXONOMY_REQUIRED_WARNING);
  });

  it("should not require result if there is one", () => {
    LabelStudio.params().config(requiredPerTagMIGTaxonomyConfig).data(simpleMIGData).withResult([]).init();

    ImageView.waitForImage();

    Taxonomy.open();
    Taxonomy.findItem("Choice 1").click();
    Taxonomy.close();

    ToolBar.submitBtn.click();
    Modals.hasNoWarnings();
  });
});
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
    Taxonomy.findItem("Choice 1").click();
    Taxonomy.close();

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

    ToolBar.submitBtn.click();
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
    Taxonomy.findItem("Choice 1").click();

    ToolBar.submitBtn.click();
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
    Taxonomy.findItem("Choice 1").click();

    Sidebar.findRegionByIndex(1).click();
    ImageView.waitForImage();
    Taxonomy.open();
    Taxonomy.findItem("Choice 2").click();

    ToolBar.submitBtn.click();
    Modals.hasNoWarnings();
  });
});
describe("Control Tags - MIG perItem - Taxonomy", () => {
  it("should create result with item_index", () => {
    LabelStudio.params().config(perItemMIGTaxonomyConfig).data(simpleMIGData).withResult([]).init();

    ImageView.waitForImage();

    Taxonomy.open();
    Taxonomy.findItem("Choice 1").click();

    LabelStudio.serialize().then((result) => {
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
    Taxonomy.findItem("Choice 1").click();

    LabelStudio.serialize().then((result) => {
      expect(result[0]).to.have.property("item_index", 1);
    });
  });

  it("should be able to create more that one result", () => {
    LabelStudio.params().config(perItemMIGTaxonomyConfig).data(simpleMIGData).withResult([]).init();

    ImageView.waitForImage();

    Taxonomy.open();
    Taxonomy.findItem("Choice 1").click();

    ImageView.paginationNextBtn.click();
    ImageView.waitForImage();
    Taxonomy.open();
    Taxonomy.findItem("Choice 2").click();

    ImageView.paginationNextBtn.click();
    ImageView.waitForImage();
    Taxonomy.open();
    Taxonomy.findItem("Choice 3").click();

    LabelStudio.serialize().then((result) => {
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

    ToolBar.submitBtn.click();
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
    Taxonomy.findItem("Choice 1").click();

    ToolBar.submitBtn.click();
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
    Taxonomy.findItem("Choice 1").click();
    ImageView.paginationNextBtn.click();
    ImageView.waitForImage();

    Taxonomy.open();
    Taxonomy.findItem("Choice 2").click();
    ImageView.paginationNextBtn.click();
    ImageView.waitForImage();

    Taxonomy.open();
    Taxonomy.findItem("Choice 3").click();
    ImageView.paginationNextBtn.click();
    ImageView.waitForImage();

    Taxonomy.open();
    Taxonomy.findItem("Choice 2").click();

    ToolBar.submitBtn.click();
    Modals.hasNoWarnings();
  });
});
