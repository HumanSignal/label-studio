import path from "node:path";
import { defineConfig } from "vitest/config";
import { baseAlias } from "../../vitest.base";

const root = __dirname;
const workspaceRoot = path.resolve(root, "../..");

export default defineConfig({
  root,
  server: { fs: { allow: [workspaceRoot] } },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: [path.join(root, "../../vitest.jest-compat.ts")],
    include: ["src/**/*.test.{ts,tsx}"],
    coverage: {
      provider: "v8",
      reportsDirectory: path.join(root, "../../coverage/apps/labelstudio"),
      reporter: ["json", "lcov", "text"],
    },
  },
  resolve: {
    alias: [
      ...Object.entries(baseAlias).map(([find, replacement]) => ({ find, replacement })),
      { find: /^apps\/labelstudio\/(.*)$/, replacement: path.join(root, "$1") },
    ],
  },
});
