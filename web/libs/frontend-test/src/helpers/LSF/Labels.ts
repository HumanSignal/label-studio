export const Labels = {
  get labels() {
    return cy.get(".lsf-labels");
  },
  get label() {
    return this.labels.get(".lsf-label");
  },
  get selectedLabel() {
    return this.label.filter(".lsf-label_selected");
  },
  select(labelName: string) {
    this.label.contains(labelName).click();
    this.selectedLabel.should("be.visible").should("have.length.gt", 0);
  },
  selectWithHotkey(hotkey: string) {
    cy.get("body").type(`${hotkey}`);
    this.selectedLabel.contains(`${hotkey}`).should("be.visible").should("have.length.gt", 0);
  },
};
