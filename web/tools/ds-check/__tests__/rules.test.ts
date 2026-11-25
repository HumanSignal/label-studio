import fs from "node:fs";
import path from "node:path";
import { describe, expect, test } from "bun:test";
import { DS_RULES } from "../rules";

const checkDir = path.resolve(import.meta.dir, "..");
const pluginDir = path.resolve(import.meta.dir, "../../biome/plugins");

const read = (dir: string, ext: string) =>
  fs
    .readdirSync(dir)
    .filter((name) => name.endsWith(ext))
    .map((name) => fs.readFileSync(path.join(dir, name), "utf-8"));

function emittedRules(): Set<string> {
  const rules = new Set<string>();
  for (const source of read(checkDir, ".ts")) {
    for (const [, rule] of source.matchAll(/\brule: "([a-z-]+)"/g)) rules.add(rule);
    for (const [, rule] of source.matchAll(/_RULE = "([a-z-]+)"/g)) rules.add(rule);
  }
  for (const source of read(pluginDir, ".grit")) {
    for (const [, rule] of source.matchAll(/\[ds\/([a-z-]+)\]/g)) rules.add(rule);
  }
  return rules;
}

describe("DS_RULES", () => {
  test("lists every rule the checks and the Biome plugins report, and nothing else", () => {
    expect([...DS_RULES].sort()).toEqual([...emittedRules()].sort());
  });

  test("is sorted and has no duplicates", () => {
    expect([...DS_RULES]).toEqual([...new Set(DS_RULES)].sort());
  });
});
