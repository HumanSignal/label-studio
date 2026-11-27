import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { changedFiles, mergeBase, prefetchBaseBlobs, readAtBase } from "../git";

let repoRoot: string;
let webRoot: string;
let base: string;

const git = (...args: string[]) => {
  const result = Bun.spawnSync(["git", ...args], { cwd: repoRoot, stdout: "pipe", stderr: "pipe" });
  if (result.exitCode !== 0) throw new Error(result.stderr.toString());
  return result.stdout.toString().trim();
};
const write = (rel: string, content: string) => {
  fs.mkdirSync(path.dirname(path.join(webRoot, rel)), { recursive: true });
  fs.writeFileSync(path.join(webRoot, rel), content);
};

beforeAll(() => {
  repoRoot = fs.mkdtempSync(path.join(os.tmpdir(), "ds-check-git-"));
  webRoot = path.join(repoRoot, "services/lse/web");
  git("init", "-q", "-b", "main");
  git("config", "user.email", "test@example.com");
  git("config", "user.name", "test");
  write("apps/a/Edited.tsx", "export const A = 1;\n");
  write("apps/a/Moved.tsx", `${"export const keep = 'same content so git sees a rename';\n".repeat(5)}`);
  write("apps/a/Deleted.tsx", "export const D = 1;\n");
  write("apps/a/Unchanged.tsx", "export const U = 1;\n");
  fs.mkdirSync(path.join(repoRoot, "services/lso/web/apps"), { recursive: true });
  fs.writeFileSync(path.join(repoRoot, "services/lso/web/apps/Other.tsx"), "x\n");
  git("add", "-A");
  git("commit", "-q", "-m", "base");
  git("checkout", "-q", "-b", "feature");
  write("apps/a/Edited.tsx", "export const A = 2;\n");
  fs.mkdirSync(path.join(webRoot, "apps/b"), { recursive: true });
  git("mv", "services/lse/web/apps/a/Moved.tsx", "services/lse/web/apps/b/Moved.tsx");
  git("rm", "-q", "services/lse/web/apps/a/Deleted.tsx");
  write("apps/a/Added.tsx", "export const N = 1;\n");
  git("add", "-A");
  git("commit", "-q", "-m", "feature");
  write("apps/a/Untracked.tsx", "export const T = 1;\n");
  fs.writeFileSync(path.join(repoRoot, "services/lso/web/apps/Other.tsx"), "y\n");
  base = mergeBase(repoRoot, "main");
});

afterAll(() => fs.rmSync(repoRoot, { recursive: true, force: true }));

describe("ds-check git base", () => {
  test("lists this web's changes against the merge base, with the path each file had there", () => {
    expect(changedFiles(repoRoot, webRoot, base)).toEqual([
      { file: "apps/a/Added.tsx", baseFile: null },
      { file: "apps/a/Edited.tsx", baseFile: "apps/a/Edited.tsx" },
      { file: "apps/a/Untracked.tsx", baseFile: null },
      { file: "apps/b/Moved.tsx", baseFile: "apps/a/Moved.tsx" },
    ]);
  });

  test("reads a file as it was at the merge base", () => {
    expect(readAtBase(repoRoot, webRoot, base, "apps/a/Edited.tsx")).toBe("export const A = 1;\n");
    expect(readAtBase(repoRoot, webRoot, base, "apps/a/Added.tsx")).toBeNull();
  });

  test("prefetching is a no-op outside a partial clone, where every blob is already local", () => {
    expect(prefetchBaseBlobs(repoRoot, webRoot, base, ["apps/a/Edited.tsx", "apps/a/Moved.tsx"])).toBe(0);
  });

  test("an unknown base ref is an error that says how to fix it", () => {
    expect(() => mergeBase(repoRoot, "origin/nope")).toThrow(/git fetch/);
  });
});
