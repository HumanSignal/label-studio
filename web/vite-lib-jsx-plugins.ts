import { readFile, stat } from "node:fs/promises";
import * as esbuild from "esbuild";
import type { Plugin } from "vite";

function pathLooksLikeLsoLibJs(id: string): boolean {
  const n = id.replace(/\\/g, "/");
  if (!/\.js$/.test(n)) return false;
  if (n.includes("/node_modules/")) return false;
  // Must match any checkout location (`/opt/build/repo` on Netlify, arbitrary CI
  // paths), not just working copies named `lso` or `label-studio`.
  return /\/web\/libs\//.test(n);
}

function looksLikeJsxInJsSource(code: string): boolean {
  if (!code.includes("<")) return false;
  if (/<>\s*<\/?/.test(code) || /<\/>/.test(code)) return true;
  if (/<\/[A-Za-z][\w.]*\s*>/.test(code)) return true;
  if (/\breturn\s*(?:\(\s*)?<[A-Za-z_]/.test(code)) return true;
  if (/=>[\s\n]*<[A-Za-z_]/.test(code)) return true;
  if (/<[A-Z][\w.]*(?:\s|\/>|>|\{)/.test(code)) return true;
  if (/\(\s*<[a-zA-Z]/.test(code)) return true;
  return false;
}

function transformJsWithAutomaticJsx(code: string, sourcefile: string): { code: string; map?: string } | null {
  try {
    const result = esbuild.transformSync(code, {
      loader: "jsx",
      sourcefile,
      jsx: "automatic",
      jsxImportSource: "react",
      sourcemap: true,
      sourcesContent: false,
    });
    if (!result.code) return null;
    return { code: result.code, map: result.map };
  } catch {
    return null;
  }
}

/** Transform `.js` files under `libs/` that contain JSX (automatic JSX runtime). */
export function jsxJsPlugin() {
  return {
    name: "jsx-js",
    enforce: "pre" as const,
    transform(code: string, id: string) {
      if (!pathLooksLikeLsoLibJs(id)) return null;
      if (!looksLikeJsxInJsSource(code)) return null;
      const out = transformJsWithAutomaticJsx(code, id);
      return out ? { code: out.code, map: out.map } : null;
    },
  };
}

/**
 * Pre-bundle: never use `loader: "jsx"` alone (classic transform → `React is not defined`).
 * Emit plain JS + jsx-runtime imports.
 */
export function optimizeDepsAutomaticJsxPlugin(): Plugin {
  const maxBytes = 1_500_000;
  return {
    name: "optimize-deps-jsx-automatic",
    async load(id) {
      if (!id.endsWith(".js")) return null;
      const p = id.replace(/\\/g, "/");
      const inNodeModules = p.includes("/node_modules/");
      const inLsoLibs = p.includes("/web/libs/");
      if (!inNodeModules && !inLsoLibs) return null;

      try {
        const st = await stat(id);
        if (st.size > maxBytes || st.size === 0) return null;
      } catch {
        return null;
      }

      let contents: string;
      try {
        contents = await readFile(id, "utf-8");
      } catch {
        return null;
      }
      if (!contents.includes("<")) return null;

      const out = transformJsWithAutomaticJsx(contents, id);
      return out ? { code: out.code, map: out.map } : null;
    },
  };
}
