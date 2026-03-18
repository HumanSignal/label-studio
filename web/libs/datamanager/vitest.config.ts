import path from "node:path";
import { defineConfig } from "vitest/config";
import { baseAlias } from "../../vitest.base";

// Tests expect the default "ls-" BEM prefix. Ensure no inherited env overrides it.
delete process.env.CSS_PREFIX;

const root = path.resolve(__dirname);
const webRoot = path.resolve(root, "../..");
const editorMocks = path.join(webRoot, "libs/editor/__mocks__");
const uiMocks = path.join(webRoot, "libs/ui/__mocks__");
const labelstudioSrc = path.join(webRoot, "apps/labelstudio/src");

export default defineConfig({
  root,
  server: { fs: { allow: [webRoot] } },
  test: {
    onConsoleLog(log: string) {
      if (log.startsWith("Warning:") || log.includes("inside a test was not wrapped in act")) return false;
    },
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
      // Vitest/Vite don't run Webpack's SVGR pipeline; icons are SVG→component. Stub so imports resolve.
      { find: "@humansignal/icons", replacement: path.join(uiMocks, "icons.tsx") },
      { find: "apps/labelstudio/src", replacement: labelstudioSrc },
      ...Object.entries(baseAlias)
        .filter(([find]) => find !== "@humansignal/icons")
        .map(([find, replacement]) => ({ find, replacement })),
      { find: "react-markdown", replacement: path.join(editorMocks, "react-markdown.tsx") },
      { find: "rehype-raw", replacement: path.join(editorMocks, "rehype-raw.ts") },
      // jsdom has no layout; real AutoSizer would report 0x0. This supplies dimensions so real FixedSizeGrid can render.
      {
        find: "react-virtualized-auto-sizer",
        replacement: path.join(root, "__mocks__/react-virtualized-auto-sizer.tsx"),
      },
    ],
  },
});
