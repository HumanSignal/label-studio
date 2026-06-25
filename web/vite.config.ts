import path from "node:path";
import { createRequire } from "node:module";
import type { AcceptedPlugin } from "postcss";
import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import svgr from "vite-plugin-svgr";
import { djangoManifestPlugin } from "./vite-manifest-plugin";
import postcssNested from "postcss-nested";
import autoprefixer from "autoprefixer";
import tailwindcss from "tailwindcss";
import tailwindConfig from "./tailwind.config.js";
import { CSS_PREFIX, cssModulesGenerateScopedName } from "./vite-prefix-css-module";
import postcssImport from "postcss-import";
import { jsxJsPlugin, optimizeDepsAutomaticJsxPlugin } from "./vite-lib-jsx-plugins";

const codemirrorDedupe = [
  "@codemirror/state",
  "@codemirror/view",
  "@codemirror/language",
  "@uiw/react-codemirror",
] as const;

/**
 * Enforces the loading order of global stylesheets (Tailwind reset/utilities and core variables).
 * By explicitly injecting these at the very top of the entrypoint modules within the build system,
 * we eliminate fragility and "hidden" implicit import order requirements inside React components.
 */
function enforceGlobalCssOrderPlugin(): import("vite").Plugin {
  return {
    name: "enforce-global-css-order",
    enforce: "pre",
    transform(code, id) {
      const posixId = id.replace(/\\/g, "/");

      if (posixId.endsWith("apps/labelstudio/src/main.tsx")) {
        const cleanCode = code
          .replace(/import ['"]@humansignal\/ui\/src\/tailwind\.css['"];?\n?/g, "")
          .replace(/import ['"]\.\/app\/App\.prefix\.css['"];?\n?/g, "");
        return `import "@humansignal/ui/src/tailwind.css";\nimport "./app/App.prefix.css";\n` + cleanCode;
      }
      return null;
    },
  };
}

const require = createRequire(import.meta.url);
loadEnv("", path.resolve(__dirname, "../../../"), "");

const release = require("./release");
const { postcssPrefixLsfClasses, postcssPreProcessGlobalBlocks } = require("./postcss-prefix-lsf.cjs") as {
  postcssPrefixLsfClasses: () => AcceptedPlugin;
  postcssPreProcessGlobalBlocks: () => AcceptedPlugin;
};

export default defineConfig(({ mode }) => {
  const FRONTEND_HOSTNAME = process.env.FRONTEND_HOSTNAME || "http://localhost:8010";
  const DJANGO_HOSTNAME = process.env.DJANGO_HOSTNAME || "http://localhost:8080";
  const outDir = path.resolve(__dirname, "dist/apps/labelstudio");

  return {
    root: path.resolve(__dirname, "apps/labelstudio/src"),
    base: "/react-app/",
    publicDir: false,
    envDir: path.resolve(__dirname, "../../../"),
    define: {
      global: "globalThis",
      "process.env.CSS_PREFIX": JSON.stringify(CSS_PREFIX),
      "process.env.BUILD_NO_SERVER": JSON.stringify(process.env.BUILD_NO_SERVER ?? ""),
      "process.env.NODE_ENV": JSON.stringify(mode),
      "process.env.RELEASE_NAME": JSON.stringify(
        (() => {
          try {
            return release.getReleaseName() ?? "unknown";
          } catch {
            return "unknown";
          }
        })(),
      ),
    },
    resolve: {
      alias: [
        { find: /^libs\//, replacement: `${path.resolve(__dirname, "libs")}/` },
        {
          find: /^@\//,
          replacement: `${path.resolve(__dirname, "apps/labelstudio/src")}/`,
        },
        {
          find: "apps/labelstudio/src",
          replacement: path.resolve(__dirname, "apps/labelstudio/src"),
        },
        {
          find: "@humansignal/icons",
          replacement: path.resolve(__dirname, "libs/ui/src/assets/icons/index.ts"),
        },
        {
          find: "@humansignal/shad",
          replacement: path.resolve(__dirname, "libs/ui/src/shad"),
        },
        {
          find: "@humansignal/ui/lib",
          replacement: path.resolve(__dirname, "libs/ui/src/lib"),
        },
        {
          find: "@humansignal/ui/shad",
          replacement: path.resolve(__dirname, "libs/ui/src/shad"),
        },
        {
          find: "@humansignal/ui/fonts",
          replacement: path.resolve(__dirname, "libs/ui/src/fonts"),
        },
        {
          find: "@humansignal/ui",
          replacement: path.resolve(__dirname, "libs/ui"),
        },
        {
          find: "@humansignal/core/providers",
          replacement: path.resolve(__dirname, "libs/core/src/providers"),
        },
        {
          find: "@humansignal/core/lib",
          replacement: path.resolve(__dirname, "libs/core/src/lib"),
        },
        {
          find: "@humansignal/core/hooks",
          replacement: path.resolve(__dirname, "libs/core/src/hooks"),
        },
        {
          find: "@humansignal/core",
          replacement: path.resolve(__dirname, "libs/core"),
        },
        {
          find: "@humansignal/app-common",
          replacement: path.resolve(__dirname, "libs/app-common/src"),
        },
        {
          find: "@humansignal/datamanager",
          replacement: path.resolve(__dirname, "libs/datamanager/src/index.js"),
        },
        {
          find: "@humansignal/editor",
          replacement: path.resolve(__dirname, "libs/editor/src/index.js"),
        },
        {
          find: "@humansignal/frontend-test",
          replacement: path.resolve(__dirname, "libs/frontend-test/src"),
        },
        {
          find: "../../../../design-tokens.json",
          replacement: path.resolve(__dirname, "design-tokens.json"),
        },
      ],
      dedupe: [...codemirrorDedupe],
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
        input: {
          main: path.resolve(__dirname, "apps/labelstudio/src/index.html"),
        },
        output: {
          entryFileNames: "[name]-[hash].js",
          chunkFileNames: "[name]-[hash].js",
          assetFileNames: "[name]-[hash][extname]",
          manualChunks(id) {
            const vendorLibs =
              /[\\/]node_modules[\\/](react|react-dom|react-router|react-router-dom|mobx|mobx-react|mobx-react-lite|mobx-state-tree)[\\/]/;
            if (vendorLibs.test(id)) return "vendor";
            const bigVendor =
              /[\\/]node_modules[\\/](@radix-ui|@tanstack|antd|chart\.js|codemirror|d3|jotai|konva|react-chartjs|react-markdown|rehype|remark|tailwindcss|unified)[\\/]/;
            if (bigVendor.test(id)) return "vendor";
          },
        },
      },
      chunkSizeWarningLimit: 2000,
    },
    plugins: [
      enforceGlobalCssOrderPlugin(),
      jsxJsPlugin(),
      react(),
      svgr({
        include: ["**/libs/ui/**/*.svg", "**/apps/labelstudio/**/*.svg"],
        svgrOptions: { ref: true, exportType: "named", namedExport: "ReactComponent", svgo: false },
      }),
      djangoManifestPlugin(outDir),
    ],
    server: {
      port: 8010,
      host: "::",
      strictPort: true,
      cors: true,
      origin: FRONTEND_HOSTNAME,
      headers: {
        "Cross-Origin-Resource-Policy": "cross-origin",
      },
      proxy: {
        "/api": { target: DJANGO_HOSTNAME, changeOrigin: true },
        "/static": { target: DJANGO_HOSTNAME, changeOrigin: true },
      },
      fs: {
        allow: [path.resolve(__dirname), path.resolve(__dirname, "../..")],
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
        "@phosphor-icons/react",
      ],
      rolldownOptions: {
        plugins: [optimizeDepsAutomaticJsxPlugin() as any],
      },
    },
    assetsInclude: ["**/*.xml"],
  };
});
