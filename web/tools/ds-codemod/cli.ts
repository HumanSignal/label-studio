#!/usr/bin/env bun
/**
 * Rewrites values that already equal a design token into the token, across the ds:check scope of one web.
 *
 *   bun tools/ds-codemod/cli.ts --web lso|lse [files…]   rewrite in place (default: every file ds:check scans)
 *   --dry-run                                            print the counts, write nothing
 *
 * Tailwind spacing is rewritten only in class strings (className, *ClassName, cn/clsx/cva calls), and never where a
 * class of the same utility can apply with it: in the same class expression, or in the base classes a component of
 * either web joins with its className without tailwind-merge. Colour fallbacks
 * are only dropped under apps/, outside comments: libraries can render where the token stylesheet is not loaded,
 * so their fallbacks stay.
 */
import fs from "node:fs";
import path from "node:path";
import { listScanFiles, loadTokenNames } from "../ds-check/scan";
import { clsxMergedBases, dropTokenFallbacks, spacingToTokens } from "./token-values";

const lsoWebRoot = path.resolve(import.meta.dir, "../..");
const args = process.argv.slice(2);
const web = args.includes("--web") ? args[args.indexOf("--web") + 1] : "lso";
if (web !== "lso" && web !== "lse") throw new Error(`--web must be lso or lse, got ${web}`);
const dryRun = args.includes("--dry-run");
const webRoot = path.resolve(lsoWebRoot, "../..", web, "web");
const positional = args.filter((arg, i) => !arg.startsWith("--") && args[i - 1] !== "--web");
const files = positional.length
  ? positional.map((file) => path.relative(webRoot, path.resolve(file)))
  : listScanFiles(webRoot);
const tokenNames = loadTokenNames(
  fs.readFileSync(path.join(lsoWebRoot, "libs/ui/src/tokens/tokens.prefix.css"), "utf8"),
);

const SOURCE = /\.[jt]sx?$/;

/** The clsx-merged base classes of every component in both webs, since apps render library components. */
function mergedBasesOfBothWebs(): Map<string, Set<string>> {
  const out = new Map<string, Set<string>>();
  const walk = (dir: string) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const abs = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (entry.name !== "node_modules" && entry.name !== "dist" && !entry.name.startsWith(".")) walk(abs);
      } else if (SOURCE.test(entry.name) && !/\.(test|spec|stories)\.[jt]sx?$/.test(entry.name)) {
        for (const [name, keys] of clsxMergedBases(fs.readFileSync(abs, "utf8"), entry.name)) {
          out.set(name, new Set([...(out.get(name) ?? []), ...keys]));
        }
      }
    }
  };
  for (const root of ["lso", "lse"].flatMap((w) =>
    ["apps", "libs"].map((d) => path.resolve(lsoWebRoot, "../..", w, "web", d)),
  )) {
    if (fs.existsSync(root)) walk(root);
  }
  return out;
}
const mergedBases = mergedBasesOfBothWebs();
const totals = { spacing: 0, fallbacks: 0, files: 0 };
for (const file of files) {
  const abs = path.join(webRoot, file);
  const before = fs.readFileSync(abs, "utf8");
  let source = before;
  if (SOURCE.test(file)) {
    const spacing = spacingToTokens(source, file, mergedBases);
    source = spacing.source;
    totals.spacing += spacing.count;
  }
  if (file.startsWith("apps/")) {
    const fallbacks = dropTokenFallbacks(source, tokenNames, file);
    source = fallbacks.source;
    totals.fallbacks += fallbacks.count;
  }
  if (source !== before) {
    totals.files += 1;
    if (!dryRun) fs.writeFileSync(abs, source);
  }
}
console.log(
  `[ds-codemod] ${web}: ${totals.spacing} spacing classes, ${totals.fallbacks} colour fallbacks, ${totals.files} files${dryRun ? " (dry run)" : ""}`,
);
