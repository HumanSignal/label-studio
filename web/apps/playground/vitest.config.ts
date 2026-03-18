import path from "node:path";
import { defineConfig } from "vitest/config";
import { baseAlias } from "../../vitest.base";

const root = __dirname;
const workspaceRoot = path.resolve(root, "../..");
const editorMocks = path.join(root, "../../libs/editor/__mocks__");
const uiMocks = path.join(workspaceRoot, "libs/ui/__mocks__");

export default defineConfig({
  root,
  server: { fs: { allow: [workspaceRoot] } },
  test: {
    pool: "forks",
    environment: "jsdom",
    globals: true,
    setupFiles: [path.join(root, "../../vitest.jest-compat.ts"), path.join(root, "vitest.setup.ts")],
    include: ["src/**/*.test.{ts,tsx}"],
    coverage: {
      provider: "v8",
      reportsDirectory: path.join(root, "../../coverage/apps/playground"),
      reporter: ["json", "lcov"],
    },
  },
  resolve: {
    alias: [
      // Toast subpath: resolve to stub so PlaygroundApp loads without full toast deps
      { find: "@humansignal/ui/lib/toast/toast", replacement: path.join(root, "src/__mocks__/humansignal-ui.tsx") },
      // react-codemirror2: stub so CodeMirror (getBoundingClientRect) doesn't run in jsdom
      { find: "react-codemirror2", replacement: path.join(root, "src/__mocks__/react-codemirror2.tsx") },
      // canvas: stub so konva (editor) doesn't require native canvas in tests
      { find: "canvas", replacement: path.join(root, "src/__mocks__/canvas.ts") },
      // @humansignal/editor: stub so PreviewPanel doesn't load konva/canvas (LabelStudio=null skips mount)
      { find: "@humansignal/editor", replacement: path.join(root, "src/__mocks__/editor.ts") },
      // UI package icons index: resolve to stub so TopBar etc. get defined icon components in tests
      {
        find: path.join(workspaceRoot, "libs/ui/src/assets/icons/index.ts"),
        replacement: path.join(uiMocks, "icons.tsx"),
      },
      // ThemeToggle: stub so SVG icons (sun/moon) don't need to resolve in tests
      {
        find: path.join(workspaceRoot, "libs/ui/src/lib/ThemeToggle/ThemeToggle.tsx"),
        replacement: path.join(uiMocks, "ThemeToggle.tsx"),
      },
      ...Object.entries(baseAlias).map(([find, replacement]) => ({ find, replacement })),
      { find: "react-markdown", replacement: path.join(editorMocks, "react-markdown.tsx") },
      { find: "rehype-raw", replacement: path.join(editorMocks, "rehype-raw.ts") },
      { find: /^apps\/playground\/(.*)$/, replacement: path.join(root, "$1") },
    ],
  },
});
