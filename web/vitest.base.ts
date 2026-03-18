import path from "node:path";
import type { Plugin } from "vite";

const root = path.resolve(__dirname);

/**
 * Vitest 2.1.9 bug: onAfterSuiteRun() writes coverage JSON to .tmp/ without
 * ensuring the directory exists. clean() creates it at startup, but in CI the
 * directory can vanish (NX output cleanup, parallel tasks, etc.) before the
 * write happens. This patches both the write path and the cleanup path.
 * Remove once vitest ships the fix upstream.
 */
export function patchCoverageCleanup(): Plugin {
  return {
    name: "patch-coverage-cleanup",
    async configResolved() {
      try {
        const { BaseCoverageProvider } = await import("vitest/coverage");
        const fs = await import("node:fs");

        const origOnAfterSuiteRun = BaseCoverageProvider.prototype.onAfterSuiteRun;
        BaseCoverageProvider.prototype.onAfterSuiteRun = function (...args: unknown[]) {
          fs.mkdirSync(this.coverageFilesDirectory, { recursive: true });
          return origOnAfterSuiteRun.apply(this, args);
        };

        BaseCoverageProvider.prototype.cleanAfterRun = async function () {
          this.coverageFiles = new Map();
          await fs.promises.rm(this.coverageFilesDirectory, { recursive: true, force: true });
          if (fs.existsSync(this.options.reportsDirectory) && fs.readdirSync(this.options.reportsDirectory).length === 0) {
            await fs.promises.rm(this.options.reportsDirectory, { recursive: true, force: true });
          }
        };
      } catch {
        // coverage module not available — running without coverage, nothing to patch
      }
    },
  };
}

/**
 * Path aliases from tsconfig.base.json for use in Vitest projects.
 * Uses directory paths so that e.g. @humansignal/core resolves to libs/core/src (index resolved by Node).
 * Projects should merge with their own alias overrides (e.g. mocks).
 */
export const baseAlias: Record<string, string> = {
  "@humansignal/app-common": path.join(root, "libs/app-common/src"),
  "@humansignal/core": path.join(root, "libs/core/src"),
  "@humansignal/datamanager": path.join(root, "libs/datamanager/src"),
  "@humansignal/editor": path.join(root, "libs/editor/src"),
  "@humansignal/frontend-test": path.join(root, "libs/frontend-test/src"),
  "@humansignal/icons": path.join(root, "libs/ui/src/assets/icons"),
  "@humansignal/shad": path.join(root, "libs/ui/src/shad"),
  "@humansignal/ui": path.join(root, "libs/ui/src"),
};
