import fs from "node:fs";
import path from "node:path";
import { defineConfig } from "vitest/config";
import { baseAlias } from "../../vitest.base";

const workspaceRoot = path.resolve(__dirname, "../..");
const coverageDir = path.join(__dirname, "../../coverage/libs/storybook");
fs.mkdirSync(coverageDir, { recursive: true });

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
      reportsDirectory: path.join(__dirname, "../../coverage/libs/core"),
      reporter: ["json", "lcov"],
    },
  },
  resolve: {
    alias: Object.entries(baseAlias).map(([find, replacement]) => ({ find, replacement })),
  },
});
