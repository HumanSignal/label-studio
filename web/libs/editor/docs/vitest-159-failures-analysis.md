# Vitest: 159 failing tests – analysis

**Run:** `npx vitest run --config vitest.config.ts` (editor)  
**Result:** 159 failed | 1231 passed | 6 skipped (1396 total), 91 test files failed | 36 passed, 1 unhandled error.

---

## 1. **`vi.isolateModules` is not a function** (~38 tests, 1 file)

**File:** `src/tools/__tests__/Manager.test.js`  
**Cause:** Vitest has no `vi.isolateModules()` (Jest-only). Every test uses it in `beforeEach` to re-require `Manager` for a clean module state.

**Fix:** Replace with `vi.resetModules()` + re-require in `beforeEach`:

```js
beforeEach(() => {
  vi.clearAllMocks();
  // ... other setup ...
  vi.resetModules();
  ToolsManager = require("../Manager").default;
  ToolsManager.setRoot({ ... });
  ToolsManager.removeAllTools();
  // ...
});
```

If a single shared module instance is acceptable, you can require once at top level and skip isolation.

---

## 2. **Feature-flag mock missing `FF_SIMPLE_INIT`** (multiple tests/files)

**Message:** `No "FF_SIMPLE_INIT" export is defined on the ".../feature-flags" mock. Did you forget to return it from "vi.mock"?`

**Affected (examples):**  
- `src/regions/__tests__/Result.test.js`  
- `src/tags/object/__tests__/Base.test.js`  
- (and any file that mocks `utils/feature-flags` but doesn’t re-export flag constants)

**Cause:** Production code uses `isFF(FF_SIMPLE_INIT)`. The mock only provided `isFF` (and maybe one flag), so `FF_SIMPLE_INIT` is undefined and Vitest complains.

**Fix:** In each such test file, extend the feature-flags mock with the real flag constants (e.g. via `importOriginal`):

```js
vi.mock("../../utils/feature-flags", async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    isFF: vi.fn(() => false),
  };
});
```

Or at minimum add: `FF_SIMPLE_INIT: "ff_simple_init"` (or the real value) to the mock return.

---

## 3. **`React is not defined`** (many tests in TSX/JSX files)

**Affected (examples):**  
- `src/components/InstructionsModal/__tests__/InstructionsModal.test.tsx`  
- `src/components/SidePanels/DetailsPanel/__tests__/RegionItem.test.tsx`  
- `DetailsPanel.test.tsx`, `RegionDetails.test.tsx`, `EmptyState.test.tsx`, etc.

**Cause:** JSX like `<Component />` is compiled to `React.createElement(...)`, but `React` is not in scope because the file doesn’t import it (relying on the old automatic runtime or a misconfigured one in tests).

**Fix:** Add at the top of each failing test file:

```ts
import React from "react";
```

---

## 4. **`isFF.mockReturnValue` / `featureFlags.isFF.mockReturnValue` is not a function**

**Affected:**  
- `src/mixins/__tests__/KonvaRegion.test.js` (featureFlags.isFF)  
- `src/tags/control/__tests__/DateTime.test.jsx` (isFF)  
- Possibly others that mock feature-flags with a plain object instead of `vi.fn()`.

**Cause:** The mock returns something like `{ isFF: () => false }` instead of `{ isFF: vi.fn(() => false) }`, so `isFF.mockReturnValue` doesn’t exist.

**Fix:** Use a real mock function:

```js
const isFF = vi.fn(() => false);
vi.mock(".../feature-flags", () => ({
  isFF,
  FF_ZOOM_OPTIM: "ff_zoom_optim",
  // other flags as needed
}));
// in tests: isFF.mockReturnValue(true) or isFF.mockImplementation(() => true)
```

---

## 5. **Cannot find module (path / extension / alias)**

| Missing module | Imported from (example) | Likely cause |
|----------------|------------------------|--------------|
| `src/utils/utilities` | `src/utils/index.js`, `src/utils/html.js` | Vite resolving `./utilities` to a path without extension or wrong file (utilities.js vs utilities.ts). |
| `../Controls/Html5Player` | `Waveform.test.ts` | Require path in test (extension or mock path). |
| `../Controls/WebAudioPlayer` | `Waveform.test.ts` | Same. |
| `../BitmaskRegion/utils` | (Brush/similar) | Extension or path (e.g. `utils.ts` vs `utils.js`). |
| `../BitmaskRegion/contour` | (Brush/similar) | Same. |
| `../Registry` | (multiple) | Path/extension. |
| `../Brush` | `src/tools/__tests__/Brush.test.js` | Path from test to tool. |
| `../MagicWand` | `src/tools/__tests__/MagicWand.test.jsx` | Same. |
| `@humansignal/ui` | `TimeSeriesVisualizer.test.jsx` | Package not installed or not resolvable in test env. |
| `src/core/Helpers` | `AreaMixinMockResult.js` | Path/extension (Helpers.js vs Helpers.ts). |

**Fixes (by type):**  
- For `utils/utilities`: ensure Vite/resolver treats `utilities.ts` as the main export (e.g. in `vite.config` / `vitest.config` resolve `.ts` when no extension given), or change imports to `./utilities.js` / `./utilities.ts` if that’s the convention.  
- For `../Controls/Html5Player` etc.: use the same path style as the rest of the project (e.g. `@/lib/...` or relative with correct extension) or mock the module in the test.  
- For `@humansignal/ui`: add to env so the package resolves, or mock `@humansignal/ui` in the test (e.g. `vi.mock("@humansignal/ui", () => ({ getCurrentTheme: vi.fn() })`).

---

## 6. **Parse error: “Expression expected”**

**File:** `src/regions/__tests__/BrushRegion.test.js`  
**Cause:** Parser error in that file (syntax or invalid token).  
**Fix:** Open the file, find the line indicated by the error (or run the test and read the stack), and fix the syntax (e.g. missing `import { vi } from 'vitest'`, bad template literal, or stray character).

---

## 7. **“Not implemented” (KonvaRegion)**

**File:** `src/mixins/__tests__/KonvaRegion.test.js`  
**Tests:** e.g. `onClickRegion with detail 2`, `onClickRegion when isLinkingMode`, `onClickRegion when not linking and not double-click`.  
**Cause:** Some stub (e.g. for canvas or event handling) is not implemented in the test environment.  
**Fix:** Implement the minimal stub (e.g. for `drawImage` or the handler) in the test or in a shared test setup so the code path doesn’t hit “Not implemented”.

---

## 8. **Unhandled error: `ctx.drawImage` (canvas)**

**File:** `src/utils/canvas.js` (called from `src/utils/__tests__/canvas.test.js`).  
**Error:** `TypeError: Cannot read properties of undefined (reading 'drawImage')` at `ctx.drawImage(img, 0, 0)`.  
**Cause:** `canvas.getContext("2d")` returns undefined in the test env (no real canvas), so `ctx` is undefined.  
**Fix:** In the test (or setup), mock `HTMLCanvasElement.prototype.getContext` to return an object with `drawImage`, `getImageData`, etc., or use a canvas implementation that works in Node (e.g. `canvas` package or jsdom canvas mock).

---

## 9. **Files with “0 test” (tests not collected)**

Many files are reported as **(0 test)**. That usually means the file failed to load or to collect tests (parse error, runtime error during load, or top-level exception). Fixing the issues above (feature flags, React, module resolution, parse error, etc.) should turn many of these into real test runs; the exact failing file is often the one mentioned in the same run (e.g. “Cannot find module” or “React is not defined”).

**Examples:**  
Image.test.js, HtxParagraphs.test.jsx, ImageView.test.jsx, DrawingTool.test.js, BrushRegion.test.js, Taxonomy.test.jsx, TimeSeries.test.js, Audio model.test.js, AnnotationButton.test.tsx, RegionStore.test.js, VideoCanvas.test.tsx, RichText view.test.jsx, RectRegion.test.jsx, MagicWand.test.jsx, Brush.test.js, Label.test.jsx, Controls.test.tsx, TaskSummary.test.tsx, Toolbar.test.jsx, ConfigValidator.test.js, TreeRegistry.integration.test.js, AnnotationStore.integration.test.js, etc.

---

## Suggested order of fixes

1. **Global / high impact**  
   - Add missing **feature-flag** exports (e.g. `FF_SIMPLE_INIT`) and use **`vi.fn()` for `isFF`** where tests call `.mockReturnValue`.  
   - Add **`import React from "react"`** in all TSX/JSX test files that use JSX.

2. **Single-file wins**  
   - **Manager.test.js:** replace `vi.isolateModules` with `vi.resetModules()` + re-require in `beforeEach`.  
   - **BrushRegion.test.js:** fix parse error (“Expression expected”).  
   - **KonvaRegion.test.js:** fix `isFF` mock and implement or stub the “Not implemented” paths.

3. **Module resolution**  
   - Fix **utils/utilities** resolution (and any other `Cannot find module` under `src/`) in Vite/vitest config or imports.  
   - Fix or mock **@humansignal/ui**, **Html5Player**, **WebAudioPlayer**, **Brush**, **MagicWand**, **Registry**, **BitmaskRegion/utils**, **core/Helpers** as needed.

4. **Environment**  
   - **canvas.test.js:** mock `getContext("2d")` (and any other canvas APIs used) so `ctx` is never undefined.

After that, re-run the suite; many “0 test” files should start running and the 159 failures should drop. Re-run and iterate on the next remaining failures (same categories or new ones).
