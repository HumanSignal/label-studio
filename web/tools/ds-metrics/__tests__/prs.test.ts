import { describe, expect, test } from "bun:test";
import { type GitRunner, mergedPrs, parseMergeLog, touchesWeb } from "../prs";

const LOG = [
  "aaa1\tfix: UTC-1: Web thing (#11)",
  "bbb2\tchore: bump deps",
  "ccc3\tfeat: UTC-2: Backend only (#22)",
  "",
].join("\n");

/** Fakes git: the log is fixed; `diff --quiet` exits 1 (changed) for the shas in `webShas`, 0 otherwise. */
const fakeGit =
  (webShas: string[], logExit = 0): GitRunner =>
  (args) => {
    if (args[0] === "log") return { exitCode: logExit, stdout: logExit ? "" : LOG, stderr: logExit ? "bad range" : "" };
    const sha = args[3];
    return { exitCode: webShas.includes(sha) ? 1 : 0, stdout: "", stderr: "" };
  };

describe("parseMergeLog", () => {
  test("keeps the merges with a PR number and strips it from the title", () => {
    expect(parseMergeLog(LOG)).toEqual([
      { number: 11, title: "fix: UTC-1: Web thing", commit: "aaa1" },
      { number: 22, title: "feat: UTC-2: Backend only", commit: "ccc3" },
    ]);
  });
});

describe("touchesWeb", () => {
  test("a merge without web changes is left out, an unreadable one is kept", () => {
    expect(touchesWeb("aaa1", fakeGit(["aaa1"]))).toBe(true);
    expect(touchesWeb("ccc3", fakeGit(["aaa1"]))).toBe(false);
    expect(touchesWeb("x", () => ({ exitCode: 128, stdout: "", stderr: "no parent" }))).toBe(true);
  });
});

describe("mergedPrs", () => {
  test("lists only the PRs since the previous point that changed web code", () => {
    expect(mergedPrs("head", "prev", fakeGit(["aaa1"]))).toEqual([
      { number: 11, title: "fix: UTC-1: Web thing", commit: "aaa1" },
    ]);
  });

  test("a bad range is an error when --since was given, and no PRs otherwise", () => {
    expect(() => mergedPrs("head", "nope", fakeGit([], 128))).toThrow("git log nope..head failed");
    expect(mergedPrs("test0000", undefined, fakeGit([], 128))).toEqual([]);
  });
});
