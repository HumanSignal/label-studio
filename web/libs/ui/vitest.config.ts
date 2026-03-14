import path from "node:path";
import { defineProject } from "vitest/config";
import { baseAlias } from "../../vitest.base";

const workspaceRoot = path.resolve(__dirname, "../..");

export default defineProject({
  root: __dirname,
  server: { fs: { allow: [workspaceRoot] } },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: [path.join(__dirname, "../../vitest.jest-compat.ts")],
    include: ["src/**/*.{test,spec}.{ts,tsx}"],
    css: {
      modules: { classNameStrategy: "non-scoped" },
    },
    coverage: {
      provider: "v8",
      reportsDirectory: path.join(__dirname, "../../coverage/libs/ui"),
      reporter: ["json", "text"],
    },
  },
  resolve: {
    alias: [
      { find: "json-edit-react", replacement: path.join(__dirname, "__mocks__/json-edit-react.tsx") },
      { find: "@humansignal/icons", replacement: path.join(__dirname, "__mocks__/icons.tsx") },
      ...Object.entries(baseAlias).map(([find, replacement]) => ({ find, replacement })),
      { find: "react-markdown", replacement: path.join(__dirname, "__mocks__/react-markdown.tsx") },
      { find: "rehype-raw", replacement: path.join(__dirname, "__mocks__/rehype-raw.ts") },
    ],
  },
});
