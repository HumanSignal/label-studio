export const Relations = {
  get relations() {
    return cy.get(".lsf-relations");
  },
  get relationOrderList() {
    const relationList = [];

    cy.get(".lsf-relations__item").each(($el) => {
      const from = $el.find(".lsf-detailed-region .lsf-labels-list span").first().text().trim();
      const to = $el.find(".lsf-detailed-region .lsf-labels-list span").last().text().trim();
      relationList.push({ from, to });
    });

    return cy.wrap(relationList);
  },
  get hideAllRelationsButton() {
    return cy.get('[aria-label="Hide all"]');
  },
  get showAllRelationsButton() {
    return cy.get('[aria-label="Show all"]');
  },
  get ascendingOrderRelationButton() {
    return cy.get('[aria-label="Order by oldest"]');
  },
  get descendingOrderRelationButton() {
    return cy.get('[aria-label="Order by newest"]');
  },
  get hiddenRelations() {
    return this.relations.should("be.visible").get(".lsf-relations__item_hidden .lsf-relations__content");
  },
  hasRelations(count: number) {
    cy.get(".lsf-details__section-head").should("have.text", `Relations (${count})`);
  },
  hasRelation(from: string, to: string) {
    cy.get(".lsf-relations").contains(from).closest(".lsf-relations").contains(to);
  },
  hasHiddenRelations(count: number) {
    this.hiddenRelations.should("have.length", count);
  },
  toggleCreation() {
    cy.get(".lsf-region-actions__group_align_left > :nth-child(1) > .lsf-button__icon").click();
  },
  toggleCreationWithHotkey() {
    // hotkey is alt + r
    cy.get("body").type("{alt}r");
  },
  toggleRelationVisibility(idx) {
    cy.get(".lsf-relations__item")
      .eq(idx)
      .trigger("mouseover")
      .find(".lsf-relations__actions")
      .find('button[aria-label="Hide Relation"]')
      .click({ force: true });
  },
};
