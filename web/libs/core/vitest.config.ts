import path from "node:path";
import { defineConfig } from "vitest/config";
import { baseAlias } from "../../vitest.base";

export default defineConfig({
  root: __dirname,
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: [path.join(__dirname, "../../vitest.jest-compat.ts")],
    include: ["src/**/*.test.{ts,tsx}"],
    coverage: {
      provider: "v8",
      reportsDirectory: path.join(__dirname, "../../coverage/libs/core"),
      reporter: ["json", "lcov", "text"],
    },
  },
  resolve: {
    alias: Object.entries(baseAlias).map(([find, replacement]) => ({ find, replacement })),
  },
});
