/**
 * Patches vitest 2.1.9 coverage bugs:
 * 1. onAfterSuiteRun() writes to .tmp/ without ensuring it exists
 * 2. cleanAfterRun() calls rm() without { force: true }
 *
 * Remove this patch once vitest ships the fix upstream.
 */
const fs = require("fs");
const path = require("path");

const file = path.join(__dirname, "../node_modules/vitest/dist/coverage.js");

if (!fs.existsSync(file)) {
  process.exit(0);
}

let content = fs.readFileSync(file, "utf8");
let changed = false;

const writeBefore = "const promise = promises.writeFile(filename, JSON.stringify(coverage)";
const writeAfter = "mkdirSync(this.coverageFilesDirectory, { recursive: true });\n    const promise = promises.writeFile(filename, JSON.stringify(coverage)";
if (content.includes(writeBefore) && !content.includes("mkdirSync(this.coverageFilesDirectory")) {
  content = content.replace(writeBefore, writeAfter);
  if (!content.includes("import { existsSync, mkdirSync,")) {
    content = content.replace(
      "import { existsSync, promises, readdirSync, writeFileSync }",
      "import { existsSync, mkdirSync, promises, readdirSync, writeFileSync }",
    );
  }
  changed = true;
}

const rmBefore = "await promises.rm(this.coverageFilesDirectory, { recursive: true })";
const rmAfter = "await promises.rm(this.coverageFilesDirectory, { recursive: true, force: true })";
if (content.includes(rmBefore)) {
  content = content.replace(rmBefore, rmAfter);
  content = content.replace(
    "if (readdirSync(this.options.reportsDirectory).length === 0) {",
    "if (existsSync(this.options.reportsDirectory) && readdirSync(this.options.reportsDirectory).length === 0) {",
  );
  changed = true;
}

if (changed) {
  fs.writeFileSync(file, content, "utf8");
}
