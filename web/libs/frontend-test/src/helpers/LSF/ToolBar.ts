export const ToolBar = {
  get root() {
    return cy.get('.lsf-topbar');
  },

  get submitBtn() {
    return this.root
      .find('[aria-label="submit"]');
  },
};
