export const Sidebar = {
  get outliner() {
    return cy.get(".lsf-outliner");
  },
  get toolBar() {
    return this.outliner.get(".lsf-view-controls");
  },
  get hideAllRegionsButton() {
    return this.toolBar.get('[aria-label="Hide all regions"]');
  },
  get showAllRegionsButton() {
    return this.toolBar.get('[aria-label="Show all regions"]');
  },
  get orderRegionsButton() {
    return this.toolBar.get(".lsf-view-controls__sort button");
  },
  toggleOrderByTime() {
    this.setOrderBy("Order by Time");
  },
  setOrderBy(optionLabel: string) {
    this.orderRegionsButton.click();
    cy.get(".lsf-dropdown").contains(optionLabel).parent().click();
    // Cypress is bad at events emitting, so this is a hack to close the panel that
    // would be closed if the same action is done by a real person
    this.orderRegionsButton.click();
  },
  get regions() {
    return this.outliner
      .should("be.visible")
      .get(".lsf-tree__node:not(.lsf-tree__node_type_footer) .lsf-tree-node-content-wrapper");
  },
  findRegion(selector: string) {
    return this.regions.filter(selector);
  },
  findRegionByIndex(idx: number) {
    return this.findRegion(`:eq(${idx})`);
  },
  findByRegionIndex(idx: number) {
    return this.regions
      .find(".lsf-outliner-item__index")
      .filter(`:contains("${idx}")`)
      .parents(".lsf-tree-node-content-wrapper");
  },
  get hiddenRegions() {
    return this.outliner.should("be.visible").get(".lsf-tree__node_hidden .lsf-tree-node-content-wrapper");
  },
  hasRegions(value: number) {
    this.regions.should("have.length", value);
  },
  hasNoRegions() {
    this.regions.should("not.exist");
  },
  hasSelectedRegions(value: number) {
    this.regions.filter(".lsf-tree-node-selected").should("have.length", value);
  },
  hasSelectedRegion(idx: number) {
    this.findRegionByIndex(idx).should("have.class", "lsf-tree-node-selected");
  },
  hasHiddenRegion(value: number) {
    this.hiddenRegions.should("have.length", value);
  },
  toggleRegionVisibility(idx) {
    this.regions
      .eq(idx)
      // Hover to see action button. (Hover will not work actually)
      // It will not show hidden elements, but it will generate correct elements in react
      .trigger("mouseover")
      .find(".lsf-outliner-item__controls")
      .find(".lsf-outliner-item__control_type_visibility button")
      // Use force click for clicking on the element that is still hidden
      // (cypress's hover problem)
      // @link https://docs.cypress.io/api/commands/hover#Example-of-clicking-on-a-hidden-element
      .click({ force: true });
  },
  toggleRegionSelection(selectorOrIndex: string | number) {
    const regionFinder =
      typeof selectorOrIndex === "number" ? this.findRegionByIndex.bind(this) : this.findRegion.bind(this);

    regionFinder(selectorOrIndex).click();
  },
  collapseDetailsRightPanel() {
    cy.get(".lsf-sidepanels__wrapper_align_right .lsf-panel__toggle").should("be.visible").click();
  },
  expandDetailsRightPanel() {
    cy.get(".lsf-sidepanels__wrapper_align_right .lsf-panel__header").should("be.visible").click();
  },
  assertRegionHidden(idx: number, id: string, shouldBeHidden: boolean) {
    const expectation = shouldBeHidden ? "have.class" : "not.have.class";
    this.findRegionByIndex(idx).should("contain.text", id).parent().should(expectation, "lsf-tree__node_hidden");
  },
};
