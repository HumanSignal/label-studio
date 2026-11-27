import { LabelStudio, ImageView, Taxonomy, ToolBar, Modals } from "@humansignal/frontend-test/helpers/LSF";
import {
  perTagTaxonomyResult,
  perTagMIGTaxonomyConfig,
  simpleMIGData,
  requiredPerTagMIGTaxonomyConfig,
  TAXONOMY_REQUIRED_WARNING,
} from "../../../data/control_tags/per-item";

/* <Taxonomy /> */
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

    ToolBar.updateBtn.click();
    Modals.hasWarning(TAXONOMY_REQUIRED_WARNING);
  });

  it("should not require result if there is one", () => {
    LabelStudio.params().config(requiredPerTagMIGTaxonomyConfig).data(simpleMIGData).withResult([]).init();

    ImageView.waitForImage();

    Taxonomy.open();
    Taxonomy.findItem("Choice 1").click();
    Taxonomy.close();

    ToolBar.updateBtn.click();
    Modals.hasNoWarnings();
  });
});
