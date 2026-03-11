const metaModifier = window.navigator.platform.toLowerCase().indexOf("mac") >= 0 ? "metaKey" : "ctrlKey";

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
    this.orderRegionsButton.click();
    cy.get(".lsf-dropdown").contains("Order by Time").parent().click();
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
  toggleRegionSelection(selectorOrIndex: string | number, withModifier = false) {
    const regionFinder =
      typeof selectorOrIndex === "number" ? this.findRegionByIndex.bind(this) : this.findRegion.bind(this);

    regionFinder(selectorOrIndex).click({ [metaModifier]: withModifier });
  },
  collapseDetailsRightPanel() {
    // New UI (SideTabsPanels): right-aligned panel has collapse toggle with Collapse tooltip
    cy.get('.lsf-tabs-panel_alignment_right [data-tooltip="Collapse"]').should("be.visible").first().click();
  },
  expandDetailsRightPanel() {
    // New UI (SideTabsPanels): click the right-aligned panel header to expand when collapsed
    cy.get(".lsf-tabs-panel_alignment_right .lsf-tabs-panel__header").should("be.visible").first().click();
  },
  assertRegionHidden(idx: number, id: string, shouldBeHidden: boolean) {
    const expectation = shouldBeHidden ? "have.class" : "not.have.class";
    this.findRegionByIndex(idx).should("contain.text", id).parent().should(expectation, "lsf-tree__node_hidden");
  },
};
