import path from "node:path";
import { defineProject } from "vitest/config";
import { baseAlias } from "../../vitest.base";

const root = path.resolve(__dirname);
const webRoot = path.resolve(root, "../..");
const editorMocks = path.join(webRoot, "libs/editor/__mocks__");
const labelstudioSrc = path.join(webRoot, "apps/labelstudio/src");

export default defineProject({
  root,
  server: { fs: { allow: [webRoot] } },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: [
      path.join(__dirname, "../../vitest.jest-compat.ts"),
      path.join(__dirname, "vitest.setup.ts"),
    ],
    include: ["src/**/*.test.{ts,tsx,js,jsx}"],
    coverage: {
      provider: "v8",
      reportsDirectory: path.join(root, "../../coverage/libs/datamanager"),
      reporter: ["json", "lcov", "text"],
    },
  },
  resolve: {
    alias: [
      { find: "apps/labelstudio/src", replacement: labelstudioSrc },
      ...Object.entries(baseAlias).map(([find, replacement]) => ({ find, replacement })),
      { find: "react-markdown", replacement: path.join(editorMocks, "react-markdown.tsx") },
      { find: "rehype-raw", replacement: path.join(editorMocks, "rehype-raw.ts") },
    ],
  },
});
