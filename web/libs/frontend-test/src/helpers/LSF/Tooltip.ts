export const Tooltip = {
  get root() {
    return cy.get(".lsf-tooltip");
  },
  get body() {
    return this.root.find(".lsf-tooltip__body");
  },
  hasText(text) {
    this.body.should("be.visible").contains(text);
  },
};
