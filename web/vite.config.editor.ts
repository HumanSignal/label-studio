import path from "node:path";
import { cpSync, existsSync } from "node:fs";
import { createRequire } from "node:module";
import type { AcceptedPlugin } from "postcss";
import { type UserConfig, defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import svgr from "vite-plugin-svgr";
import postcssNested from "postcss-nested";
import autoprefixer from "autoprefixer";
import tailwindcss from "tailwindcss";
import tailwindConfig from "./tailwind.config.js";
import { CSS_PREFIX, cssModulesGenerateScopedName } from "./vite-prefix-css-module";
import postcssImport from "postcss-import";
import { jsxJsPlugin } from "./vite-lib-jsx-plugins";

const require = createRequire(import.meta.url);
loadEnv("", path.resolve(__dirname, "../../../"), "");

const { postcssPrefixLsfClasses, postcssPreProcessGlobalBlocks } = require("./postcss-prefix-lsf.cjs") as {
  postcssPrefixLsfClasses: () => AcceptedPlugin;
  postcssPreProcessGlobalBlocks: () => AcceptedPlugin;
};

/**
 * Webpack served the `public/` directory as a regular path on disk, so tests
 * reference assets at `/public/files/...`. Vite strips the `publicDir` prefix,
 * serving those same assets at `/files/...`. This plugin restores the old URLs:
 *
 *  - Dev / preview servers: rewrites `/public/…` → `/…` before Vite's static middleware.
 *  - Production build: copies `publicDir` into `<outDir>/public/` so static
 *    file servers (e.g. `serve`) resolve `/public/files/…` from disk.
 */
function publicPathCompatPlugin(publicDirAbs: string, outDirAbs: string) {
  function rewriteUrl(req: { url?: string }, _res: unknown, next: () => void) {
    if (req.url?.startsWith("/public/")) {
      req.url = req.url.slice("/public".length);
    }
    next();
  }

  return {
    name: "public-path-compat",
    configureServer(server: { middlewares: { use: (fn: typeof rewriteUrl) => void } }) {
      server.middlewares.use(rewriteUrl);
    },
    configurePreviewServer(server: { middlewares: { use: (fn: typeof rewriteUrl) => void } }) {
      server.middlewares.use(rewriteUrl);
    },
    closeBundle() {
      if (existsSync(publicDirAbs)) {
        cpSync(publicDirAbs, path.join(outDirAbs, "public"), { recursive: true });
      }
    },
  };
}

export default defineConfig(async ({ mode }): Promise<UserConfig> => {
  const FRONTEND_HOSTNAME = process.env.FRONTEND_HOSTNAME || "http://localhost:3000";
  const outDir = path.resolve(__dirname, "dist/libs/editor");
  const editorPublicDir = path.resolve(__dirname, "libs/editor/public");
  const instrumentCoverage = process.env.BABEL_ENV === "test";
  const istanbul = instrumentCoverage ? (await import("vite-plugin-istanbul")).default : undefined;

  return {
    root: path.resolve(__dirname, "libs/editor"),
    base: "/",
    publicDir: "public",
    envDir: path.resolve(__dirname, "../../../"),
    define: {
      global: "globalThis",
      "process.env.CSS_PREFIX": JSON.stringify(CSS_PREFIX),
      "process.env.NODE_ENV": JSON.stringify(mode),
    },
    resolve: {
      alias: {
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
        input: path.resolve(__dirname, "libs/editor/index.html"),
      },
      chunkSizeWarningLimit: 2000,
    },
    plugins: [
      publicPathCompatPlugin(editorPublicDir, outDir),
      jsxJsPlugin(),
      react(),
      svgr({
        include: ["**/libs/ui/**/*.svg", "**/libs/editor/**/*.svg"],
        svgrOptions: { ref: true, exportType: "named", namedExport: "ReactComponent", svgo: false },
      }),
      ...(istanbul
        ? [
            istanbul({
              cwd: path.resolve(__dirname, "libs/editor"),
              forceBuildInstrument: true,
            }),
          ]
        : []),
    ],
    server: {
      port: 3000,
      host: "::",
      strictPort: true,
      cors: true,
      origin: FRONTEND_HOSTNAME,
      fs: {
        allow: [path.resolve(__dirname)],
      },
    },
    optimizeDeps: {},
    assetsInclude: ["**/*.xml"],
  };
});
