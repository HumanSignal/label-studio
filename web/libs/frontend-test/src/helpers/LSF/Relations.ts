export const Relations = {
  hasRelations(count: number) {
    cy.get('.lsf-details__section-head').should('have.text', `Relations (${count})`);
  },
  hasRelation(from: string, to: string) {
    cy.get('.lsf-relations').contains(from).closest('.lsf-relations').contains(to);
  },
  toggleCreation() {
    cy.get('.lsf-region-actions__group_align_left > :nth-child(1) > .lsf-button__icon').click();
  },
  toggleCreationWithHotkey() {
    // hotkey is alt + r
    cy.get('body').type('{alt}r');
  },
};
