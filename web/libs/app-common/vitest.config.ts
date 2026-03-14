import path from "node:path";
import { defineProject } from "vitest/config";
import { baseAlias } from "../../vitest.base";

const root = __dirname;
const uiMocks = path.join(root, "../ui/__mocks__");

export default defineProject({
  root,
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
      ...Object.entries(baseAlias).map(([find, replacement]) => ({ find, replacement })),
      { find: "react-markdown", replacement: path.join(uiMocks, "react-markdown.tsx") },
      { find: "rehype-raw", replacement: path.join(uiMocks, "rehype-raw.ts") },
    ],
  },
});
