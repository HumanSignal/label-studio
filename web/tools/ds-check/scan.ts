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
  /** Whether the module at `absPath` (no extension) exports `name` itself. */
  exportsName: (absPath: string, name: string) => boolean;
  /** `<barrel dir>#<name>` → the DS component it re-exports a local copy of, or null. */
  barrels: Map<string, string | null>;
};

const BARREL_INDEX = ["index.ts", "index.tsx", "index.js", "index.jsx"];

function defaultReadBarrel(absDir: string): string | null {
  for (const name of BARREL_INDEX) {
    const candidate = path.join(absDir, name);
    if (fs.existsSync(candidate)) return fs.readFileSync(candidate, "utf-8");
  }
  return null;
}

const MODULE_EXT = [".tsx", ".ts", ".jsx", ".js"];

function defaultExportsName(absPath: string, name: string): boolean {
  const file = MODULE_EXT.map((ext) => absPath + ext).find((candidate) => fs.existsSync(candidate));
  if (!file) return false;
  const source = fs.readFileSync(file, "utf-8");
  const escaped = name.replace(/\$/g, "\\$");
  return (
    new RegExp(`\\bexport\\s+(?:const|let|var|function|class)\\s+${escaped}\\b`).test(source) ||
    new RegExp(`\\bexport\\s*\\{[^}]*\\b${escaped}\\b[^}]*\\}(?!\\s*from)`).test(source)
  );
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
  exportsName = defaultExportsName,
}: {
  repoRoot: string;
  webRoot: string;
  tokenNames: Set<string>;
  manifest: ManifestSlice;
  isDirectory?: (abs: string) => boolean;
  readBarrel?: (absDir: string) => string | null;
  exportsName?: (absPath: string, name: string) => boolean;
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
  return { webRoot, tokenNames, replaced, deprecated, readBarrel, exportsName, barrels: new Map() };
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
const STAR_EXPORT = /\bexport\s*\*\s*from\s*["']([^"']+)["']/g;

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
    const abs = path.join(ctx.webRoot, file);
    for (const name of names) {
      const component = barrelReplacement(abs, from, name, ctx);
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

/** The directory an import specifier points to inside the web: relative, the LSE app's `@/` alias, or baseUrl. */
function specDir(file: string, spec: string, ctx: ScanContext): string | undefined {
  if (spec.startsWith(".")) return path.resolve(path.dirname(file), spec);
  if (spec.startsWith("@/")) return path.join(ctx.webRoot, "apps/labelstudio/src", spec.slice(2));
  if (/^(apps|libs)\//.test(spec)) return path.join(ctx.webRoot, spec);
  return undefined;
}

/** For a named import of a barrel directory, the DS component whose local copy the barrel re-exports as `name`. */
function barrelReplacement(file: string, spec: string, name: string, ctx: ScanContext): string | undefined {
  if (matchesReplaced(file, spec, ctx)) return undefined;
  const dir = specDir(file, spec, ctx);
  return dir ? barrelExport(dir, name, ctx, 0) : undefined;
}

const MAX_BARREL_DEPTH = 6;

/**
 * The DS component that barrel `dir` re-exports as `name`: through `export { a as name } from` and `export * from`,
 * into nested barrels, until a local copy the manifest lists is reached.
 */
function barrelExport(dir: string, name: string, ctx: ScanContext, depth: number): string | undefined {
  const key = `${dir}#${name}`;
  if (ctx.barrels.has(key)) return ctx.barrels.get(key) ?? undefined;
  ctx.barrels.set(key, null);
  const source = depth < MAX_BARREL_DEPTH ? ctx.readBarrel(dir) : null;
  let component: string | undefined;
  if (source) {
    const indexFile = path.join(dir, "index.js");
    for (const match of source.matchAll(BARREL_EXPORT)) {
      for (const [from, exported] of specifiers(match[1])) {
        if (exported !== name || component) continue;
        component =
          matchesReplaced(indexFile, match[2], ctx)?.component ??
          (match[2].startsWith(".") ? barrelExport(path.resolve(dir, match[2]), from, ctx, depth + 1) : undefined);
      }
    }
    for (const match of source.matchAll(STAR_EXPORT)) {
      if (component || !match[1].startsWith(".")) continue;
      const target = path.resolve(dir, match[1]);
      const direct = matchesReplaced(indexFile, match[1], ctx);
      component = direct
        ? ctx.exportsName(target, name)
          ? direct.component
          : undefined
        : barrelExport(target, name, ctx, depth + 1);
    }
  }
  ctx.barrels.set(key, component ?? null);
  return component;
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

// Tailwind classes that reach past the semantic tokens: a palette stop on a colour utility (bg-grape-600,
// text-red-500) or a number on a spacing utility (p-4, gap-2, p-200, p-[12px]). Width, height, z-index, grid
// counts and type sizes are not spacing and stay allowed; so does zero. The optional prefix keeps variants
// (md:, hover:, dark:) and the negative sign in the reported class.
const PALETTES =
  "sand|grape|blueberry|kale|kiwi|mango|canteloupe|persimmon|plum|fig|slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose";
const COLOR_UTILITIES =
  "bg|text|border|ring|fill|stroke|outline|from|to|via|divide|placeholder|shadow|decoration|accent|caret";
const SPACING_UTILITIES = "p|px|py|pt|pr|pb|pl|ps|pe|m|mx|my|mt|mr|mb|ml|ms|me|gap|gap-x|gap-y|space-x|space-y";
const TAILWIND_COLOR = new RegExp(
  `(?<![\\w-])(?:[a-z-]+:)*(?:${COLOR_UTILITIES})-(?:${PALETTES})-\\d{2,3}(?![\\w-])`,
  "g",
);
const TAILWIND_SPACING = new RegExp(
  `(?<![\\w-])(?:[a-z-]+:)*-?(?:${SPACING_UTILITIES})-(?:\\d*[1-9]\\d*(?:\\.\\d+)?|0\\.\\d+|\\[[^\\]\\s]+\\])(?![\\w-])`,
  "g",
);
const COMMENT_LINE = /^\s*(\/\/|\/?\*)/;

function tailwindPrimitives(file: string, source: string): Finding[] {
  const out: Finding[] = [];
  source.split("\n").forEach((line, index) => {
    if (COMMENT_LINE.test(line)) return;
    for (const match of line.matchAll(TAILWIND_COLOR)) {
      out.push({
        file,
        line: index + 1,
        rule: "tailwind-primitive",
        message: `Tailwind primitive colour class ${match[0]}: use a semantic colour class (bg-primary-background, text-neutral-content, border-neutral-border…).`,
      });
    }
    for (const match of line.matchAll(TAILWIND_SPACING)) {
      out.push({
        file,
        line: index + 1,
        rule: "tailwind-primitive",
        message: `Tailwind numeric spacing class ${match[0]}: use a spacing token class (p-tight, gap-base, m-wide…).`,
      });
    }
  });
  return out;
}

// A dialog opened from a function instead of rendered by its owner. A bare call needs an object argument, so the
// browser's confirm("…") and member calls such as logger.info({…}) stay allowed.
const IMPERATIVE_DIALOG =
  /(?<![\w$.])(?<!\bfunction\s+)(?:confirm|info|modal)\(\s*\{|(?<![\w$.])standaloneModal\(|(?<![\w$.])Modal\.(?:confirm|info|modal)\(/g;

function imperativeDialogs(file: string, source: string): Finding[] {
  const out: Finding[] = [];
  for (const match of source.matchAll(IMPERATIVE_DIALOG)) {
    const index = match.index ?? 0;
    if (COMMENT_LINE.test(source.slice(source.lastIndexOf("\n", index) + 1, index + match[0].length))) continue;
    out.push({
      file,
      line: lineAt(source, index),
      rule: "imperative-dialog",
      message:
        "Render ConfirmDialog, InfoDialog or ModalWindow from @humansignal/ui in the component that owns it: a dialog opened from a function runs in a React root of its own.",
    });
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
    ...tailwindPrimitives(file, source),
    ...imperativeDialogs(file, source),
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
