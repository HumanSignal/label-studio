import path from "node:path";
import { defineConfig } from "vitest/config";
import { baseAlias } from "../../vitest.base";

const workspaceRoot = path.resolve(__dirname, "../..");

export default defineConfig({
  root: __dirname,
  server: { fs: { allow: [workspaceRoot] } },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: [path.join(__dirname, "../../vitest.jest-compat.ts")],
    include: ["**/*.test.{ts,tsx,js,jsx}"],
    coverage: {
      provider: "v8",
      // Vitest's v8 provider deletes .tmp/ during setup, then lstat()s it after tests.
      // With zero test files, no worker recreates .tmp, causing ENOENT. Skipping the
      // clean step keeps the directory alive. Safe to remove once tests exist.
      clean: false,
      reportsDirectory: path.join(__dirname, "../../coverage/libs/storybook"),
      reporter: ["json", "lcov"],
    },
  },
  resolve: {
    alias: Object.entries(baseAlias).map(([find, replacement]) => ({ find, replacement })),
  },
});
