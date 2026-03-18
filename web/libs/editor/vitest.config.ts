import fs from "node:fs";
import path from "node:path";
import { defineConfig } from "vitest/config";
import { baseAlias } from "../../vitest.base";

// Tests expect the default "ls-" BEM prefix. Ensure no inherited env overrides it.
delete process.env.CSS_PREFIX;

const root = __dirname;
const webRoot = path.join(root, "../..");
const nodeModules = path.join(webRoot, "node_modules");
const editorSrc = path.join(root, "src");

const styleMockJs = path.resolve(root, "__mocks__", "styleMock.js");
const VIRTUAL_CSS_ID = "\0editor-style-mock";
const VIRTUAL_SVG_ID = "\0editor-svg-mock";
const antDesignIconsStub = path.resolve(root, "__mocks__", "ant-design-icons.js");
const noOpModuleStub = path.resolve(root, "__mocks__", "no-op-module.js");

export default defineConfig({
  root,
  plugins: [
    {
      name: "editor-force-single-react",
      buildStart() {
        // Ensure editor-local react/mobx-react copies don't shadow the workspace ones.
        // CJS require("react") inside editor/node_modules always resolves locally,
        // bypassing Vite aliases — the only fix is to remove the local copies so
        // Node falls through to web/node_modules/react (same instance as react-dom).
        const editorNM = path.join(root, "node_modules");
        for (const pkg of ["react", "mobx-react", "mobx-react-lite"]) {
          const local = path.join(editorNM, pkg);
          const backup = path.join(editorNM, `.${pkg}-backup`);
          if (fs.existsSync(local) && !fs.existsSync(backup)) {
            fs.renameSync(local, backup);
          }
        }

        // Force konva to resolve to its browser entry even under Node's native CJS resolver.
        // konva ships main:"./cmj/index-node.js" which does require("canvas") — a native
        // addon we don't install. Rewriting main to the browser field avoids this entirely.
        const konvaPkgPath = path.join(nodeModules, "konva/package.json");
        const konvaPkg = JSON.parse(fs.readFileSync(konvaPkgPath, "utf8"));
        if (konvaPkg.main !== konvaPkg.browser) {
          konvaPkg.main = konvaPkg.browser;
          fs.writeFileSync(konvaPkgPath, JSON.stringify(konvaPkg, null, 2));
        }
      },
    },
    {
      name: "editor-stub-css",
      enforce: "pre",
      resolveId(id: string) {
        if (id === VIRTUAL_CSS_ID || id === VIRTUAL_SVG_ID) {
          return id;
        }
        if (id.endsWith(".css")) {
          return styleMockJs;
        }
        if (id.endsWith(".svg") || id.endsWith(".png") || id.endsWith(".jpg") || id.endsWith(".jpeg")) {
          return VIRTUAL_SVG_ID;
        }
        return null;
      },
      transform(code: string, id: string) {
        // Minimal: .prefix.css, .module.css, .svg in editor only. Avoid rewriting plain .css to limit regressions.
        const isEditorSource = id.includes(editorSrc) || id.includes(root.replace(/\\/g, "/"));
        if (!isEditorSource || id.includes("node_modules")) return null;
        if (!id.endsWith(".tsx") && !id.endsWith(".ts") && !id.endsWith(".jsx") && !id.endsWith(".js")) return null;
        let newCode = code
          .replace(/import\s+['"][^'"]*\.prefix\.css['"]\s*;?/g, `import "${VIRTUAL_CSS_ID}";`)
          .replace(/import\s+(\w+\s+from\s+)?['"][^'"]*\.module\.css['"]\s*;?/g, (_m, defaultImport) =>
            defaultImport ? `import ${defaultImport.trim()} "${VIRTUAL_CSS_ID}";` : `import "${VIRTUAL_CSS_ID}";`,
          )
          .replace(/from\s+['"][^'"]*\.svg['"]/g, `from "${VIRTUAL_SVG_ID}"`);
        return newCode !== code ? { code: newCode, map: null } : null;
      },
      load(id: string) {
        if (id === VIRTUAL_CSS_ID) {
          return "export default new Proxy({}, { get: (_, k) => k })";
        }
        if (id === VIRTUAL_SVG_ID) {
          return "import React from 'react'; export const ReactComponent = () => null; export default '';";
        }
        return null;
      },
    },
  ],
  test: {
    onConsoleLog(log: string) {
      const suppressPatterns = [
        "Warning:",
        "inside a test was not wrapped in act",
        "whole package of antd",
        "reactive render of an observer class component",
        "needs to implement",
        "Error checking selected labels",
        "TimeSeries: timeFormat contains",
        "ColorMapper: Cached colormap",
        "An audio loading error occurred",
        "Task cannot be skipped",
        "Cannot read properties of undefined",
        "[mobx-state-tree]",
        "[mobx.array]",
        "is deprecated",
        "image.decode is not a function",
        "500 Server Error",
        "getaddrinfo ENOTFOUND",
        "not available when decoder",
        "splitChannels is not available",
        "dispatchError",
      ];
      if (suppressPatterns.some((p) => log.includes(p))) return false;
    },
    pool: "forks",
    environment: "jsdom",
    globals: true,
    setupFiles: [path.join(root, "vitest.setup.ts")],
    include: ["src/**/*.test.{ts,tsx,js,jsx}"],
    exclude: ["**/node_modules/**", "**/e2e/**", "**/renderEditor.test.{ts,tsx,js,jsx}"],
    coverage: {
      provider: "v8",
      reportsDirectory: path.join(webRoot, "coverage"),
      reporter: ["json", "lcov"],
      include: ["src/**/*.{ts,tsx,js,jsx}"],
      exclude: ["**/__mocks__/**", "**/*.d.ts", "**/node_modules/**", "**/examples/**", "**/SplitChannel.ts"],
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
    dedupe: ["react", "react-dom", "react/jsx-runtime"],
    alias: [
      // Single React instance: force ALL React-using libs to workspace copies
      // so require("react") inside them resolves to web/node_modules/react (same as react-dom)
      { find: "react", replacement: path.join(nodeModules, "react") },
      { find: "react-dom", replacement: path.join(nodeModules, "react-dom") },
      { find: "mobx-react-lite", replacement: path.join(nodeModules, "mobx-react-lite") },
      { find: "mobx-react", replacement: path.join(nodeModules, "mobx-react") },
      // Stub icons so no second React from @ant-design/icons (physical file, no Proxy)
      { find: "@ant-design/icons", replacement: antDesignIconsStub },
      ...Object.entries(baseAlias).map(([find, replacement]) => ({ find, replacement })),
      { find: /^konva$/, replacement: path.join(nodeModules, "konva/lib/index.js") },
      { find: "keymaster", replacement: noOpModuleStub },
      { find: "react-konva-utils", replacement: noOpModuleStub },
      { find: "@adobe/css-tools", replacement: path.join(webRoot, "__mocks__/@adobe/css-tools.js") },
      { find: "@humansignal/ui", replacement: path.join(root, "../ui/src/index.ts") },
    ],
  },
  server: {
    deps: {
      inline: [],
    },
  },
});
