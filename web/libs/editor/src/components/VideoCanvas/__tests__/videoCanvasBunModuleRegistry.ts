/**
 * Bun `mock.module` matches by the exact specifier string. The same file can be registered as
 * `../VirtualVideo`, `../VirtualVideo.tsx`, an absolute path, or a `file:` URL — restoring or
 * re-mocking only one leaves the others pointing at a stale factory (common on Linux CI vs macOS).
 *
 * Pattern aligned with `libs/editor/src/stores/__tests__/AppStore.test.js` (HOTKEY_MODULE_ABS / URL).
 */
import { createRequire } from "node:module";
import { pathToFileURL } from "node:url";

const requireFromHere = createRequire(import.meta.url);

/** All specifier strings Bun may use for a sibling of `__tests__/` (e.g. VirtualVideo.tsx). */
export function videoCanvasSiblingModuleSpecifiers(tsxBaseName: string): readonly string[] {
  const relExt = `../${tsxBaseName}.tsx`;
  const abs = requireFromHere.resolve(relExt);
  const href = pathToFileURL(abs).href;
  const relNoExt = `../${tsxBaseName}`;
  return Array.from(new Set([relNoExt, relExt, abs, href]));
}

export const VIRTUAL_VIDEO_MODULE_SPECIFIERS = videoCanvasSiblingModuleSpecifiers("VirtualVideo");
export const VIRTUAL_CANVAS_MODULE_SPECIFIERS = videoCanvasSiblingModuleSpecifiers("VirtualCanvas");

/** Apply the same `mockModule` factory for every alias so no registry entry is left stale. */
export function mockModuleAllSpecifiers(specifiers: readonly string[], factory: () => Record<string, unknown>): void {
  for (const spec of specifiers) {
    mockModule(spec, factory);
  }
}
