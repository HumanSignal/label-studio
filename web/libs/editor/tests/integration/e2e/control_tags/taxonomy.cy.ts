import { LabelStudio, Taxonomy, Tooltip } from "@humansignal/frontend-test/helpers/LSF/index";
import {
  dynamicTaxonomyConfig,
  taxonomyDataWithSimilarAliases,
  dataWithPrediction,
  simpleData,
  taxonomyConfig,
  taxonomyConfigWithMaxUsages,
  taxonomyResultWithSimilarAliases,
  taxonomyResultWithAlias,
} from "../../data/control_tags/taxonomy";

describe("Control Tags - Taxonomy", () => {
  const expandTreeNode = (title: string) => {
    cy.contains(".htx-taxonomy-dropdown .ant-select-tree-title", title)
      .closest(".ant-select-tree-treenode")
      .find(".ant-select-tree-switcher")
      .first()
      .click({ force: true });
  };

  it("should show hint for <Choice />", () => {
    LabelStudio.params().config(taxonomyConfig).data(simpleData).withResult([]).init();

    Taxonomy.open();
    Taxonomy.findItem("Choice 2").trigger("mouseover");
    Tooltip.hasText("A hint for Choice 2");
  });

  it("should show error message if there are more choices selected than maxUsages is set", () => {
    LabelStudio.init({
      config: taxonomyConfigWithMaxUsages,
      task: dataWithPrediction,
    });

    cy.contains("button", "Update").click();

    cy.contains(
      "The number of options selected (2) exceed the maximum allowed (1). To proceed, first unselect excess options for: • Taxonomy (taxonomy)",
    ).should("exist");
  });

  it("should not show error message if choices selected is equal than maxUsages", () => {
    LabelStudio.params()
      .config(taxonomyConfigWithMaxUsages)
      .data(simpleData)
      .withResult([
        {
          id: "n2ldmNpSQI",
          type: "taxonomy",
          value: {
            taxonomy: [["Bacteria"]],
          },
          origin: "manual",
          to_name: "text",
          from_name: "taxonomy",
        },
      ])
      .init();

    cy.contains("button", "Update").click();

    cy.contains(
      "The number of options selected (2) exceed the maximum allowed (1). To proceed, first unselect excess options for: • Taxonomy (taxonomy)",
    ).should("not.exist");
  });

  it("serializes nested dynamic taxonomy with similar aliases deterministically", () => {
    LabelStudio.params().config(dynamicTaxonomyConfig).data(taxonomyDataWithSimilarAliases).withResult([]).init();

    Taxonomy.open();
    expandTreeNode("Book 1");
    expandTreeNode("Chapter 2");
    Taxonomy.clickItem("Section 2.1");
    Taxonomy.close();

    LabelStudio.serialize().then((result) => {
      expect(result).to.have.length(1);
      expect(result[0].from_name).to.equal(taxonomyResultWithSimilarAliases.from_name);
      expect(result[0].to_name).to.equal(taxonomyResultWithSimilarAliases.to_name);
      expect(result[0].value.taxonomy).to.deep.equal(taxonomyResultWithSimilarAliases.value.taxonomy);
    });
  });

  it("serializes taxonomy alias values for static choices", () => {
    LabelStudio.params().config(taxonomyConfig).data(simpleData).withResult([]).init();

    Taxonomy.open();
    Taxonomy.clickItem("Choice 2");
    Taxonomy.close();

    LabelStudio.serialize().then((result) => {
      expect(result).to.have.length(1);
      expect(result[0].value.taxonomy).to.deep.equal(taxonomyResultWithAlias.value.taxonomy);
    });
  });
});
