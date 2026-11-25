/** The merge base with the target branch is the baseline: changed files are compared with their version there. */
import path from "node:path";

export type Change = { file: string; baseFile: string | null };

function git(repoRoot: string, args: string[]) {
  const result = Bun.spawnSync(["git", ...args], { cwd: repoRoot, stdout: "pipe", stderr: "pipe" });
  return { ok: result.exitCode === 0, out: result.stdout.toString(), err: result.stderr.toString().trim() };
}

const webPrefix = (repoRoot: string, webRoot: string) =>
  `${path.relative(repoRoot, webRoot).split(path.sep).join("/")}/`;

export function mergeBase(repoRoot: string, ref: string): string {
  const result = git(repoRoot, ["merge-base", ref, "HEAD"]);
  if (!result.ok) {
    throw new Error(
      `cannot find the merge base with ${ref} (${result.err || "no common history"}). Run \`git fetch origin\` or pass --base <ref>.`,
    );
  }
  return result.out.trim();
}

/**
 * This web's files that differ from `base` (committed, staged, unstaged or untracked), relative to the web root.
 * `baseFile` is the path the file had at `base`: the same path, the old path of a rename, or null for a new file.
 */
export function changedFiles(repoRoot: string, webRoot: string, base: string): Change[] {
  const prefix = webPrefix(repoRoot, webRoot);
  const toWeb = (p: string) => (p.startsWith(prefix) ? p.slice(prefix.length) : null);
  const changes = new Map<string, string | null>();

  const diff = git(repoRoot, ["diff", "--name-status", "-M", "--no-color", base, "--", prefix]);
  if (!diff.ok) throw new Error(`git diff against ${base} failed: ${diff.err}`);
  for (const line of diff.out.split("\n").filter(Boolean)) {
    const [status, first, second] = line.split("\t");
    if (status.startsWith("D")) continue;
    if (status.startsWith("R")) {
      const file = toWeb(second);
      if (file) changes.set(file, toWeb(first));
      continue;
    }
    const file = toWeb(first);
    if (file) changes.set(file, status.startsWith("A") || status.startsWith("C") ? null : file);
  }

  const untracked = git(repoRoot, ["ls-files", "--others", "--exclude-standard", "--full-name", "--", prefix]);
  for (const line of untracked.out.split("\n").filter(Boolean)) {
    const file = toWeb(line);
    if (file) changes.set(file, null);
  }

  return [...changes.entries()]
    .map(([file, baseFile]) => ({ file, baseFile }))
    .sort((a, b) => a.file.localeCompare(b.file));
}

/**
 * In a partial (blobless) clone, as on the CI runner, `git show` fetches each missing base version in its own
 * round trip. Fetching every needed blob in one request first turns hundreds of round trips into one.
 * Returns the number of blobs requested; 0 when the clone is not partial or nothing is needed.
 */
export function prefetchBaseBlobs(repoRoot: string, webRoot: string, base: string, baseFiles: string[]): number {
  if (!baseFiles.length || git(repoRoot, ["config", "--get", "remote.origin.promisor"]).out.trim() !== "true") return 0;
  const prefix = webPrefix(repoRoot, webRoot);
  const tree = git(repoRoot, ["ls-tree", "-z", base, "--", ...baseFiles.map((f) => `${prefix}${f}`)]);
  const oids = tree.out
    .split("\0")
    .filter(Boolean)
    .map((entry) => entry.split("\t")[0].split(" "))
    .filter(([, type]) => type === "blob")
    .map(([, , oid]) => oid);
  if (!oids.length) return 0;
  const fetch = Bun.spawnSync(
    ["git", "fetch", "origin", "--no-tags", "--no-write-fetch-head", "--recurse-submodules=no", "--stdin"],
    { cwd: repoRoot, stdin: Buffer.from(`${oids.join("\n")}\n`), stdout: "pipe", stderr: "pipe" },
  );
  if (fetch.exitCode !== 0) return 0;
  return oids.length;
}

/** A file's content at `base`, or null when it did not exist there. `file` is relative to the web root. */
export function readAtBase(repoRoot: string, webRoot: string, base: string, file: string): string | null {
  const result = git(repoRoot, ["show", `${base}:${webPrefix(repoRoot, webRoot)}${file}`]);
  return result.ok ? result.out : null;
}
