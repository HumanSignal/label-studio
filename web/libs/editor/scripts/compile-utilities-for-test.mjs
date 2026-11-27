/**
 * Vitest globalSetup: bundle utilities.ts → utilities.js and compile feature-flags.ts → feature-flags.js
 * so Node can load them when tests run. Teardown restores originals.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import * as esbuild from "esbuild";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const utilsDir = path.join(__dirname, "../src/utils");
const webRoot = path.join(__dirname, "../..");
const utilitiesJs = path.join(utilsDir, "utilities.js");
const utilitiesTs = path.join(utilsDir, "utilities.ts");
const backupUtils = path.join(utilsDir, "utilities.js.backup");
const featureFlagsJs = path.join(utilsDir, "feature-flags.js");
const featureFlagsTs = path.join(utilsDir, "feature-flags.ts");
const backupFF = path.join(utilsDir, "feature-flags.js.backup");
const bemTs = path.join(utilsDir, "bem.ts");
const bemJs = path.join(utilsDir, "bem.js");
const backupBem = path.join(utilsDir, "bem.js.backup");
const uniqueTs = path.join(utilsDir, "unique.ts");
const uniqueJs = path.join(utilsDir, "unique.js");
const backupUnique = path.join(utilsDir, "unique.js.backup");

export default async function setup() {
  const origUtils = fs.readFileSync(utilitiesJs, "utf8");
  fs.writeFileSync(backupUtils, origUtils, "utf8");

  const origFF = fs.readFileSync(featureFlagsJs, "utf8");
  fs.writeFileSync(backupFF, origFF, "utf8");

  let hadBemJs = fs.existsSync(bemJs);
  if (hadBemJs) fs.writeFileSync(backupBem, fs.readFileSync(bemJs, "utf8"), "utf8");
  let hadUniqueJs = fs.existsSync(uniqueJs);
  if (hadUniqueJs) fs.writeFileSync(backupUnique, fs.readFileSync(uniqueJs, "utf8"), "utf8");
  const uniqueCode = fs.readFileSync(uniqueTs, "utf8");
  const { code: uniqueOut } = await esbuild.transform(uniqueCode, { loader: "ts", format: "esm" });
  fs.writeFileSync(uniqueJs, uniqueOut, "utf8");

  await esbuild.build({
    entryPoints: [bemTs],
    bundle: true,
    format: "esm",
    outfile: bemJs,
    platform: "node",
    mainFields: ["module", "main"],
    absWorkingDir: webRoot,
  });

  await esbuild.build({
    entryPoints: [utilitiesTs],
    bundle: true,
    format: "esm",
    outfile: utilitiesJs,
    platform: "node",
    mainFields: ["module", "main"],
    absWorkingDir: webRoot,
  });

  const ffCode = fs.readFileSync(featureFlagsTs, "utf8");
  const { code: ffOut } = await esbuild.transform(ffCode, { loader: "ts", format: "esm" });
  fs.writeFileSync(featureFlagsJs, ffOut, "utf8");

  return function teardown() {
    fs.writeFileSync(utilitiesJs, fs.readFileSync(backupUtils, "utf8"), "utf8");
    fs.unlinkSync(backupUtils);
    fs.writeFileSync(featureFlagsJs, fs.readFileSync(backupFF, "utf8"), "utf8");
    fs.unlinkSync(backupFF);
    if (hadBemJs) {
      fs.writeFileSync(bemJs, fs.readFileSync(backupBem, "utf8"), "utf8");
      fs.unlinkSync(backupBem);
    } else {
      fs.unlinkSync(bemJs);
    }
    if (hadUniqueJs) {
      fs.writeFileSync(uniqueJs, fs.readFileSync(backupUnique, "utf8"), "utf8");
      fs.unlinkSync(backupUnique);
    } else {
      fs.unlinkSync(uniqueJs);
    }
  };
}
