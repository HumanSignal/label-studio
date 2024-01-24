import { mount } from 'cypress/react';

Cypress.Commands.add('mount', mount);

Cypress.Commands.add(
  'paste',
  { prevSubject: true },
  (subject: JQuery<HTMLElement>, pastePayload: string) => {
    const clipboardData = new DataTransfer();
    clipboardData.setData('text/plain', pastePayload);

    // https://developer.mozilla.org/en-US/docs/Web/API/Element/paste_event
    const pasteEvent = new ClipboardEvent('paste', {
      clipboardData,
    });

    subject[0].dispatchEvent(pasteEvent);
    cy.log(`Pasting "${pastePayload}"`);
  }
);
