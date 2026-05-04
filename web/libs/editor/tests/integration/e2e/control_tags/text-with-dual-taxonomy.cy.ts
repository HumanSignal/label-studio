import { LabelStudio, Sidebar, useTaxonomy } from "@humansignal/frontend-test/helpers/LSF";
import { RichText } from "@humansignal/frontend-test/helpers/LSF/RichText";
import { textWithDualTaxonomyConfig, simpleTextData } from "../../data/control_tags/text-with-dual-taxonomy";

describe("Control Tags - Text with Dual Taxonomy", () => {
  it("should select options from two taxonomies and create text region", () => {
    cy.log("Initialize LabelStudio with text and dual taxonomy configuration");
    LabelStudio.params().config(textWithDualTaxonomyConfig).data(simpleTextData).withResult([]).init();

    LabelStudio.waitForObjectsReady();
    Sidebar.hasNoRegions();

    // Create taxonomy helpers for each taxonomy by index (first taxonomy, second taxonomy)
    const categoryTaxonomy = useTaxonomy("&:eq(0)");
    const sentimentTaxonomy = useTaxonomy("&:eq(1)");

    cy.log("Select first taxonomy option - Organization from category taxonomy");
    categoryTaxonomy.open();
    categoryTaxonomy.findItem("Organization").click();
    categoryTaxonomy.close();

    cy.log("Select second taxonomy option - Positive from sentiment taxonomy");
    sentimentTaxonomy.open();
    sentimentTaxonomy.findItem("Positive").click();
    sentimentTaxonomy.close();

    cy.log("Create text region with selected taxonomies");
    RichText.selectText("Apple Inc.");

    cy.log("Verify region was created");
    Sidebar.hasRegions(1);
    RichText.hasRegionWithText("Apple Inc.");

    cy.log("Verify serialization contains taxonomy results");
    LabelStudio.serialize().then((results: any[]) => {
      expect(results).to.have.length(2);

      // Check category taxonomy result
      const categoryResult = results.find((r: any) => r.from_name === "category");
      expect(categoryResult).to.exist;
      expect(categoryResult.type).to.eq("taxonomy");
      expect(categoryResult.value.taxonomy).to.deep.eq([["Organization"]]);

      // Check sentiment taxonomy result
      const sentimentResult = results.find((r: any) => r.from_name === "sentiment");
      expect(sentimentResult).to.exist;
      expect(sentimentResult.type).to.eq("taxonomy");
      expect(sentimentResult.value.taxonomy).to.deep.eq([["Positive"]]);
    });
  });
});
