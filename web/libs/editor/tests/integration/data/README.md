# Integration test data

Fixtures for Cypress integration specs. Structure mirrors `e2e/` (e.g. `data/core/` for `e2e/core/`).

**Conventions:**

- Export config strings as `*Config` (e.g. `repeaterPagedConfig`, `choicesConfig`).
- Export task data objects as `*Data` (e.g. `repeaterPagedData`, `imageData`).
- Export annotation/result arrays as `*Result` or `*Annotations` when needed.
- Add a short JSDoc comment for configs when they enable a specific feature under test.

**Shared data:**

- `data/shared-assets.ts` — common asset URLs (e.g. `IMAGE_URL_SAMPLE`). Import from here to avoid duplicating URLs across data modules.
