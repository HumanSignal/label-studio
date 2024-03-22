export const Modals = {
  get warning() {
    return cy.get(".ant-modal.ant-modal-confirm-warning");
  },
  hasWarning(text) {
    this.warning.should("be.visible");
    this.warning.contains("Warning").should("be.visible");
    this.warning.contains(text).should("be.visible");
    this.warning.contains("OK").should("be.visible");
  },
  hasNoWarnings() {
    this.warning.should("not.exist");
  },
};
