import path from "node:path";
import { defineProject } from "vitest/config";
import { baseAlias } from "../../vitest.base";

const root = __dirname;
const webRoot = path.join(root, "../..");
const nodeModules = path.join(webRoot, "node_modules");
const coreSrc = path.resolve(webRoot, "libs/core/src");
const editorSrc = path.join(root, "src");

const utilitiesTs = path.resolve(root, "src/utils/utilities.ts");
const VIRTUAL_STYLE_MOCK = "\0virtual:editor-style-mock";
const reactJsxRuntime = path.join(webRoot, "node_modules/react/jsx-runtime.js");
const reactJsxDevRuntime = path.join(webRoot, "node_modules/react/jsx-dev-runtime.js");

export default defineProject({
  root,
  plugins: [
    {
      name: "resolve-editor-utilities",
      enforce: "pre",
      resolveId(id) {
        if (id === VIRTUAL_STYLE_MOCK) return VIRTUAL_STYLE_MOCK;
        // Resolve React subpaths so core/ui (when pulled in from editor) get the same React instance
        if (id === "react/jsx-runtime" || id === "react/jsx-dev-runtime") {
          return path.join(webRoot, "node_modules/react", id === "react/jsx-runtime" ? "jsx-runtime.js" : "jsx-dev-runtime.js");
        }
        let normalized = id.replace(/\\/g, "/");
        // Stub all CSS / CSS module / asset imports so test files load (resolveId may not run for CSS in some Vite paths, so we also rewrite in transform)
        if (/\.css(\?.*)?$/i.test(normalized) || /\.(svg|png|jpe?g)(\?.*)?$/i.test(normalized)) {
          return path.join(root, "__mocks__/styleMock.js");
        }
        // Match file:// URL form (used by some loaders)
        if (normalized.startsWith("file://")) {
          try {
            normalized = decodeURIComponent(normalized.slice(7));
          } catch {
            // ignore
          }
        }
        const target = path.resolve(root, "src/utils/utilities").replace(/\\/g, "/");
        if (
          normalized === target ||
          normalized === "./utilities" ||
          normalized.endsWith("/utils/utilities") ||
          id === target ||
          id.endsWith("/utils/utilities")
        ) {
          return utilitiesTs;
        }
        return null;
      },
      load(id) {
        if (id === VIRTUAL_STYLE_MOCK) return "export default {};";
        return null;
      },
      transform(code, id) {
        if (id.includes("node_modules") || !/\.(jsx?|tsx?)$/.test(id)) return null;
        let rewritten = code
          .replace(/from\s+['"]([^'"]*\.(?:css|svg|png|jpe?g)(?:\?[^'"]*)?)['"]/g, () => `from "${VIRTUAL_STYLE_MOCK}"`)
          .replace(/import\s+['"]([^'"]*\.(?:css|svg|png|jpe?g)(?:\?[^'"]*)?)['"]\s*;?/g, () => `import "${VIRTUAL_STYLE_MOCK}";`);
        // Rewrite React subpath imports so core/ui resolve to the same React (resolveId may not run for them)
        rewritten = rewritten
          .replace(/from\s+["']react\/jsx-runtime["']/g, () => `from "${reactJsxRuntime}"`)
          .replace(/from\s+["']react\/jsx-dev-runtime["']/g, () => `from "${reactJsxDevRuntime}"`);
        if (rewritten !== code) return { code: rewritten, map: null };
        return null;
      },
    },
    // Run after JSX transform has injected "react/jsx-dev-runtime" / "react/jsx-runtime"
    {
      name: "resolve-react-jsx-runtime",
      enforce: "post",
      transform(code) {
        const rewritten = code
          .replace(/from\s*["']react\/jsx-runtime["']/g, () => `from "${reactJsxRuntime}"`)
          .replace(/from\s*["']react\/jsx-dev-runtime["']/g, () => `from "${reactJsxDevRuntime}"`);
        if (rewritten !== code) return { code: rewritten, map: null };
        return null;
      },
    },
  ],
  test: {
    environment: "jsdom",
    globals: true,
    globalSetup: [path.join(root, "scripts/compile-utilities-for-test.mjs")],
    setupFiles: [path.join(root, "vitest.setup.ts")],
    include: ["src/**/*.test.{ts,tsx,js,jsx}"],
    exclude: [
      "**/node_modules/**",
      "**/e2e/**",
      "**/renderEditor.test.{ts,tsx,js,jsx}",
    ],
    coverage: {
      provider: "v8",
      reportsDirectory: path.join(webRoot, "coverage"),
      reporter: ["json", "lcov", "text"],
      include: ["src/**/*.{ts,tsx,js,jsx}"],
      exclude: [
        "**/__mocks__/**",
        "**/*.d.ts",
        "**/examples/**",
        "**/SplitChannel.ts",
      ],
      thresholds: {
        branches: 1,
        functions: 1,
        lines: 1,
        statements: 1,
      },
    },
  },
  resolve: {
    extensions: [".ts", ".tsx", ".js", ".jsx", ".json", ".mjs"],
    dedupe: ["react", "react-dom"],
    alias: [
      // Resolve utils/utilities (no extension) to .ts — must be before other aliases so index.js and mixins resolve
      { find: "./utilities", replacement: path.resolve(root, "src/utils/utilities.ts") },
      { find: "../utils/utilities", replacement: path.resolve(root, "src/utils/utilities.ts") },
      { find: "utils/utilities", replacement: path.resolve(root, "src/utils/utilities.ts") },
      { find: path.resolve(root, "src/utils/utilities"), replacement: path.resolve(root, "src/utils/utilities.ts") },
      // index.js imports "./utilities.js" — resolve to .ts so Vite transforms and resolves @humansignal/core
      { find: path.resolve(root, "src/utils/utilities.js"), replacement: path.resolve(root, "src/utils/utilities.ts") },
      // Single React instance so hooks and react-dom share one copy (avoids "useState of null")
      { find: "react", replacement: path.join(webRoot, "node_modules/react/index.js") },
      { find: "react/jsx-runtime", replacement: path.join(webRoot, "node_modules/react/jsx-runtime.js") },
      { find: "react/jsx-dev-runtime", replacement: path.join(webRoot, "node_modules/react/jsx-dev-runtime.js") },
      { find: "react-dom", replacement: path.join(webRoot, "node_modules/react-dom/index.js") },
      { find: path.join(editorSrc, "core/Constants"), replacement: path.join(editorSrc, "core/Constants.ts") },
      { find: "@humansignal/core", replacement: coreSrc },
      ...Object.entries(baseAlias).map(([find, replacement]) => ({ find, replacement })),
      { find: "konva", replacement: path.join(nodeModules, "konva/konva") },
      { find: "keymaster", replacement: path.join(root, "__mocks__/keymaster.js") },
      { find: "react-konva-utils", replacement: path.join(nodeModules, "identity-obj-proxy") },
      { find: "@adobe/css-tools", replacement: path.join(webRoot, "__mocks__/@adobe/css-tools.js") },
      { find: "@humansignal/ui", replacement: path.join(root, "../ui/src/index.ts") },
      { find: "canvas", replacement: path.join(root, "__mocks__/canvas.js") },
      { find: "jest-fetch-mock", replacement: path.join(root, "__mocks__/jest-fetch-mock.js") },
      // Stub CSS and asset imports so they resolve to a single module
      { find: /\.(css|svg|png|jpe?g)(\?.*)?$/, replacement: path.join(root, "__mocks__/styleMock.js") },
    ],
  },
  server: {
    deps: {
      inline: [
        "nanoid",
        "konva",
        "@adobe/css-tools",
        "@humansignal/core",
        "react",
        "react-dom",
        "mobx-react",
        "react-window",
        "antd",
        "mobx-react-lite",
        "json-edit-react",
      ],
    },
  },
});
