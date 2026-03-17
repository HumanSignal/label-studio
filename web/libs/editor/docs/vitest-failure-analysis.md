# Editor Vitest – failure analysis (config-only scope)

**Goal:** Reduce failures using only config (vitest.config.ts, vitest.setup.ts). No test or mock file changes.

---

## Error breakdown (from last run: 199 failed, 929 passed)

| Error pattern | Count | Config-fixable? |
|---------------|-------|------------------|
| `mockReturnValue` / `mockImplementation` is not a function | 57 + 6 | **No.** Tests mock feature-flags (or similar) and call `.mockReturnValue(isFF)` but get the real `isFF` because the mock factory runs in a context where the mock isn’t applied. Fix: use `vi.fn()` in test mocks or ensure mock runs (test-level change). |
| `[mobx-state-tree] Error while converting` (snapshot / from_name / to_name) | 42 | **No.** Invalid MST snapshots in test data. Fix: correct test data or MST setup in tests. |
| `Cannot read properties of undefined (reading 'redraw')` | 22 | **No.** Code expects a Konva layer/stage with `.redraw()`. Would need a global Konva mock (heavy). |
| `Cannot read properties of undefined (reading 'areas')` | 8 | **No.** Test/store doesn’t provide annotation shape. Fix in test or store mock. |
| `Cannot read properties of undefined (reading 'replace')` | 5 | **No.** Depends on test data / component props. |
| `Failed to find the parent` (MST) | 4 | **No.** MST tree structure in tests. |
| `Cannot read properties of undefined (reading 'isReadOnly')` | 4 | **No.** Annotation/store shape in tests. |
| `Cannot find module '../../Cursor/Cursor'` | 9 (Segment tests) | **Yes.** Resolve to `lib/AudioUltra/Cursor/Cursor.ts`. |
| `Cannot find module '...PerRegionModes'` | 1 | **Yes.** Resolve to `mixins/PerRegionModes.js`. |
| `Cannot find module '@humansignal/core'` | 1 | **Yes.** Inline in `server.deps.inline`. |
| `drawImage` (ctx null or missing after teardown) | 1 | **Partial.** Canvas mock already has `drawImage`; failure is likely async img.onload after teardown. Hardened with `toDataURL` stub and lenient `getContext('2d')`. |
| Other (Transform, find, ERR_LOADING_*) | few | **No.** Test/data shape. |

---

## Config changes applied

1. **vitest.config.ts**
   - **Plugin `editor-resolve-perregionmodes`:** `resolveId` returns `mixins/PerRegionModes.js` when `id` is `./PerRegionModes`, `../../../mixins/PerRegionModes`, or ends with `PerRegionModes` (for importers under mixins or OutlinerPanel). *Note:* PerRegionModes may still fail if the resolver sees a different `id`; Cursor is not fixed by config (see below).
   - **resolve.extensions:** Explicit list including `.ts`, `.tsx`, `.js`, `.jsx`.
   - **resolve.alias:** PerRegionModes path-based aliases; **Cursor not fixable via alias** because failing tests use **dynamic `require("../../Cursor/Cursor")`**, which is resolved by Node, not Vite, so Vite aliases never run.
   - **server.deps.inline:** Added `@humansignal/core`.

2. **vitest.setup.ts**
   - **Canvas:** One shared `canvas2dMock` (with `drawImage`, etc.) for `getContext('2d')`; lenient check for `contextType?.toLowerCase() === '2d'`.
   - **toDataURL:** Stub on `HTMLCanvasElement.prototype` when missing (reduces async img.onload issues; one teardown race may remain).

---

## What cannot be fixed by config alone

- **`Cannot find module '../../Cursor/Cursor'` (Segment tests):** Tests use **dynamic `require("../../Cursor/Cursor")`**. That is resolved by Node, not Vite, so Vite’s `resolve.alias` and `resolveId` plugins never run. Fix: use static imports in tests, or a test helper that provides `CursorSymbol`, or a Vitest/Node setup that patches `require` (not config-only).
- **Feature-flag mocks (57+ failures):** Tests that do `jest.mock("...feature-flags", () => ({ ...jest.requireActual(), isFF: jest.fn() }))` and then `isFF.mockReturnValue(...)`. In Vitest the mock often doesn’t apply, so `isFF` is the real function. Fix: use `vi.mock` + `vi.fn()` in those test files, or a shared test helper that provides a mock `isFF`.
- **MST snapshot/result errors (42):** Test data uses invalid MST snapshots (e.g. `from_name` / `to_name` as objects instead of references). Fix: adjust test data or MST tree setup in tests.
- **Konva / redraw (22):** Components expect Konva nodes with `.redraw()`. Fix: per-test Konva mocks or test structure.
- **Store/annotation shape (areas, isReadOnly, etc.):** Missing or wrong store/annotation in tests. Fix: provide proper store/annotation in test setup or mocks.

After the applied config changes, re-run the suite and update counts. Remaining failures will need test-level or mock-level changes.
