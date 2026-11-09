import path from "node:path";
import { describe, expect, test } from "bun:test";
import { runBiomePlugins } from "../../../ds-check/biome";

const webRoot = path.resolve(import.meta.dir, "../../../..");
const fixtures = path.join(import.meta.dir, "fixtures");
const rel = (name: string) => path.relative(webRoot, path.join(fixtures, name));

const findings = runBiomePlugins(webRoot, [rel("violations.tsx"), rel("allowed.tsx"), rel("libs/ui/inside-ds.tsx")]);
const byFile = (name: string) =>
  findings
    .filter((f) => f.file === rel(name))
    .map((f) => `${f.line} ${f.rule}`)
    .sort();

describe("design-system Biome plugins", () => {
  test("report every documented violation with its line", () => {
    expect(byFile("violations.tsx")).toEqual(
      [
        "4 inline-style-token",
        "5 raw-control",
        "8 raw-control",
        "9 raw-control",
        "10 raw-control",
        "12 badge-props",
        "15 badge-props",
        "18 avatar-size",
      ].sort(),
    );
  });

  test("messages name the design-system replacement", () => {
    const messages = findings.filter((f) => f.file === rel("violations.tsx")).map((f) => f.message);
    expect(messages.some((m) => m.includes("Button"))).toBe(true);
    expect(messages.some((m) => m.includes("DataTable"))).toBe(true);
    expect(messages.some((m) => m.includes("Checkbox"))).toBe(true);
  });

  test("stay silent on DS components, position-only styles and named sizes", () => {
    expect(byFile("allowed.tsx")).toEqual([]);
  });

  test("stay silent inside libs/ui", () => {
    expect(byFile("libs/ui/inside-ds.tsx")).toEqual([]);
  });
});
