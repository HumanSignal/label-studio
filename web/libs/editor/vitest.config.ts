import path from "node:path";
import { defineProject } from "vitest/config";
import { baseAlias } from "../../vitest.base";

const root = __dirname;
const webRoot = path.join(root, "../..");
const nodeModules = path.join(webRoot, "node_modules");
const coreSrc = path.resolve(webRoot, "libs/core/src");

export default defineProject({
  root,
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
    alias: [
      { find: "@humansignal/core", replacement: coreSrc },
      ...Object.entries(baseAlias).map(([find, replacement]) => ({ find, replacement })),
      { find: "konva", replacement: path.join(nodeModules, "konva/konva") },
      { find: "keymaster", replacement: path.join(root, "__mocks__/keymaster.js") },
      { find: "react-konva-utils", replacement: path.join(nodeModules, "identity-obj-proxy") },
      { find: "@adobe/css-tools", replacement: path.join(webRoot, "__mocks__/@adobe/css-tools.js") },
      { find: "@humansignal/ui", replacement: path.join(root, "../ui/src/index.ts") },
      { find: "canvas", replacement: path.join(root, "__mocks__/canvas.js") },
      // Stub CSS and asset imports so they resolve to a single module
      { find: /\.(css|svg|png|jpe?g)(\?.*)?$/, replacement: path.join(root, "__mocks__/styleMock.js") },
    ],
  },
  server: {
    deps: {
      inline: ["nanoid", "konva", "@adobe/css-tools", "@humansignal/core"],
    },
  },
});
