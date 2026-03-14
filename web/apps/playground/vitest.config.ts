import path from "node:path";
import { defineProject } from "vitest/config";
import { baseAlias } from "../../vitest.base";

const root = __dirname;
const workspaceRoot = path.resolve(root, "../..");
const editorMocks = path.join(root, "../../libs/editor/__mocks__");

export default defineProject({
  root,
  server: { fs: { allow: [workspaceRoot] } },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: [path.join(root, "../../vitest.jest-compat.ts")],
    include: ["src/**/*.test.{ts,tsx}"],
    coverage: {
      provider: "v8",
      reportsDirectory: path.join(root, "../../coverage/apps/playground"),
      reporter: ["json", "lcov", "text"],
    },
  },
  resolve: {
    alias: [
      ...Object.entries(baseAlias).map(([find, replacement]) => ({ find, replacement })),
      { find: "react-markdown", replacement: path.join(editorMocks, "react-markdown.tsx") },
      { find: "rehype-raw", replacement: path.join(editorMocks, "rehype-raw.ts") },
      { find: /^apps\/playground\/(.*)$/, replacement: path.join(root, "$1") },
    ],
  },
});
