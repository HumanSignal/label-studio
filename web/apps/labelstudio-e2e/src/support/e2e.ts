// ***********************************************************
// This example support/index.js is processed by
// and loaded automatically before your test files.
//
// This is a great place for global configuration
// and behavior that modifies Cypress.
//
// You can read more here:
// https://on.cypress.io/configuration
// ***********************************************************

// Import commands.js using ES2015 syntax:
import './commands';

// The app registers a service worker that caches assets; under Cypress this
// makes page loads non-deterministic. After each test's page is open, drop
// service workers and their caches so the next test starts from a clean slate.
afterEach(() => {
  cy.window({ log: false }).then(async (win) => {
    try {
      if (!win.location.origin?.startsWith("http")) return;
      if (win.navigator.serviceWorker) {
        const regs = await win.navigator.serviceWorker.getRegistrations();
        await Promise.all(regs.map((r) => r.unregister()));
      }
      if (win.caches) {
        const keys = await win.caches.keys();
        await Promise.all(keys.map((k) => win.caches.delete(k)));
      }
    } catch {
      /* no page or SW API unavailable — nothing to clean */
    }
  });
});
