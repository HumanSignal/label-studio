import fs from "node:fs";
import path from "node:path";
import { defineConfig } from "vitest/config";
import { baseAlias } from "../../vitest.base";

const workspaceRoot = path.resolve(__dirname, "../..");
const coverageDir = path.join(__dirname, "../../coverage/libs/ui");
fs.mkdirSync(coverageDir, { recursive: true });

export default defineConfig({
  root: __dirname,
  server: { fs: { allow: [workspaceRoot] } },
  test: {
    onConsoleLog(log: string) {
      if (log.startsWith("Warning:") || log.includes("inside a test was not wrapped in act")) return false;
    },
    environment: "jsdom",
    globals: true,
    setupFiles: [path.join(__dirname, "../../vitest.jest-compat.ts")],
    include: ["src/**/*.{test,spec}.{ts,tsx}"],
    css: {
      modules: { classNameStrategy: "non-scoped" },
    },
    coverage: {
      provider: "v8",
      reportsDirectory: coverageDir,
      reporter: ["json", "lcov"],
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
