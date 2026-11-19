import fs from "node:fs";
import path from "node:path";
import { describe, expect, test } from "bun:test";
import { loadManifest, registryPath, renderRegistry, skillPath } from "../../../tools/ds-manifest/load";
import { extractSkillSection, renderSkillSection } from "../../../tools/ds-manifest/render-skill";
import { manifestConfig } from "./ds-manifest/config";
import { CATEGORIES } from "./ds-manifest/types";

/**
 * Guards the component manifests: every component folder exported from index.ts carries a
 * `<name>.manifest.ts` and a story, every public export is classified exactly once, the generated
 * registry and the design-system skill match the fragments. `bun run ds:manifest --check` runs the
 * same contract as the lint gate; this test adds what needs the real public API.
 */

const uiSrcDir = import.meta.dir;
const skillCheckedOut = fs.existsSync(skillPath);
const loaded = await loadManifest();
const { manifest } = loaded;
const tier1 = Object.values(manifest.components).filter((c) => c.tier === 1 && !c.deprecated);

const isComponentLike = (value: unknown) =>
  typeof value === "function" || (typeof value === "object" && value !== null && "$$typeof" in value);

describe("component manifests", () => {
  test("every exported folder has a manifest and a story, and the entries respect the contract", () => {
    if (loaded.skippedPaths.length)
      console.info(`[ds-manifest] ${loaded.skippedPaths.length} replaced paths not checked: tree not checked out`);
    expect(loaded.problems).toEqual([]);
  });

  test("every capitalised export of @humansignal/ui is classified exactly once", async () => {
    const api = await import("./index");
    const exported = Object.keys(api).filter((name) => /^[A-Z]/.test(name));

    const owners = new Map<string, string[]>();
    const claim = (name: string, owner: string) => owners.set(name, [...(owners.get(name) ?? []), owner]);
    for (const c of Object.values(manifest.components)) for (const exp of c.exports) claim(exp, c.name);
    for (const name of Object.keys(manifestConfig.internal)) claim(name, "internal");
    for (const name of manifestConfig.nonComponents) claim(name, "nonComponents");

    const unclassified = exported.filter((name) => !owners.has(name));
    const stale = [...owners.keys()].filter((name) => !exported.includes(name));
    expect(
      unclassified,
      "exports with no manifest entry: add them to the folder's manifest, to internal or to nonComponents",
    ).toEqual([]);
    expect(stale, "manifest names that @humansignal/ui no longer exports").toEqual([]);

    const miscategorised = manifestConfig.nonComponents.filter((name) =>
      isComponentLike((api as Record<string, unknown>)[name]),
    );
    expect(miscategorised, "nonComponents entries that are React components").toEqual([]);

    const promoted = Object.keys(manifestConfig.gaps).filter((name) => name in api);
    expect(promoted, "the library now exports these: move them from gaps to a manifest").toEqual([]);
  });

  test("retired copies are deleted files, never also listed under replaces", async () => {
    const { manifest } = await loadManifest();
    const repo = path.resolve(uiSrcDir, "../../../../..");
    for (const c of Object.values(manifest.components)) {
      for (const retired of c.retired ?? []) {
        expect(retired.startsWith("services/")).toBe(true);
        expect(fs.existsSync(path.join(repo, retired))).toBe(false);
        expect(c.replaces).not.toContain(retired);
      }
    }
    expect(manifest.components.ModalWindow.retired?.length).toBeGreaterThan(0);
  });

  test("every component declares a category from the fixed list", () => {
    const uncategorised = Object.values(manifest.components)
      .filter((c) => !CATEGORIES.includes(c.category))
      .map((c) => c.name);
    expect(uncategorised, `category must be one of: ${CATEGORIES.join(", ")}`).toEqual([]);
    const used = new Set(Object.values(manifest.components).map((c) => c.category));
    expect(
      [...CATEGORIES].filter((category) => !used.has(category)),
      "categories with no component",
    ).toEqual([]);
  });

  test("every story of a component is titled <Category>/…, so Storybook lists it under that section", () => {
    const misplaced: string[] = [];
    for (const c of Object.values(manifest.components)) {
      const dir = path.join(uiSrcDir, c.dir);
      for (const file of fs.readdirSync(dir).filter((name) => name.endsWith(".stories.tsx"))) {
        const title = fs.readFileSync(path.join(dir, file), "utf-8").match(/^\s*title:\s*"([^"]+)"/m)?.[1];
        if (!title?.startsWith(`${c.category}/`)) misplaced.push(`${c.dir}/${file}: ${title}`);
      }
    }
    expect(misplaced).toEqual([]);
  });

  test("the loader reports a story titled outside its component's category", async () => {
    const story = path.join(uiSrcDir, "lib/button/button.stories.tsx");
    const original = fs.readFileSync(story, "utf-8");
    try {
      fs.writeFileSync(story, original.replace(/title:\s*"[^"]+"/, 'title: "UI/Button"'));
      const { problems } = await loadManifest();
      expect(problems.some((problem) => problem.includes("button.stories.tsx") && problem.includes("Inputs/"))).toBe(
        true,
      );
    } finally {
      fs.writeFileSync(story, original);
    }
  });

  test("Storybook lists the sections in the order of the category list", () => {
    const preview = fs.readFileSync(path.resolve(uiSrcDir, "../../storybook/.storybook/preview.tsx"), "utf-8");
    const order = preview.match(/order:\s*\[([^\]]+)\]/)?.[1] ?? "";
    const sections = [...order.matchAll(/"([^"]+)"/g)].map((match) => match[1]);
    expect(sections.filter((section) => (CATEGORIES as readonly string[]).includes(section))).toEqual([...CATEGORIES]);
  });

  test("the generated registry matches the fragments", () => {
    expect(fs.readFileSync(registryPath, "utf-8"), "run `bun run ds:manifest` in services/lso/web").toBe(
      renderRegistry(manifest),
    );
  });

  test("a deprecated entry never answers a lookup and names a live replacement", () => {
    const deprecated = Object.values(manifest.components).filter((c) => c.deprecated);
    for (const c of deprecated) {
      expect(c.intent, `${c.name} must not carry an intent`).toEqual([]);
      const target = manifest.components[c.deprecated?.replaced_by ?? ""];
      expect(target, `${c.name}: replaced_by must be a manifest entry`).toBeDefined();
      expect(target.deprecated, `${c.name}: replaced_by must be live`).toBeUndefined();
    }
  });

  test.skipIf(!skillCheckedOut)("the design-system skill carries the section rendered from the manifests", () => {
    const skill = fs.readFileSync(skillPath, "utf-8");
    expect(extractSkillSection(skill), "run `bun run ds:manifest` in services/lso/web").toBe(
      renderSkillSection(manifest),
    );
  });

  test("reports tier 1 components whose main export lacks a JSDoc (informational)", () => {
    const undocumented: string[] = [];
    for (const c of tier1) {
      const dir = path.join(uiSrcDir, c.dir);
      const sources = fs
        .readdirSync(dir)
        .filter((file) => /\.tsx?$/.test(file) && !/\.(test|spec|stories|manifest)\.tsx?$/.test(file))
        .map((file) => fs.readFileSync(path.join(dir, file), "utf-8"));
      const documented = sources.some((src) =>
        new RegExp(`\\*/\\s*\\n\\s*export (const|function|class) ${c.name}\\b`).test(src),
      );
      if (!documented) undocumented.push(c.name);
    }
    if (undocumented.length)
      console.info(`[ds-manifest] tier 1 components without a JSDoc: ${undocumented.join(", ")}`);
    expect(true).toBe(true);
  });
});
