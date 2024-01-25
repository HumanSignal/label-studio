import { mount } from 'cypress/react';

Cypress.Commands.add('mount', mount);

Cypress.Commands.add(
  'paste',
  { prevSubject: true },
  (subject: JQuery<HTMLElement>, pastePayload: string) => {
    const element = subject.get(0);

    if (!element) return cy.wrap(subject);

    const clipboardData = new DataTransfer();
    clipboardData.setData('text/plain', pastePayload);

    // https://developer.mozilla.org/en-US/docs/Web/API/Element/paste_event
    const pasteEvent = new ClipboardEvent('paste', {
      // bubbles: false,
      // cancelable: false,
      clipboardData,
    });

    const emitted = subject.get(0).dispatchEvent(pasteEvent);
    cy.log(`Pasting "${pastePayload}" [${emitted}]`, element);
    expect(emitted).eq(true);

    return cy.wrap(subject);
  }
);
