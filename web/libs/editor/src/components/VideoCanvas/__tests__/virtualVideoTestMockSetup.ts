/**
 * Side-effect module: register Infomodal + real `VirtualVideo` in the Bun registry before any
 * `import("../VirtualVideo")` runs.
 *
 * `VirtualVideo.test.tsx` must **not** static-import `../VirtualVideo` alongside this file — sibling
 * imports can be evaluated in either order, so setup can run too late on CI. Use `beforeAll` +
 * dynamic `import("../VirtualVideo")` there instead.
 *
 * Re-binds the real `VirtualVideo` for every specifier alias (`videoCanvasBunModuleRegistry.ts`)
 * when another test file mocked under a different key.
 */
mockModule("../../Infomodal/Infomodal", () => ({
  __esModule: true,
  __skipMerge: true,
  default: {
    error: mock(),
    warning: mock(),
    success: mock(),
    info: mock(),
  },
}));
