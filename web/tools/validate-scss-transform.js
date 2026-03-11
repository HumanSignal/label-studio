#!/usr/bin/env node

/**
 * Validates that SCSS→CSS compilation output is identical before and after
 * a source transformation (e.g., adding `&` before bare nested elements).
 *
 * Usage:
 *   # Step 1: Snapshot current compiled output (BEFORE changes)
 *   node tools/validate-scss-transform.js snapshot
 *
 *   # Step 2: Make your changes to .scss files
 *
 *   # Step 3: Validate that compiled output is identical
 *   node tools/validate-scss-transform.js validate
 *
 *   # Optional: Clean up snapshot directory
 *   node tools/validate-scss-transform.js clean
 */

const sass = require("sass");
const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");

const SNAPSHOT_DIR = path.resolve(__dirname, "../.scss-snapshots");
const WEB_ROOT = path.resolve(__dirname, "..");

function findScssFiles(dir, results = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === "node_modules" || entry.name === "dist" || entry.name === ".scss-snapshots") continue;
      findScssFiles(fullPath, results);
    } else if (entry.isFile() && entry.name.endsWith(".scss") && !entry.name.startsWith("_")) {
      results.push(fullPath);
    }
  }
  return results;
}

function compileScss(filePath) {
  try {
    const result = sass.compile(filePath, {
      style: "expanded",
      silenceDeprecations: ["import", "global-builtin", "legacy-js-api", "color-functions"],
      loadPaths: [WEB_ROOT, path.join(WEB_ROOT, "node_modules")],
    });
    return { css: result.css, error: null };
  } catch (err) {
    return { css: null, error: err.message };
  }
}

function hashContent(content) {
  return crypto.createHash("sha256").update(content).digest("hex");
}

/**
 * Normalize CSS for comparison by collapsing multi-line selector lists
 * into single lines. SCSS may reformat selector lists when `&` is added
 * to bare nested selectors — the selectors are semantically identical
 * but may be placed on one line vs. multiple lines.
 */
function normalizeCSS(css) {
  const lines = css.split("\n");
  const result = [];
  let i = 0;
  while (i < lines.length) {
    let line = lines[i];
    while (line.trimEnd().endsWith(",") && i + 1 < lines.length) {
      i++;
      line = `${line.trimEnd()} ${lines[i].trimStart()}`;
    }
    result.push(line);
    i++;
  }
  return result.join("\n");
}

function getSnapshotPath(scssPath) {
  const relative = path.relative(WEB_ROOT, scssPath);
  return path.join(SNAPSHOT_DIR, relative.replace(/\.scss$/, ".snapshot.json"));
}

function snapshot() {
  const files = findScssFiles(WEB_ROOT);
  console.log(`Found ${files.length} .scss files (excluding partials)`);

  fs.mkdirSync(SNAPSHOT_DIR, { recursive: true });

  let compiled = 0;
  let skipped = 0;
  let errors = 0;

  for (const file of files) {
    const relative = path.relative(WEB_ROOT, file);
    const { css, error } = compileScss(file);

    const snapshotPath = getSnapshotPath(file);
    fs.mkdirSync(path.dirname(snapshotPath), { recursive: true });

    if (error) {
      fs.writeFileSync(
        snapshotPath,
        JSON.stringify(
          {
            file: relative,
            status: "error",
            error: error,
            hash: null,
          },
          null,
          2,
        ),
      );
      errors++;
    } else if (css !== null) {
      const normalized = normalizeCSS(css);
      fs.writeFileSync(
        snapshotPath,
        JSON.stringify(
          {
            file: relative,
            status: "ok",
            error: null,
            hash: hashContent(css),
            normalizedHash: hashContent(normalized),
            css: css,
            normalizedCss: normalized,
          },
          null,
          2,
        ),
      );
      compiled++;
    } else {
      skipped++;
    }
  }

  console.log("\nSnapshot complete:");
  console.log(`  Compiled: ${compiled}`);
  console.log(`  Errors (pre-existing): ${errors}`);
  console.log(`  Skipped: ${skipped}`);
  console.log(`  Saved to: ${SNAPSHOT_DIR}`);
}

function validate() {
  if (!fs.existsSync(SNAPSHOT_DIR)) {
    console.error("No snapshots found. Run 'snapshot' first.");
    process.exit(1);
  }

  const files = findScssFiles(WEB_ROOT);
  console.log(`Validating ${files.length} .scss files against snapshots...\n`);

  let pass = 0;
  let fail = 0;
  let formatOnly = 0;
  let newErrors = 0;
  let fixedErrors = 0;
  let noSnapshot = 0;
  const failures = [];

  for (const file of files) {
    const relative = path.relative(WEB_ROOT, file);
    const snapshotPath = getSnapshotPath(file);

    if (!fs.existsSync(snapshotPath)) {
      noSnapshot++;
      continue;
    }

    const snapshotData = JSON.parse(fs.readFileSync(snapshotPath, "utf-8"));
    const { css, error } = compileScss(file);

    if (snapshotData.status === "error") {
      if (error) {
        pass++;
      } else {
        fixedErrors++;
        pass++;
      }
      continue;
    }

    if (error) {
      newErrors++;
      failures.push({
        file: relative,
        reason: "NEW COMPILE ERROR",
        detail: error,
      });
      continue;
    }

    const newHash = hashContent(css);
    const normalizedNew = normalizeCSS(css);
    const normalizedNewHash = hashContent(normalizedNew);
    const snapshotNormalizedHash = snapshotData.normalizedHash || hashContent(normalizeCSS(snapshotData.css));

    if (newHash === snapshotData.hash) {
      pass++;
    } else if (normalizedNewHash === snapshotNormalizedHash) {
      pass++;
      formatOnly++;
    } else {
      fail++;
      const oldLines = normalizedNew.split("\n");
      const snapshotLines = normalizeCSS(snapshotData.css).split("\n");
      const diffLines = [];

      const maxLen = Math.max(snapshotLines.length, oldLines.length);
      for (let i = 0; i < maxLen; i++) {
        const oldLine = snapshotLines[i] ?? "";
        const newLine = oldLines[i] ?? "";
        if (oldLine !== newLine) {
          diffLines.push({
            line: i + 1,
            before: oldLine,
            after: newLine,
          });
        }
      }

      failures.push({
        file: relative,
        reason: "CSS OUTPUT CHANGED",
        diffCount: diffLines.length,
        firstDiffs: diffLines.slice(0, 5),
      });
    }
  }

  console.log("Results:");
  console.log(`  ✅ Pass (identical output): ${pass - formatOnly}`);
  if (formatOnly > 0) console.log(`  ✅ Pass (selector formatting only, semantically identical): ${formatOnly}`);
  if (fixedErrors > 0) console.log(`  🔧 Fixed (was error, now compiles): ${fixedErrors}`);
  if (noSnapshot > 0) console.log(`  ⚠️  No snapshot (new file?): ${noSnapshot}`);
  if (fail > 0) console.log(`  ❌ FAIL (output changed): ${fail}`);
  if (newErrors > 0) console.log(`  💥 NEW ERRORS (was ok, now fails): ${newErrors}`);

  if (failures.length > 0) {
    console.log("\n--- FAILURES ---\n");
    for (const f of failures) {
      console.log(`File: ${f.file}`);
      console.log(`  Reason: ${f.reason}`);
      if (f.detail) {
        console.log(`  Error: ${f.detail.substring(0, 200)}`);
      }
      if (f.firstDiffs) {
        console.log(`  Changed lines: ${f.diffCount}`);
        for (const d of f.firstDiffs) {
          console.log(`    Line ${d.line}:`);
          console.log(`      before: ${d.before}`);
          console.log(`      after:  ${d.after}`);
        }
        if (f.diffCount > 5) console.log(`    ... and ${f.diffCount - 5} more`);
      }
      console.log();
    }
  }

  if (fail > 0 || newErrors > 0) {
    console.log(`\n❌ VALIDATION FAILED — ${fail + newErrors} file(s) have different output`);
    process.exit(1);
  } else {
    console.log("\n✅ VALIDATION PASSED — all compiled CSS output is identical");
    process.exit(0);
  }
}

function clean() {
  if (fs.existsSync(SNAPSHOT_DIR)) {
    fs.rmSync(SNAPSHOT_DIR, { recursive: true });
    console.log(`Cleaned up ${SNAPSHOT_DIR}`);
  } else {
    console.log("Nothing to clean.");
  }
}

const command = process.argv[2];
switch (command) {
  case "snapshot":
    snapshot();
    break;
  case "validate":
    validate();
    break;
  case "clean":
    clean();
    break;
  default:
    console.log("Usage: node tools/validate-scss-transform.js <snapshot|validate|clean>");
    process.exit(1);
}
