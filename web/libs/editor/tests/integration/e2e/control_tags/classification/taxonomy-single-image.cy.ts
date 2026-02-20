import { LabelStudio, ImageView, Taxonomy } from "@humansignal/frontend-test/helpers/LSF";
import { simpleImageTaxonomyConfig, simpleImageData, perTagTaxonomyResult } from "../../../data/control_tags/per-item";
import { commonBeforeEach } from "./common";

beforeEach(commonBeforeEach);

/* <Taxonomy /> */
describe("Classification - single image - Taxonomy", () => {
  it("should create result without item_index", () => {
    LabelStudio.params().config(simpleImageTaxonomyConfig).data(simpleImageData).withResult([]).init();

    ImageView.waitForImage();

    Taxonomy.open();
    Taxonomy.clickItem("Choice 2");
    Taxonomy.close();

    // Wait for selection to be reflected in the UI before asserting on serialized result
    Taxonomy.hasSelected("Choice 2");

    LabelStudio.serialize().then((result) => {
      expect(result).to.have.length(1);
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
