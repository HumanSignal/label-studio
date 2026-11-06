/**
 * The structural half of `ds:check`, generalised from the interface-components conformance test:
 * colour literals, unknown tokens, legacy icons, and imports the design system replaces or forbids.
 * The JSX half (raw controls, inline style tokens, prop rules) lives in the Biome plugins.
 */
import fs from "node:fs";
import path from "node:path";
import type { Finding, ManifestSlice } from "./types";

export type ScanContext = {
  webRoot: string;
  tokenNames: Set<string>;
  replaced: { key: string; isDir: boolean; component: string }[];
  deprecated: Map<string, string>;
  /** Source of `<dir>/index.*` when `dir` is a barrel, else null. */
  readBarrel: (absDir: string) => string | null;
  barrels: Map<string, Map<string, string>>;
};

const BARREL_INDEX = ["index.ts", "index.tsx", "index.js", "index.jsx"];

function defaultReadBarrel(absDir: string): string | null {
  for (const name of BARREL_INDEX) {
    const candidate = path.join(absDir, name);
    if (fs.existsSync(candidate)) return fs.readFileSync(candidate, "utf-8");
  }
  return null;
}

const SOURCE_EXT = /\.(tsx?|jsx?)$/;
const STYLE_EXT = /\.s?css$/;

const stripExt = (p: string) => p.replace(/\.(tsx?|jsx?|s?css)$/, "");
const stripIndex = (p: string) => p.replace(/\/index$/, "");
const normal = (p: string) => stripIndex(stripExt(p));

export function buildContext({
  repoRoot,
  webRoot,
  tokenNames,
  manifest,
  isDirectory = (abs) => fs.existsSync(abs) && fs.statSync(abs).isDirectory(),
  readBarrel = defaultReadBarrel,
}: {
  repoRoot: string;
  webRoot: string;
  tokenNames: Set<string>;
  manifest: ManifestSlice;
  isDirectory?: (abs: string) => boolean;
  readBarrel?: (absDir: string) => string | null;
}): ScanContext {
  const replaced: ScanContext["replaced"] = [];
  const deprecated = new Map<string, string>();
  for (const entry of Object.values(manifest.components)) {
    if (entry.deprecated) for (const name of entry.exports) deprecated.set(name, entry.deprecated.replaced_by);
    for (const target of entry.replaces) {
      if (target.startsWith("jsx:") || target.startsWith("css:")) continue;
      const abs = path.join(repoRoot, target);
      replaced.push({ key: normal(abs), isDir: isDirectory(abs), component: entry.name });
    }
  }
  return { webRoot, tokenNames, replaced, deprecated, readBarrel, barrels: new Map() };
}

/** Token names declared in `tokens.prefix.css`, including the unprefixed form components reference. */
export function loadTokenNames(tokensCss: string): Set<string> {
  const names = new Set<string>();
  for (const match of scannableCss(tokensCss).matchAll(/(--[\w-]+)\s*:/g)) {
    names.add(match[1]);
    const unprefixed = match[1].match(/^--(?:[\w]+-)*?((?:color|spacing|corner-radius|font)-[\w-]+)$/);
    if (unprefixed) names.add(`--${unprefixed[1]}`);
  }
  return names;
}

/** CSS with comments and url(...) payloads removed, line breaks kept so line numbers stay true. */
function scannableCss(css: string): string {
  return css
    .replace(/\/\*[\s\S]*?\*\//g, (comment) => comment.replace(/[^\n]/g, " "))
    .replace(/url\([^)]*\)/g, "url()");
}

const lineAt = (source: string, index: number) => source.slice(0, index).split("\n").length;

const HEX = /(?<![&\w])#(?:[0-9a-fA-F]{8}|[0-9a-fA-F]{6}|[0-9a-fA-F]{3,4})\b/g;
const COLOR_FN = /\b(?:rgba?|hsla?)\(/g;
const TOKEN_REFERENCE = /var\(\s*(--(?:color|spacing|corner-radius|font)-[\w-]+)/g;
/** Stylesheets and asset files under @humansignal/ui are entry points, not component internals. */
const NON_CODE_SPEC = /\.(s?css|svg|png|jpe?g|gif|webp|json|woff2?)$/;
const IMPORT_SPEC = /(?:\bfrom\s*|\bimport\s*\(\s*|\brequire\s*\(\s*|^\s*import\s+)["']([^"']+)["']/gm;
const NAMED_IMPORT = /\b(?:import|export)\s+(?:type\s+)?(?:[\w$]+\s*,\s*)?\{([^}]*)\}\s*from\s*["']([^"']+)["']/g;
const BARREL_EXPORT = /\bexport\s+(?:type\s+)?\{([^}]*)\}\s*from\s*["']([^"']+)["']/g;

/** `{ A, B as C, default as D }` → [source name, exported name] pairs. */
const specifiers = (list: string) =>
  list
    .split(",")
    .map((part) => part.trim().replace(/^type\s+/, ""))
    .filter(Boolean)
    .map((part) => {
      const [from, as] = part.split(/\s+as\s+/);
      return [from, as ?? from] as const;
    });

function colorLiterals(file: string, source: string, isStyle: boolean): Finding[] {
  const text = isStyle ? scannableCss(source) : source;
  const out: Finding[] = [];
  text.split("\n").forEach((line, index) => {
    const trimmed = line.trim();
    if (!isStyle && (trimmed.startsWith("//") || trimmed.startsWith("*") || trimmed.startsWith("/*"))) return;
    for (const match of [...line.matchAll(HEX), ...line.matchAll(COLOR_FN)]) {
      out.push({
        file,
        line: index + 1,
        rule: "color-literal",
        message: `Colour literal ${match[0]}: use a semantic token (var(--color-…) or a Tailwind token class).`,
      });
    }
  });
  return out;
}

function unknownTokens(file: string, source: string, tokenNames: Set<string>): Finding[] {
  const text = scannableCss(source);
  return [...text.matchAll(TOKEN_REFERENCE)]
    .filter((match) => !tokenNames.has(match[1]))
    .map((match) => ({
      file,
      line: lineAt(text, match.index ?? 0),
      rule: "unknown-token",
      message: `${match[1]} is not a design token (libs/ui/src/tokens/tokens.prefix.css).`,
    }));
}

function namedImports(file: string, source: string, ctx: ScanContext): Finding[] {
  const out: Finding[] = [];
  for (const match of source.matchAll(NAMED_IMPORT)) {
    const from = match[2];
    const line = lineAt(source, match.index ?? 0);
    const names = specifiers(match[1]).map(([name]) => name);
    const viaBarrel = from.startsWith(".") ? barrelReplacements(path.join(ctx.webRoot, file), from, ctx) : undefined;
    for (const name of names) {
      const component = viaBarrel?.get(name);
      if (component) {
        out.push({
          file,
          line,
          rule: "replaced-import",
          message: `${name} (via ${from}) is a local copy that ${component} replaces: import ${component} from @humansignal/ui.`,
        });
      }
      if (from === "@humansignal/icons" && /^Icon[A-Z]/.test(name)) {
        out.push({
          file,
          line,
          rule: "legacy-icon",
          message: `${name} is a legacy icon: use the Phosphor *Icon from @humansignal/icons.`,
        });
      }
      if (from === "@humansignal/ui" && ctx.deprecated.has(name)) {
        out.push({
          file,
          line,
          rule: "deprecated-import",
          message: `${name} is deprecated: use ${ctx.deprecated.get(name)} from @humansignal/ui.`,
        });
      }
    }
  }
  return out;
}

/** For an import of a barrel directory, the imported names it re-exports from a replaced file. */
function barrelReplacements(file: string, spec: string, ctx: ScanContext): Map<string, string> | undefined {
  if (matchesReplaced(file, spec, ctx)) return undefined;
  const dir = path.resolve(path.dirname(file), spec);
  if (!ctx.barrels.has(dir)) {
    const source = ctx.readBarrel(dir);
    const map = new Map<string, string>();
    if (source) {
      const indexFile = path.join(dir, "index.js");
      for (const match of source.matchAll(BARREL_EXPORT)) {
        const hit = matchesReplaced(indexFile, match[2], ctx);
        if (hit) for (const [, exported] of specifiers(match[1])) map.set(exported, hit.component);
      }
    }
    ctx.barrels.set(dir, map);
  }
  const map = ctx.barrels.get(dir);
  return map?.size ? map : undefined;
}

function matchesReplaced(file: string, spec: string, ctx: ScanContext) {
  const importer = normal(file);
  const isOwn = (entry: ScanContext["replaced"][number]) =>
    importer === entry.key || (entry.isDir && importer.startsWith(`${entry.key}/`));
  if (spec.startsWith(".")) {
    const target = normal(path.resolve(path.dirname(file), spec));
    return ctx.replaced.find(
      (entry) => !isOwn(entry) && (target === entry.key || (entry.isDir && target.startsWith(`${entry.key}/`))),
    );
  }
  const aliased = spec.startsWith("@humansignal/")
    ? `libs/${spec.slice("@humansignal/".length)}`
    : spec.startsWith("@/")
      ? `apps/labelstudio/src/${spec.slice(2)}`
      : spec;
  if (aliased.startsWith("@") || !aliased.includes("/")) return undefined;
  const parts = normal(aliased).split("/");
  return ctx.replaced.find((entry) => {
    if (isOwn(entry)) return false;
    if (entry.key.endsWith(`/${parts.join("/")}`)) return true;
    if (!entry.isDir) return false;
    for (let i = 2; i < parts.length; i++) if (entry.key.endsWith(`/${parts.slice(0, i).join("/")}`)) return true;
    return false;
  });
}

function moduleImports(file: string, source: string, ctx: ScanContext): Finding[] {
  const out: Finding[] = [];
  for (const match of source.matchAll(IMPORT_SPEC)) {
    const spec = match[1];
    const line = lineAt(source, match.index ?? 0);
    if (/^@humansignal\/(shad|ui\/shad)/.test(spec) || /libs\/ui\/src\/shad/.test(spec)) {
      out.push({
        file,
        line,
        rule: "shad-import",
        message: `${spec} bypasses the public API: import from @humansignal/ui.`,
      });
    } else if (spec.startsWith("@humansignal/ui/") && !file.startsWith("libs/ui/") && !NON_CODE_SPEC.test(spec)) {
      out.push({
        file,
        line,
        rule: "internal-import",
        message: `${spec} reaches into @humansignal/ui internals: import from "@humansignal/ui" (export it there if it is missing).`,
      });
    } else if (spec === "@phosphor-icons/react" || spec.startsWith("@phosphor-icons/react/")) {
      out.push({
        file,
        line,
        rule: "phosphor-import",
        message: "Import Phosphor icons from @humansignal/icons, never @phosphor-icons/react.",
      });
    } else {
      const hit = matchesReplaced(path.join(ctx.webRoot, file), spec, ctx);
      if (hit) {
        out.push({
          file,
          line,
          rule: "replaced-import",
          message: `${spec} is a local copy that ${hit.component} replaces: import ${hit.component} from @humansignal/ui.`,
        });
      }
    }
  }
  return out;
}

/** All structural findings for one file. `absPath` is absolute; findings carry the path relative to the web root. */
export function scanSource(absPath: string, source: string, ctx: ScanContext): Finding[] {
  const file = path.relative(ctx.webRoot, absPath).split(path.sep).join("/");
  if (STYLE_EXT.test(absPath))
    return [...colorLiterals(file, source, true), ...unknownTokens(file, source, ctx.tokenNames)];
  if (!SOURCE_EXT.test(absPath)) return [];
  return [
    ...colorLiterals(file, source, false),
    ...namedImports(file, source, ctx),
    ...moduleImports(file, source, ctx),
  ];
}

const EXCLUDED_DIRS = new Set([
  "node_modules",
  "dist",
  "build",
  "coverage",
  "__mocks__",
  "__fixtures__",
  "__tests__",
  "fixtures",
  "tests",
  "e2e",
  "tools",
  "scripts",
]);
/** Workspaces that are the design system itself, test harnesses or offline tooling. */
const EXCLUDED_ROOTS = [
  "apps/labelstudio-e2e",
  "libs/ui",
  "libs/frontend-test",
  "libs/storybook",
  "libs/interface-eval",
];
const EXCLUDED_FILE = /\.(test|spec|stories)\.[jt]sx?$|\.d\.ts$|(^|\/)fixtures?\.[jt]sx?$|antd-no-reset\.css$/;

/** Whether a path relative to the web root is in the ratchet's scope. */
export function inScope(file: string): boolean {
  if (!/^(apps|libs)\//.test(file)) return false;
  if (EXCLUDED_ROOTS.some((root) => file === root || file.startsWith(`${root}/`))) return false;
  if (file.split("/").some((part) => EXCLUDED_DIRS.has(part))) return false;
  if (EXCLUDED_FILE.test(file)) return false;
  return SOURCE_EXT.test(file) || STYLE_EXT.test(file);
}

export function listScanFiles(webRoot: string): string[] {
  const out: string[] = [];
  const walk = (dir: string) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (entry.isDirectory()) {
        if (EXCLUDED_DIRS.has(entry.name)) continue;
        walk(path.join(dir, entry.name));
      } else {
        const rel = path.relative(webRoot, path.join(dir, entry.name)).split(path.sep).join("/");
        if (inScope(rel)) out.push(rel);
      }
    }
  };
  for (const root of ["apps", "libs"]) if (fs.existsSync(path.join(webRoot, root))) walk(path.join(webRoot, root));
  return out.sort();
}
