import path from "node:path";

const root = path.resolve(__dirname);

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
