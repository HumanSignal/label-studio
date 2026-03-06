#!/usr/bin/env node

/**
 * Transforms bare HTML element selectors nested inside CSS/SCSS rules
 * to use the `&` prefix required by native CSS nesting.
 *
 * Before: .parent { div { color: red; } }
 * After:  .parent { & div { color: red; } }
 *
 * Only transforms lines that:
 * 1. Are indented (nested inside a rule)
 * 2. Start with a bare HTML element name
 * 3. Are followed by `{`, `,`, or whitespace+selector continuation
 *
 * Leaves alone:
 * - Lines starting with &, ., #, [, :, >, +, ~, *, @, /
 * - Top-level (non-indented) selectors
 * - Lines inside comments
 * - Property declarations (contain `:` before `{`)
 *
 * Usage:
 *   node tools/fix-bare-nesting.js --dry-run     # Preview changes
 *   node tools/fix-bare-nesting.js                # Apply changes
 *   node tools/fix-bare-nesting.js --file path    # Single file
 */

const fs = require("node:fs");
const path = require("node:path");

const WEB_ROOT = path.resolve(__dirname, "..");

const HTML_ELEMENTS = new Set([
  "a",
  "abbr",
  "address",
  "article",
  "aside",
  "audio",
  "b",
  "bdi",
  "bdo",
  "blockquote",
  "body",
  "br",
  "button",
  "canvas",
  "caption",
  "cite",
  "code",
  "col",
  "colgroup",
  "data",
  "datalist",
  "dd",
  "del",
  "details",
  "dfn",
  "dialog",
  "div",
  "dl",
  "dt",
  "em",
  "embed",
  "fieldset",
  "figcaption",
  "figure",
  "footer",
  "form",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "head",
  "header",
  "hgroup",
  "hr",
  "html",
  "i",
  "iframe",
  "img",
  "input",
  "ins",
  "kbd",
  "label",
  "legend",
  "li",
  "link",
  "main",
  "map",
  "mark",
  "menu",
  "meter",
  "nav",
  "noscript",
  "object",
  "ol",
  "optgroup",
  "option",
  "output",
  "p",
  "path",
  "picture",
  "pre",
  "progress",
  "q",
  "rect",
  "rp",
  "rt",
  "ruby",
  "s",
  "samp",
  "script",
  "search",
  "section",
  "select",
  "slot",
  "small",
  "source",
  "span",
  "strong",
  "style",
  "sub",
  "summary",
  "sup",
  "svg",
  "table",
  "tbody",
  "td",
  "template",
  "textarea",
  "tfoot",
  "th",
  "thead",
  "time",
  "title",
  "tr",
  "track",
  "u",
  "ul",
  "var",
  "video",
  "wbr",
  "circle",
  "ellipse",
  "g",
  "line",
  "polygon",
  "polyline",
  "text",
  "use",
]);

function findScssFiles(dir, results = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === "node_modules" || entry.name === "dist" || entry.name === ".scss-snapshots") continue;
      findScssFiles(fullPath, results);
    } else if (entry.isFile() && entry.name.endsWith(".scss")) {
      results.push(fullPath);
    }
  }
  return results;
}

/**
 * Matches a line that is a bare HTML element selector needing `&` prefix.
 * Returns the transformed line, or null if no transform needed.
 */
function transformLine(line, nestingDepth, inComment) {
  if (inComment) return null;
  if (nestingDepth < 1) return null;

  const trimmed = line.trimStart();

  if (trimmed === "" || trimmed.startsWith("//") || trimmed.startsWith("/*") || trimmed.startsWith("*")) return null;
  if (
    trimmed.startsWith("&") ||
    trimmed.startsWith(".") ||
    trimmed.startsWith("#") ||
    trimmed.startsWith("[") ||
    trimmed.startsWith(":") ||
    trimmed.startsWith(">") ||
    trimmed.startsWith("+") ||
    trimmed.startsWith("~") ||
    trimmed.startsWith("*") ||
    trimmed.startsWith("@") ||
    trimmed.startsWith("/") ||
    trimmed.startsWith("$") ||
    trimmed.startsWith("-") ||
    trimmed.startsWith('"') ||
    trimmed.startsWith("'") ||
    trimmed.startsWith("#{")
  )
    return null;

  const isPropertyDecl = /^[a-z-]+\s*:/.test(trimmed) && !trimmed.includes("{");
  if (isPropertyDecl) return null;

  const match = trimmed.match(/^([a-zA-Z][a-zA-Z0-9]*)/);
  if (!match) return null;

  const firstWord = match[1].toLowerCase();
  if (!HTML_ELEMENTS.has(firstWord)) return null;

  const afterElement = trimmed.slice(match[0].length);
  const validContinuation =
    afterElement === "" ||
    afterElement.startsWith(" ") ||
    afterElement.startsWith("{") ||
    afterElement.startsWith(",") ||
    afterElement.startsWith(".") ||
    afterElement.startsWith("[") ||
    afterElement.startsWith(":") ||
    afterElement.startsWith("#") ||
    afterElement.startsWith(">") ||
    afterElement.startsWith("+") ||
    afterElement.startsWith("~");

  if (!validContinuation) return null;

  const indent = line.slice(0, line.length - line.trimStart().length);
  return `${indent}& ${trimmed}`;
}

function processFile(filePath) {
  const content = fs.readFileSync(filePath, "utf-8");
  const lines = content.split("\n");
  const changes = [];

  let nestingDepth = 0;
  let inBlockComment = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (inBlockComment) {
      if (line.includes("*/")) inBlockComment = false;
      continue;
    }

    if (line.trimStart().startsWith("/*") && !line.includes("*/")) {
      inBlockComment = true;
      continue;
    }

    const transformed = transformLine(line, nestingDepth, inBlockComment);
    if (transformed !== null) {
      changes.push({
        line: i + 1,
        before: line,
        after: transformed,
      });
      lines[i] = transformed;
    }

    const stripped = line.replace(/\/\/.*$/, "").replace(/\/\*.*?\*\//g, "");
    for (const ch of stripped) {
      if (ch === "{") nestingDepth++;
      if (ch === "}") nestingDepth = Math.max(0, nestingDepth - 1);
    }
  }

  return {
    original: content,
    transformed: lines.join("\n"),
    changes,
  };
}

function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes("--dry-run");
  const singleFileIdx = args.indexOf("--file");
  const singleFile = singleFileIdx !== -1 ? args[singleFileIdx + 1] : null;

  let files;
  if (singleFile) {
    files = [path.resolve(singleFile)];
  } else {
    files = findScssFiles(WEB_ROOT);
  }

  console.log(`${dryRun ? "[DRY RUN] " : ""}Processing ${files.length} .scss files...\n`);

  let totalChanges = 0;
  let filesChanged = 0;

  for (const file of files) {
    const relative = path.relative(WEB_ROOT, file);
    const { transformed, changes } = processFile(file);

    if (changes.length === 0) continue;

    filesChanged++;
    totalChanges += changes.length;

    console.log(`${relative} (${changes.length} changes)`);
    for (const c of changes) {
      console.log(`  L${c.line}: ${c.before.trim()}`);
      console.log(`     → ${c.after.trim()}`);
    }
    console.log();

    if (!dryRun) {
      fs.writeFileSync(file, transformed, "utf-8");
    }
  }

  console.log(`\n${dryRun ? "[DRY RUN] " : ""}Summary:`);
  console.log(`  Files changed: ${filesChanged}`);
  console.log(`  Total transformations: ${totalChanges}`);
  if (dryRun) {
    console.log("\nRe-run without --dry-run to apply changes.");
  }
}

main();
