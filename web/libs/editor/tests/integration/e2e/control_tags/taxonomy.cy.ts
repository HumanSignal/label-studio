import { LabelStudio, Taxonomy, Tooltip, useTaxonomy } from "@humansignal/frontend-test/helpers/LSF/index";
import {
  dynamicTaxonomyConfig,
  taxonomyDataWithSimilarAliases,
  dataWithPrediction,
  simpleData,
  legacyTaxonomyConfig,
  legacyDynamicTaxonomyConfig,
  legacyLargeTaxonomyData,
  legacyTaxonomyResult,
  taxonomyConfig,
  taxonomyConfigWithMaxUsages,
  taxonomyResultWithSimilarAliases,
  taxonomyResultWithAlias,
} from "../../data/control_tags/taxonomy";

describe("Control Tags - Taxonomy", () => {
  const legacyItemLabel = (title: string) =>
    cy
      .get('[class^="taxonomy__item"] label')
      .filter((_, element) => element.textContent?.trim() === title)
      .first();

  const expandTreeNode = (title: string) => {
    cy.contains(".htx-taxonomy-dropdown .ant-select-tree-title", title)
      .closest(".ant-select-tree-treenode")
      .find(".ant-select-tree-switcher")
      .first()
      .click({ force: true });
  };

  const expandLegacyTreeNode = (title: string) => {
    legacyItemLabel(title)
      .closest('[class^="taxonomy__item"]')
      .find('[class^="taxonomy__grouping"]')
      .click({ force: true });
  };

  const selectLegacyTreeNode = (title: string) => {
    legacyItemLabel(title).closest('[class^="taxonomy__item"]').find("input.item").check({ force: true });
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

  it("deterministically toggles static taxonomy selection on and off", () => {
    LabelStudio.params().config(taxonomyConfig).data(simpleData).withResult([]).init();

    Taxonomy.open();
    Taxonomy.clickItem("Choice 2");
    Taxonomy.close();

    LabelStudio.serialize().then((result) => {
      expect(result).to.have.length(1);
      expect(result[0].value.taxonomy).to.deep.equal([["C2"]]);
    });

    Taxonomy.open();
    Taxonomy.clickItem("Choice 2");
    Taxonomy.close();

    LabelStudio.serialize().then((result) => {
      expect(result).to.have.length(0);
    });
  });

  it("supports legacy taxonomy nested selection and search deterministically", () => {
    const legacyTaxonomy = useTaxonomy("&:eq(0)", true);

    LabelStudio.params().config(legacyTaxonomyConfig).data(simpleData).withResult([]).init();

    legacyTaxonomy.open();
    expandLegacyTreeNode("Book 1");
    expandLegacyTreeNode("Chapter 2");
    selectLegacyTreeNode("Section 2.1");

    cy.get('[name="taxonomy__search"]').type("Section 2.2");
    selectLegacyTreeNode("Section 2.2");
    legacyTaxonomy.close();

    LabelStudio.serialize().then((result) => {
      expect(result).to.have.length(1);
      expect(result[0].from_name).to.equal(legacyTaxonomyResult.from_name);
      expect(result[0].to_name).to.equal(legacyTaxonomyResult.to_name);
      expect(result[0].type).to.equal(legacyTaxonomyResult.type);
      expect(result[0].value.taxonomy).to.deep.equal(legacyTaxonomyResult.value.taxonomy);
    });
  });

  it("supports deterministic keyboard navigation in legacy taxonomy", () => {
    const legacyTaxonomy = useTaxonomy("&:eq(0)", true);

    LabelStudio.params().config(legacyTaxonomyConfig).data(simpleData).withResult([]).init();
    legacyTaxonomy.open();

    cy.get("body").trigger("keydown", { key: "ArrowDown", shiftKey: true });
    cy.focused().should("have.attr", "name", "taxonomy__search");

    cy.get('[name="taxonomy__search"]').type("Section 2.1");
    cy.get('[class^="taxonomy__item"] input.item:not([disabled])').first().focus().should("have.class", "item");
    cy.get("body").trigger("keydown", { key: "ArrowRight" });
    cy.focused().should("have.attr", "name", "taxonomy__search");

    selectLegacyTreeNode("Section 2.1");
    cy.get("body").trigger("keydown", { key: "Escape" });
    cy.get('[class^="taxonomy__dropdown"]').should("not.be.visible");

    LabelStudio.serialize().then((result) => {
      expect(result).to.have.length(1);
      expect(result[0].value.taxonomy).to.deep.equal([["Book 1", "Chapter 2", "Section 2.1"]]);
    });
  });

  it("handles legacy large-tree filtering deterministically", () => {
    const legacyTaxonomy = useTaxonomy("&:eq(0)", true);

    LabelStudio.params().config(legacyDynamicTaxonomyConfig).data(legacyLargeTaxonomyData).withResult([]).init();
    legacyTaxonomy.open();

    cy.get('[name="taxonomy__search"]').type("no-such-item");
    cy.get('[class^="taxonomy__item"]').should("not.exist");

    cy.get('[name="taxonomy__search"]').clear().type("Item 79");
    selectLegacyTreeNode("Item 79");
    legacyTaxonomy.close();

    LabelStudio.serialize().then((result) => {
      expect(result).to.have.length(1);
      expect(result[0].value.taxonomy).to.deep.equal([["Item 79"]]);
    });
  });

  it("supports adding, nesting, and deleting legacy custom taxonomy items", () => {
    const legacyTaxonomy = useTaxonomy("&:eq(0)", true);

    LabelStudio.params()
      .config(`
        <View>
          <Text name="text" value="$text"/>
          <Taxonomy name="taxonomy" toName="text" legacy="true">
            <Choice value="a">
              <Choice value="ab"/>
              <Choice value="ac"/>
            </Choice>
            <Choice value="b">
              <Choice value="ba"/>
              <Choice value="bc">
                <Choice value="bca"/>
                <Choice value="bcb"/>
              </Choice>
            </Choice>
          </Taxonomy>
        </View>
      `)
      .data({ text: "Simple text" })
      .withResult([])
      .init();

    legacyTaxonomy.open();
    cy.contains('[class^="taxonomy__add"] button', "Add").click();
    cy.get('[name="taxonomy__add"]').type("c{enter}");
    cy.contains('[class^="taxonomy__item"] label', "c").should("exist");

    expandLegacyTreeNode("b");
    cy.contains('[class^="taxonomy__item"] label', "ba")
      .closest('[class^="taxonomy__item"]')
      .within(() => {
        cy.contains("div", "...").click({ force: true });
      });
    cy.contains(".ant-dropdown-menu-item", "Add Inside").click();
    cy.get('[name="taxonomy__add"]').type("baa{enter}");
    cy.contains('[class^="taxonomy__item"] label', "baa").should("exist");

    selectLegacyTreeNode("a");
    selectLegacyTreeNode("c");
    selectLegacyTreeNode("baa");

    LabelStudio.serialize().then((result) => {
      expect(result).to.have.length(1);
      expect(result[0].from_name).to.equal("taxonomy");
      expect(result[0].value.taxonomy).to.have.deep.members([["a"], ["b", "ba", "baa"], ["c"]]);
    });

    legacyItemLabel("c")
      .closest('[class^="taxonomy__item"]')
      .within(() => {
        cy.contains("div", "...").click({ force: true });
      });
    cy.contains(".ant-dropdown-menu-item", "Delete").click();
    cy.get('[class^="taxonomy__item"] label')
      .filter((_, element) => element.textContent?.trim() === "c")
      .should("not.exist");
  });
});
