/**
 * Emits a Django-compatible manifest.json: maps logical names (e.g. "main.js") to /react-app/<hashed> URLs.
 * Vite's default manifest uses entry file paths as keys; Django templates expect "main.js", "vendor.js", etc.
 */
import type { Plugin } from "vite";
import path from "node:path";
import fs from "node:fs";

const PUBLIC_PATH = "/react-app/";
/** Rollup/Vite [hash] is base64url-style (not hex-only). */
const ROLLUP_HASH = "[A-Za-z0-9_-]+";

const EXCLUDE = [
  /\.map$/,
  /^manifest.*\.js(?:on)?$/,
  /\.LICENSE$/,
  /\.txt$/,
  /\.html$/,
  /\.svg$/,
  /\.wasm$/,
  /sw\.js$/,
];

function shouldInclude(name: string): boolean {
  return EXCLUDE.every((r) => !r.test(name));
}

/**
 * Map Vite/Rollup output filenames to Django `manifest_asset` keys.
 * With `build.cssCodeSplit: false`, CSS is a single `style-[hash].css` shared by entries.
 */
function manifestKeysForFile(filename: string): string[] {
  const base = path.basename(filename);
  const mainJs = new RegExp(`^main-${ROLLUP_HASH}\\.js$`);
  const mainCss = new RegExp(`^main-${ROLLUP_HASH}\\.css$`);
  const styleCss = new RegExp(`^style-${ROLLUP_HASH}\\.css$`);
  const embedJs = new RegExp(`^embed-${ROLLUP_HASH}\\.js$`);
  const embedCss = new RegExp(`^embed-${ROLLUP_HASH}\\.css$`);
  const vendorJs = new RegExp(`^vendor-${ROLLUP_HASH}\\.js$`);
  const vendorCss = new RegExp(`^vendor-${ROLLUP_HASH}\\.css$`);

  if (mainJs.test(base)) return ["main.js"];
  if (mainCss.test(base)) return ["main.css"];
  if (styleCss.test(base)) return ["main.css", "embed.css"];
  if (embedJs.test(base)) return ["embed.js"];
  if (embedCss.test(base)) return ["embed.css"];
  if (vendorJs.test(base)) return ["vendor.js"];
  if (vendorCss.test(base)) return ["vendor.css"];
  return [];
}

export function djangoManifestPlugin(outDir: string): Plugin {
  return {
    name: "django-manifest",
    apply: "build",
    writeBundle(_, bundle) {
      const manifest: Record<string, string> = {};
      for (const [filename, info] of Object.entries(bundle)) {
        if (info.type !== "chunk" && info.type !== "asset") continue;
        if (!shouldInclude(filename)) continue;
        const keys = manifestKeysForFile(filename);
        const url = PUBLIC_PATH + filename;
        for (const key of keys) {
          manifest[key] = url;
        }
      }

      const manifestPath = path.resolve(outDir, "static/js/manifest.json");
      fs.mkdirSync(path.dirname(manifestPath), { recursive: true });
      const payload = JSON.stringify(manifest, null, 0);
      fs.writeFileSync(manifestPath, payload);

      // Copy for Django collectstatic → STATIC_ROOT/js/manifest.json (shared manifest_assets.py contract).
      // Keeps LSO Docker/PyPI flows working without reading from the Vite dist tree at runtime.
      const djangoStaticManifestPath = path.resolve(__dirname, "../label_studio/core/static/js/manifest.json");
      fs.mkdirSync(path.dirname(djangoStaticManifestPath), { recursive: true });
      fs.writeFileSync(djangoStaticManifestPath, payload);
    },
  };
}
