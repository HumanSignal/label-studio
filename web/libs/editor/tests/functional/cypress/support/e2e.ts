import { CURRENT_FLAGS } from '../../feature-flags';
import '@heartexlabs/ls-test/cypress/support/e2e';

beforeEach(() => {
  cy.on('uncaught:exception', err => {
    return !err.message.includes('ResizeObserver loop completed with undelivered notifications.');
  });
  cy.on('window:before:load', (win) => {
    console.log('Setting feature flags', CURRENT_FLAGS);
    Object.assign(win, {
      DISABLE_DEFAULT_LSF_INIT: true,
      APP_SETTINGS: {
        ...(win.APP_SETTINGS ?? {}),
        feature_flags: CURRENT_FLAGS,
      },
    });
  });
  cy.log('Feature flags set');
});
