import path from "node:path";
import { createRequire } from "node:module";
import type { AcceptedPlugin } from "postcss";
import { defineConfig, loadEnv } from "vite";
import type { Plugin } from "vite";
import react from "@vitejs/plugin-react";
import svgr from "vite-plugin-svgr";
import postcssNested from "postcss-nested";
import autoprefixer from "autoprefixer";
import tailwindcss from "tailwindcss";
import tailwindConfig from "./tailwind.config.js";
import { CSS_PREFIX, cssModulesGenerateScopedName } from "./vite-prefix-css-module";
import postcssImport from "postcss-import";
import { jsxJsPlugin, optimizeDepsAutomaticJsxPlugin } from "./vite-lib-jsx-plugins";

const require = createRequire(import.meta.url);
loadEnv("", path.resolve(__dirname, "../../../"), "");

const { postcssPrefixLsfClasses, postcssPreProcessGlobalBlocks } = require("./postcss-prefix-lsf.cjs") as {
  postcssPrefixLsfClasses: () => AcceptedPlugin;
  postcssPreProcessGlobalBlocks: () => AcceptedPlugin;
};
const isPlaygroundProd = process.env.MODE === "standalone-playground";

export default defineConfig(({ mode }) => {
  const FRONTEND_HOSTNAME = process.env.FRONTEND_HOSTNAME || "http://localhost:4200";
  const outDir = path.resolve(__dirname, "dist/apps/playground/playground-assets");

  return {
    root: path.resolve(__dirname, "apps/playground/src"),
    base: isPlaygroundProd || mode === "production" ? "/playground-assets/" : "/",
    publicDir: false,
    envDir: path.resolve(__dirname, "../../../"),
    define: {
      global: "globalThis",
      "process.env.CSS_PREFIX": JSON.stringify(CSS_PREFIX),
      "process.env.NODE_ENV": JSON.stringify(mode),
    },
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "apps/playground/src"),
        "apps/playground/src": path.resolve(__dirname, "apps/playground/src"),
        "@humansignal/icons": path.resolve(__dirname, "libs/ui/src/assets/icons/index.ts"),
        "@humansignal/shad": path.resolve(__dirname, "libs/ui/src/shad"),
        "@humansignal/ui/lib": path.resolve(__dirname, "libs/ui/src/lib"),
        "@humansignal/ui/shad": path.resolve(__dirname, "libs/ui/src/shad"),
        "@humansignal/ui/fonts": path.resolve(__dirname, "libs/ui/src/fonts"),
        "@humansignal/ui": path.resolve(__dirname, "libs/ui"),
        "@humansignal/core/telemetry": path.resolve(__dirname, "libs/core/src/telemetry"),
        "@humansignal/core/providers": path.resolve(__dirname, "libs/core/src/providers"),
        "@humansignal/core/lib": path.resolve(__dirname, "libs/core/src/lib"),
        "@humansignal/core/hooks": path.resolve(__dirname, "libs/core/src/hooks"),
        "@humansignal/core": path.resolve(__dirname, "libs/core"),
        "@humansignal/app-common": path.resolve(__dirname, "libs/app-common/src"),
        "@humansignal/editor": path.resolve(__dirname, "libs/editor/src/index.js"),
        "../../../../design-tokens.json": path.resolve(__dirname, "design-tokens.json"),
      },
      extensions: [".ts", ".tsx", ".mjs", ".js", ".jsx", ".json"],
    },
    css: {
      devSourcemap: true,
      modules: {
        generateScopedName: cssModulesGenerateScopedName,
      },
      postcss: {
        plugins: [
          postcssImport(),
          postcssPreProcessGlobalBlocks(),
          postcssNested(),
          postcssPrefixLsfClasses(),
          tailwindcss({ config: tailwindConfig }),
          autoprefixer(),
        ],
      },
    },
    build: {
      cssCodeSplit: false,
      target: "esnext",
      outDir,
      emptyOutDir: true,
      sourcemap: mode === "production",
      cssMinify: "esbuild",
      rollupOptions: {
        input: path.resolve(__dirname, "apps/playground/src/index.html"),
      },
      chunkSizeWarningLimit: 2000,
    },
    plugins: [
      jsxJsPlugin(),
      react(),
      svgr({
        include: ["**/libs/ui/**/*.svg", "**/apps/playground/**/*.svg"],
        svgrOptions: { ref: true, exportType: "named", namedExport: "ReactComponent", svgo: false },
      }),
    ],
    server: {
      port: 4200,
      host: "::",
      strictPort: true,
      cors: true,
      origin: FRONTEND_HOSTNAME,
      fs: {
        allow: [path.resolve(__dirname)],
      },
    },
    optimizeDeps: {
      include: [
        "react",
        "react-dom",
        "react/jsx-runtime",
        "react/jsx-dev-runtime",
        "react-router-dom",
        "mobx",
        "mobx-react",
        "mobx-state-tree",
      ],
      rolldownOptions: {
        plugins: [optimizeDepsAutomaticJsxPlugin() as Plugin],
      },
    },
    assetsInclude: ["**/*.xml"],
  };
});
