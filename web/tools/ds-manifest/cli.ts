#!/usr/bin/env bun
/**
 *   bun run ds:manifest            validate the fragments, write the registry and the skill section
 *   bun run ds:manifest --check    exit 1 on a contract violation or a stale registry / skill
 */
import fs from "node:fs";
import path from "node:path";
import { loadManifest, registryPath, renderRegistry, repoRoot, skillPath, webRoot } from "./load";
import { extractSkillSection, renderSkillSection, replaceSkillSection } from "./render-skill";

const check = process.argv.includes("--check");
const { manifest, problems, skippedPaths } = await loadManifest();

if (skippedPaths.length)
  console.log(`[ds-manifest] ${skippedPaths.length} replaced paths not checked: tree not checked out`);
if (problems.length) {
  console.error("[ds-manifest] the component manifests break the contract:");
  for (const p of problems) console.error(`  - ${p}`);
  process.exit(1);
}

let stale = 0;
const stalePrefix = "[ds-manifest]";
const report = (what: string, file: string, inSync: boolean, write: () => void) => {
  if (inSync) {
    console.log(`${stalePrefix} ${what} is in sync`);
  } else if (check) {
    console.error(`${stalePrefix} ${what} is stale: run \`bun run ds:manifest\` in services/lso/web`);
    stale += 1;
  } else {
    write();
    console.log(`${stalePrefix} updated ${path.relative(repoRoot, file)}`);
  }
};

const registry = renderRegistry(manifest);
const currentRegistry = fs.existsSync(registryPath) ? fs.readFileSync(registryPath, "utf-8") : "";
report("registry", registryPath, currentRegistry === registry, () => fs.writeFileSync(registryPath, registry));

if (fs.existsSync(skillPath)) {
  const skill = fs.readFileSync(skillPath, "utf-8");
  const section = renderSkillSection(manifest);
  report("design-system skill", skillPath, extractSkillSection(skill) === section, () =>
    fs.writeFileSync(skillPath, replaceSkillSection(skill, section)),
  );
} else {
  console.log(`${stalePrefix} skill not checked out (${path.relative(webRoot, skillPath)}), skipped`);
}

if (stale) process.exit(1);
