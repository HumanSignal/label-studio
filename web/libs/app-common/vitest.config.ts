import path from "node:path";
import { defineProject } from "vitest/config";
import { baseAlias } from "../../vitest.base";

const root = path.resolve(__dirname);
const webRoot = path.resolve(root, "../..");
const uiMocks = path.join(webRoot, "libs/ui/__mocks__");
const labelstudioSrc = path.join(webRoot, "apps/labelstudio/src");

export default defineProject({
  root,
  server: { fs: { allow: [webRoot] } },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: [path.join(__dirname, "../../vitest.jest-compat.ts")],
    include: ["src/**/*.test.{ts,tsx,js,jsx}"],
    coverage: {
      provider: "v8",
      reportsDirectory: path.join(root, "../../coverage/libs/app-common"),
      reporter: ["json", "lcov", "text"],
    },
  },
  resolve: {
    alias: [
      { find: "@humansignal/icons", replacement: path.join(uiMocks, "icons.tsx") },
      { find: "apps/labelstudio/src", replacement: labelstudioSrc },
      ...Object.entries(baseAlias)
        .filter(([find]) => find !== "@humansignal/icons")
        .map(([find, replacement]) => ({ find, replacement })),
      { find: "react-markdown", replacement: path.join(uiMocks, "react-markdown.tsx") },
      { find: "rehype-raw", replacement: path.join(uiMocks, "rehype-raw.ts") },
    ],
  },
});
