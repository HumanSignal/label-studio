/**
 * The pull requests a snapshot point covers: the squash merges on main's first-parent line since the previous
 * point (or the commit's own merge), kept only when they changed web code, since nothing else can move the numbers.
 */
import type { PrRef } from "./snapshot";

export type GitResult = { exitCode: number; stdout: string; stderr: string };
export type GitRunner = (args: string[]) => GitResult;

const WEB_PATHS = ["services/lso/web", "services/lse/web"];

/** `%H%x09%s` log lines → the merges that carry a PR number in their subject. */
export function parseMergeLog(log: string): PrRef[] {
  return log
    .split("\n")
    .filter(Boolean)
    .flatMap((line) => {
      const [sha, subject = ""] = line.split("\t");
      const match = subject.match(/\(#(\d+)\)\s*$/);
      return match ? [{ number: Number(match[1]), title: subject.slice(0, match.index).trim(), commit: sha }] : [];
    });
}

/** Whether the merge changed a web file against its first parent; unknown (no parent, git error) counts as yes. */
export function touchesWeb(sha: string, git: GitRunner): boolean {
  return git(["diff", "--quiet", `${sha}^1`, sha, "--", ...WEB_PATHS]).exitCode !== 0;
}

/**
 * `since` given: the PRs in `since..commit`; a failing log is an error (a wrong sha must not pass silently).
 * No `since`: the commit's own PR, or none when git cannot read it (a snapshot of a bare `--commit` id).
 */
export function mergedPrs(commit: string, since: string | undefined, git: GitRunner): PrRef[] {
  const range = since ? `${since}..${commit}` : `${commit}^!`;
  const log = git(["log", "--first-parent", "--format=%H%x09%s", range]);
  if (log.exitCode !== 0) {
    if (since) throw new Error(`git log ${range} failed:\n${log.stderr.trim()}`);
    return [];
  }
  return parseMergeLog(log.stdout).filter((pr) => touchesWeb(pr.commit, git));
}
