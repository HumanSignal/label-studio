/**
 * Patches vitest's cleanAfterRun() to use force:true on rm() calls.
 *
 * vitest 2.1.9 has a bug where BaseCoverageProvider.cleanAfterRun() calls
 * fs.promises.rm() without { force: true }, causing ENOENT when the .tmp
 * staging directory doesn't exist. The clean() method correctly uses force.
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

const before = "await promises.rm(this.coverageFilesDirectory, { recursive: true })";
const after = "await promises.rm(this.coverageFilesDirectory, { recursive: true, force: true })";

if (!content.includes(before)) {
  process.exit(0);
}

content = content.replace(before, after);

content = content.replace(
  "if (readdirSync(this.options.reportsDirectory).length === 0) {",
  "if (existsSync(this.options.reportsDirectory) && readdirSync(this.options.reportsDirectory).length === 0) {",
);

fs.writeFileSync(file, content, "utf8");
