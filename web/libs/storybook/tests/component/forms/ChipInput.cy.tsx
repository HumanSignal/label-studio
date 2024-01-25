import { ChipInput } from '../../../src/components/form/ChipInput';
import z from 'zod';

describe('Basic rendering', () => {
  beforeEach(() => {
    cy.viewport(500, 54);
  });
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
  });

  it('should properly handle paste', () => {
    cy.mount(<ChipInput />);

    cy.get('[data-testid=chip-input-field]')
      .paste('one@example.com two@example.com')
      .trigger('blur')
      .should('have.value', 'two@example.com');

    cy.get('[data-testid=chip]').should('have.length', 1);
  });

  it('should not allow invalid values', () => {
    cy.mount(<ChipInput />);

    cy.get('[data-testid=chip-input-field]').type('invalid@value ');

    cy.get('[data-testid=chip]').should('not.exist');
  });

  it('should allow arbitrary strings', () => {
    cy.mount(<ChipInput validate={z.string()} />);

    cy.get('[data-testid=chip-input-field]').type('one two three{enter}');

    cy.get('[data-testid=chip]').should('have.length', 3);
  });

  it('should allow string of specific length', () => {
    cy.mount(<ChipInput validate={z.string().min(3).max(6)} />);
    const input = () => cy.get('[data-testid=chip-input-field]');
    const chip = () => cy.get('[data-testid=chip]');

    input().type('one{enter}');

    chip().should('have.length', 1);

    input().type('he{enter}');

    chip().should('have.length', 1);

    input().should('have.value', 'he');
    input().type('lp{enter}');

    chip().should('have.length', 2);
    input().type('implementation{enter}');
    chip().should('have.length', 2);
  });

  it('should correctly display placeholder', () => {
    const placeholder = 'Comma-separated list of tags';
    cy.mount(<ChipInput placeholder={placeholder} />);

    cy.get('[data-testid=placeholder]').should('have.text', placeholder);

    cy.get('[data-testid=chip-input-field]').type('email@example.com{enter}');

    cy.get('[data-testid=placeholder]').should('not.exist');

    cy.get('[data-testid=chip]').get('[data-testid=chip-remove]').click();

    cy.get('[data-testid=placeholder]').should('have.text', placeholder);

    cy.get('[data-testid=chip-input-field]').focus().blur();
    cy.get('[data-testid=placeholder]').should('be.visible');
  });
});
