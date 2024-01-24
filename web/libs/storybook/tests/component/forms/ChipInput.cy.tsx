import { ChipInput } from '../../../src/components/ChipInput';

describe('Basic rendering', () => {
  it('should correctly work with emails', () => {
    const placeholder = 'This is text';
    cy.mount(<ChipInput placeholder={placeholder} />);

    cy.get('[data-testid=placeholder]').should('have.text', placeholder);

    cy.get('[data-testid=chip-input-field]').type('hello@world.com ');

    cy.get('[data-testid=chip]').should('have.length', 1);

    cy.get('[data-testid=chip-input-field]').type('ahother value ');

    cy.get('[data-testid=chip]').should('have.length', 1);

    cy.get('[data-testid=chip-input-field]')
      .clear()
      .type('one@more.email two@more.email three@more.email ');

    cy.get('[data-testid=chip-input-field]').paste(
      'one@example.com two@example.com'
    );
  });
});
