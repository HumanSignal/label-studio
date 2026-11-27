/**
 * Build the production service worker:
 * 1) workbox injectManifest — precache list from dist (hashed Vite assets)
 * 2) esbuild bundle — resolve `workbox-*` imports (browsers cannot load bare imports from /sw.js)
 *
 * Precache URLs must use the /react-app/ prefix (nginx `location /react-app/` → dist).
 */
import * as esbuild from "esbuild";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { injectManifest } from "workbox-build";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const webRoot = path.resolve(__dirname, "..");
const outDir = path.resolve(webRoot, "dist/apps/labelstudio");
const swSrc = path.join(webRoot, "apps/labelstudio/sw.js");
const unbundledPath = path.join(outDir, "static/js/sw.unbundled.js");
const swDest = path.join(outDir, "static/js/sw.js");

async function main() {
  if (!fs.existsSync(outDir)) {
    console.error("[service-worker] dist not found; run the Vite app build first:", outDir);
    process.exit(1);
  }
  if (!fs.existsSync(swSrc)) {
    console.error("[service-worker] missing source:", swSrc);
    process.exit(1);
  }

  const { count, size, warnings } = await injectManifest({
    swSrc,
    swDest: unbundledPath,
    globDirectory: outDir,
    maximumFileSizeToCacheInBytes: 8 * 1024 * 1024,
    globPatterns: ["**/*.{js,css,html,ico,png,svg,woff2}"],
    globIgnores: [
      "**/sw.js",
      "**/sw.unbundled.js",
      "**/*.map",
      "**/manifest*.json",
      "**/*.LICENSE",
      "**/*.txt",
      "**/*.wasm",
    ],
    manifestTransforms: [
      async (entries) => ({
        manifest: entries.map((e) => ({
          ...e,
          url: e.url.startsWith("/react-app/") ? e.url : `/react-app/${e.url.replace(/^\//, "")}`,
        })),
        warnings: [],
      }),
    ],
  });

  for (const w of warnings) {
    console.warn("[workbox]", w);
  }

  await esbuild.build({
    absWorkingDir: webRoot,
    entryPoints: [unbundledPath],
    bundle: true,
    platform: "browser",
    format: "iife",
    target: ["es2022"],
    outfile: swDest,
    logLevel: "info",
    minify: true,
    sourcemap: true,
  });

  try {
    fs.unlinkSync(unbundledPath);
  } catch {
    /* ignore */
  }
  try {
    fs.unlinkSync(`${unbundledPath}.map`);
  } catch {
    /* ignore */
  }

  const djangoStaticSwPath = path.resolve(webRoot, "../label_studio/core/static/js/sw.js");
  fs.mkdirSync(path.dirname(djangoStaticSwPath), { recursive: true });

  fs.copyFileSync(swDest, djangoStaticSwPath);
  if (fs.existsSync(`${swDest}.map`)) {
    fs.copyFileSync(`${swDest}.map`, `${djangoStaticSwPath}.map`);
  }

  console.log(`[service-worker] precached ${count} entries (~${size} bytes manifest payload)`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
