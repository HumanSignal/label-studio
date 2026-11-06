import path from "node:path";
import { describe, expect, test } from "bun:test";
import { checkChanges } from "../check";
import { buildContext } from "../scan";
import type { Finding } from "../types";

const webRoot = "/repo/services/lse/web";
const ctx = buildContext({
  repoRoot: "/repo",
  webRoot,
  tokenNames: new Set(),
  manifest: { components: {} },
  isDirectory: () => false,
});

const RED = 'const a = "#ff0000";\n';
const noLint = () => [];

const run = (
  changes: { file: string; baseFile: string | null }[],
  now: Record<string, string>,
  then: Record<string, string>,
  lint: (root: string, paths: string[], read: (p: string) => string) => Finding[] = noLint,
) =>
  checkChanges({
    webRoot,
    changes,
    ctx,
    readCurrent: (file) => now[file],
    readBase: (file) => then[file] ?? null,
    lint: (root, paths) => lint(root, paths, (p) => (p in now ? now[p] : then[p.replace(/^[^/]+\//, "")])),
    mirror: { write: () => {}, remove: () => {} },
  });

describe("ds-check against the merge base", () => {
  test("a file gaining a violation is a regression", () => {
    const result = run(
      [{ file: "apps/x/A.tsx", baseFile: "apps/x/A.tsx" }],
      { "apps/x/A.tsx": RED + RED },
      {
        "apps/x/A.tsx": RED,
      },
    );
    expect(result.regressions).toEqual([{ file: "apps/x/A.tsx", rule: "color-literal", was: 1, now: 2 }]);
  });

  test("a new file must be clean", () => {
    const result = run([{ file: "apps/x/N.tsx", baseFile: null }], { "apps/x/N.tsx": RED }, {});
    expect(result.regressions).toEqual([{ file: "apps/x/N.tsx", rule: "color-literal", was: 0, now: 1 }]);
  });

  test("a moved file is compared with its old path, so known violations travel with it", () => {
    const result = run(
      [{ file: "apps/y/M.tsx", baseFile: "apps/x/M.tsx" }],
      { "apps/y/M.tsx": RED },
      {
        "apps/x/M.tsx": RED,
      },
    );
    expect(result).toMatchObject({ regressions: [], improvements: [] });
  });

  test("fewer violations pass and are reported, with nothing to commit", () => {
    const result = run(
      [{ file: "apps/x/A.tsx", baseFile: "apps/x/A.tsx" }],
      { "apps/x/A.tsx": "" },
      {
        "apps/x/A.tsx": RED,
      },
    );
    expect(result.regressions).toEqual([]);
    expect(result.improvements).toEqual([{ file: "apps/x/A.tsx", rule: "color-literal", was: 1, now: 0 }]);
  });

  test("files outside the design-system scope are skipped", () => {
    const result = run([{ file: "apps/x/A.test.tsx", baseFile: null }], { "apps/x/A.test.tsx": RED }, {});
    expect(result.files).toEqual([]);
  });

  test("lints the base version from a mirror folder and maps findings back to the current path", () => {
    const seen: string[][] = [];
    const lint = (_root: string, paths: string[]) => {
      seen.push(paths);
      return paths.map((p) => ({ file: p, line: 1, rule: "raw-control", message: "Use Button" }));
    };
    const result = run(
      [{ file: "apps/y/M.tsx", baseFile: "apps/x/M.tsx" }],
      { "apps/y/M.tsx": "" },
      {
        "apps/x/M.tsx": "",
      },
      lint,
    );
    expect(seen[0]).toEqual(["apps/y/M.tsx"]);
    expect(seen[1]).toHaveLength(1);
    expect(seen[1][0]).toMatch(/^\.ds-check-base-[\w-]+\/apps\/x\/M\.tsx$/);
    expect(result.base).toEqual({ "apps/y/M.tsx": { "raw-control": 1 } });
    expect(result.regressions).toEqual([]);
    expect(path.isAbsolute(seen[1][0])).toBe(false);
  });
});
