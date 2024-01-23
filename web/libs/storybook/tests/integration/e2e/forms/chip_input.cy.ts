describe('Basic chip test', function () {
  it('should input emails', () => {
    cy.visit('/iframe.html?id=form-chipinput--primary&viewMode=story');

    cy.get('.chip-input').within(() => {
      cy.log('Typing some letters');
      cy.get('[data-testid=chip-input-field]').type('hello@world.com ');
    });
  });

  it('shold mount a component', () => {});
});
