import fs from "node:fs";
import path from "node:path";
import { defineConfig } from "vitest/config";
import { transform as esbuildTransform } from "esbuild";
import { baseAlias } from "../../vitest.base";

const root = __dirname;
const webRoot = path.join(root, "../..");
const nodeModules = path.join(webRoot, "node_modules");
const editorSrc = path.join(root, "src");

const perRegionModesJs = path.join(editorSrc, "mixins/PerRegionModes.js");
const styleMockJs = path.resolve(root, "__mocks__", "styleMock.js");
const VIRTUAL_CSS_ID = "\0editor-style-mock";
const VIRTUAL_SVG_ID = "\0editor-svg-mock";
const coreRegistryTs = path.join(editorSrc, "core/Registry.ts");
const coreHelpersTs = path.join(editorSrc, "core/Helpers.ts");
const coreRegistryJs = path.join(editorSrc, "core/Registry.js");
const coreHelpersJs = path.join(editorSrc, "core/Helpers.js");
const coreHotkeyTs = path.join(editorSrc, "core/Hotkey.ts");
const coreHotkeyJs = path.join(editorSrc, "core/Hotkey.js");
const coreCustomTypesTs = path.join(editorSrc, "core/CustomTypes.ts");
const utilsUtilitiesTs = path.join(editorSrc, "utils/utilities.ts");
const utilsUtilitiesJs = path.join(editorSrc, "utils/utilities.js");
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
      },
    },
    {
      name: "editor-resolve-modules",
      enforce: "pre",
      resolveId(id: string, importer?: string) {
        const n = id.replace(/\\/g, "/");
        if (n.endsWith("/Registry") || n === "Registry" || n.endsWith("core/Registry")) return coreRegistryJs;
        if (n.endsWith("/Helpers") || n === "Helpers" || n.endsWith("core/Helpers")) return coreHelpersJs;
        if (n.endsWith("/Hotkey") || n === "Hotkey" || n.endsWith("core/Hotkey")) return coreHotkeyJs;
        if (n.endsWith("/CustomTypes") || n === "CustomTypes" || n.endsWith("core/CustomTypes")) return coreCustomTypesTs;
        if (n.endsWith("/utilities") || (n === "utilities" && importer?.replace(/\\/g, "/").includes("utils"))) return utilsUtilitiesJs;
        let absPath: string | null = null;
        if (id.startsWith("/") || /^[A-Za-z]:/.test(id)) {
          absPath = path.normalize(id);
        } else if (importer) {
          absPath = path.normalize(path.join(path.dirname(importer), id));
        }
        if (absPath && absPath.startsWith(editorSrc) && !path.extname(absPath)) {
          for (const ext of [".js", ".ts", ".tsx", ".jsx"]) {
            if (fs.existsSync(absPath + ext)) return absPath + ext;
          }
        }
        return null;
      },
      transform(code: string, id: string) {
        // Rewrite extensionless relative imports in .js files so they resolve
        // even when loaded outside Vite (e.g. via require() in tests)
        if (!id.endsWith(".js") || !id.replace(/\\/g, "/").includes(editorSrc.replace(/\\/g, "/"))) return null;
        const dir = path.dirname(id);
        const importRe = /((?:from|import)\s*['"])(\.\.?\/[^'"]+)(['"])/g;
        let result = code;
        let changed = false;
        result = code.replace(importRe, (full, prefix, specifier, quote) => {
          if (path.extname(specifier)) return full;
          const abs = path.resolve(dir, specifier);
          for (const ext of [".js", ".ts", ".tsx", ".jsx"]) {
            if (fs.existsSync(abs + ext)) {
              changed = true;
              return prefix + specifier + ext + quote;
            }
          }
          return full;
        });
        return changed ? { code: result, map: null } : null;
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
            defaultImport ? `import ${defaultImport.trim()} "${VIRTUAL_CSS_ID}";` : `import "${VIRTUAL_CSS_ID}";`)
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
    {
      name: "editor-jsx-in-js",
      enforce: "pre",
      async transform(code: string, id: string) {
        if (!id.endsWith(".js")) return null;
        if (!id.includes(editorSrc) && !id.includes("/libs/editor/")) return null;
        if (id.includes("node_modules")) return null;
        if (!code.includes("<") || !/< *[A-Z]|<\/|< *[a-z]+[\s>]/.test(code)) return null;
        const result = await esbuildTransform(code, { loader: "jsx", jsx: "automatic", sourcefile: id });
        return { code: result.code, map: result.map || null };
      },
    },
    {
      name: "editor-resolve-perregionmodes",
      enforce: "pre",
      resolveId(id: string, importer?: string) {
        const norm = (p: string) => p.replace(/\\/g, "/");
        const normId = norm(id);
        // Absolute path without extension (e.g. from Node/worker)
        if (normId === norm(path.join(editorSrc, "mixins/PerRegionModes")) || normId.endsWith("mixins/PerRegionModes")) {
          return perRegionModesJs;
        }
        if (importer && (id === "./PerRegionModes" || id === "PerRegionModes" || id.endsWith("/PerRegionModes"))) {
          if (norm(importer).includes("mixins") || norm(importer).includes("OutlinerPanel")) {
            return perRegionModesJs;
          }
        }
        if (id === "../../../mixins/PerRegionModes" || id.endsWith("mixins/PerRegionModes")) {
          return perRegionModesJs;
        }
        return null;
      },
    },
  ],
  test: {
    environment: "jsdom",
    globals: true,
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
        "**/node_modules/**",
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
      { find: "konva", replacement: path.join(nodeModules, "konva/konva") },
      { find: "keymaster", replacement: noOpModuleStub },
      { find: "react-konva-utils", replacement: noOpModuleStub },
      { find: "jest-fetch-mock", replacement: noOpModuleStub },
      // CSS/SVG/images are handled by the editor-stub-css plugin's resolveId — no regex alias needed
      { find: "@adobe/css-tools", replacement: path.join(webRoot, "__mocks__/@adobe/css-tools.js") },
      { find: "@humansignal/ui", replacement: path.join(root, "../ui/src/index.ts") },
      // PerRegionModes: force .js
      { find: path.join(editorSrc, "mixins/PerRegionModes"), replacement: path.join(editorSrc, "mixins/PerRegionModes.js") },
      // Core/utils: exact-match string aliases for common relative depths
      // (the resolveId plugin handles all other depths as fallback)
      { find: "../../core/Registry", replacement: coreRegistryJs },
      { find: "../core/Registry", replacement: coreRegistryJs },
      { find: "../../core/Helpers", replacement: coreHelpersJs },
      { find: "../core/Helpers", replacement: coreHelpersJs },
      { find: "./utilities", replacement: utilsUtilitiesJs },
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
        "react/jsx-runtime",
        "antd",
        "mobx-react",
        "mobx-react-lite",
      ],
    },
  },
});
