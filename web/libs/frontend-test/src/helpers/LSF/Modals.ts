const WARNING = '[data-testid="editor-info-modal"]';

export const Modals = {
  get warning() {
    return cy.get(WARNING);
  },
  hasWarning(text) {
    // One retried assertion on a fresh query: the dialog re-renders while it opens.
    cy.get(WARNING)
      .should("be.visible")
      .and("contain.text", "Warning")
      .and("contain.text", text)
      .and("contain.text", "OK");
  },
  closeWarning() {
    cy.get('[data-testid="editor-info-modal-ok"]').click();
  },
  hasNoWarnings() {
    cy.get(WARNING).should("not.exist");
  },
};
