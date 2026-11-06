import path from "node:path";
import { describe, expect, test } from "bun:test";
import { annotate } from "../findings";

const finding = (rule: string, message: string) => ({ file: "apps/x.tsx", line: 1, rule, message });

describe("annotate", () => {
  test("raw controls carry the element and the component to use", () => {
    expect(
      annotate(finding("raw-control", "Use Button from @humansignal/ui (look filled), not a raw <button>.")),
    ).toMatchObject({
      element: "button",
      component: "Button",
    });
    expect(annotate(finding("raw-control", "Use Select from @humansignal/ui, not a raw <select>."))).toMatchObject({
      element: "select",
      component: "Select",
    });
    expect(annotate(finding("raw-control", "Use DataTable from @humansignal/ui, not a raw <table>."))).toMatchObject({
      element: "table",
      component: "DataTable",
    });
    expect(
      annotate(
        finding("raw-control", "Use Checkbox from @humansignal/ui (Toggle for a setting), not a raw checkbox input."),
      ),
    ).toMatchObject({ element: "checkbox", component: "Checkbox" });
    expect(
      annotate(
        finding(
          "raw-control",
          "Radio is a design-system gap: add it to libs/ui (or use MultiStateToggle) instead of a raw radio input.",
        ),
      ),
    ).toMatchObject({ element: "radio" });
  });

  test("replaced and deprecated imports carry the component", () => {
    expect(
      annotate(
        finding(
          "replaced-import",
          "Menu (via ../Menu) is a local copy that Dropdown replaces: import Dropdown from @humansignal/ui.",
        ),
      ),
    ).toMatchObject({ component: "Dropdown" });
    expect(
      annotate(finding("deprecated-import", "Userpic is deprecated: use Avatar from @humansignal/ui.")),
    ).toMatchObject({
      component: "Avatar",
    });
  });

  test("rules without a component stay as they are", () => {
    const f = finding("color-literal", "Colour literal #fff: use a semantic token.");
    expect(annotate(f)).toEqual(f);
  });
});

describe("ds:check --all --json", () => {
  test("lists every finding with its annotations", () => {
    const webRoot = path.resolve(import.meta.dir, "../../..");
    const result = Bun.spawnSync(["bun", "tools/ds-check/cli.ts", "--web", "lso", "--all", "--json"], {
      cwd: webRoot,
      stdout: "pipe",
      stderr: "pipe",
    });
    expect(result.exitCode).toBe(0);
    const out = JSON.parse(result.stdout.toString());
    expect(out.findings.length).toBe(out.totals.violations);
    const raw = out.findings.filter((f: { rule: string }) => f.rule === "raw-control");
    expect(raw.length).toBeGreaterThan(0);
    for (const f of raw) expect(["button", "select", "table", "checkbox", "radio"]).toContain(f.element);
    expect(out.findings.every((f: { file: string; line: number }) => typeof f.file === "string" && f.line >= 0)).toBe(
      true,
    );
  }, 60_000);
});
