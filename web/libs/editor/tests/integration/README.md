# LSF Cypress integration tests

Cypress e2e tests for the Label Studio Frontend editor. They run in CI against the same production standalone build that this doc describes.

## Local verification (CI-like build + Cypress UI)

To reproduce CI locally and debug in Cypress UI:

**1. Build the editor (production standalone, same as CI)**

From the `web/` directory:

```bash
MODE=standalone yarn nx run editor:build:production
```

**2. Serve the build on port 3000**

In the same or another terminal, from `web/`:

```bash
npx serve dist/libs/editor -l 3000
```

Leave this running. Confirm in the browser: [http://localhost:3000](http://localhost:3000) should load the LSF app (and CSS).

**3. Run Cypress in UI mode**

In a second terminal, from `web/`:

```bash
yarn lsf:integration:watch
```

This opens the Cypress UI. Choose a spec and run it; tests will hit `http://localhost:3000` (baseUrl in config). You can step through, inspect the app, and see exactly what Cypress sees.

To run headless (like CI) instead:

```bash
yarn lsf:integration
```
