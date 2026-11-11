import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, test } from "bun:test";

const lsoWebRoot = path.resolve(import.meta.dir, "../../..");
const repoRoot = path.resolve(lsoWebRoot, "../../..");
const lseWebRoot = path.join(repoRoot, "services/lse/web");
const hook = path.join(repoRoot, ".agents/hooks/ds-check.sh");
// The hook lives outside services/lso/web; a sparse checkout without it (the CI unit job) skips the hook suites.
const hookCheckedOut = fs.existsSync(hook);

let scratch: string;
let calls: string;
let fakeRunner: string;

type Payload = Record<string, unknown>;

const claudeEdit = (file: string): Payload => ({
  hook_event_name: "PostToolUse",
  tool_name: "Edit",
  tool_input: { file_path: file, old_string: "a", new_string: "b" },
  tool_response: { filePath: file },
});
const cursorAfterFileEdit = (file: string): Payload => ({
  hook_event_name: "afterFileEdit",
  file_path: file,
  edits: [{ old_string: "a", new_string: "b" }],
});
const cursorPostToolUse = (file: string): Payload => ({
  hook_event_name: "postToolUse",
  tool_name: "Write",
  tool_input: { file_path: file },
});

/** Runs the hook with a payload; `exit` is what the fake ds:check runner returns, `message` what it prints. */
function run(payload: Payload, { exit = 0, message = "", real = false } = {}) {
  fs.writeFileSync(calls, "");
  const env: Record<string, string> = { ...process.env, DS_CHECK_CALLS: calls, DS_CHECK_FAKE_EXIT: String(exit) };
  env.DS_CHECK_FAKE_MESSAGE = message;
  if (!real) env.DS_CHECK_CMD = fakeRunner;
  else delete env.DS_CHECK_CMD;
  const started = performance.now();
  const result = Bun.spawnSync([hook], {
    cwd: repoRoot,
    stdin: Buffer.from(JSON.stringify(payload)),
    stdout: "pipe",
    stderr: "pipe",
    env,
  });
  return {
    code: result.exitCode,
    stdout: result.stdout.toString(),
    stderr: result.stderr.toString(),
    ms: performance.now() - started,
    calls: fs.readFileSync(calls, "utf-8").trim(),
  };
}

beforeAll(() => {
  scratch = fs.mkdtempSync(path.join(os.tmpdir(), "ds-check-hook-"));
  calls = path.join(scratch, "calls.log");
  fakeRunner = path.join(scratch, "fake-ds-check.sh");
  fs.writeFileSync(
    fakeRunner,
    [
      "#!/usr/bin/env bash",
      'printf "%s %s\\n" "$PWD" "$*" >> "$DS_CHECK_CALLS"',
      'if [ -n "$DS_CHECK_FAKE_MESSAGE" ]; then printf "%s\\n" "$DS_CHECK_FAKE_MESSAGE" >&2; fi',
      'exit "$DS_CHECK_FAKE_EXIT"',
      "",
    ].join("\n"),
    { mode: 0o755 },
  );
});

afterAll(() => fs.rmSync(scratch, { recursive: true, force: true }));

describe.skipIf(!hookCheckedOut)("path filter", () => {
  const silent = (name: string, payload: Payload) =>
    test(name, () => {
      const r = run(payload, { exit: 1, message: "would have been a regression" });
      expect(r.stdout).toBe("");
      expect(r.stderr).toBe("");
      expect(r.code).toBe(0);
      expect(r.calls).toBe("");
    });

  silent(
    "a Python file is ignored",
    claudeEdit(path.join(repoRoot, "services/lse/label_studio_enterprise/core/views.py")),
  );
  silent("a file under libs/ui is ignored", claudeEdit(path.join(lsoWebRoot, "libs/ui/src/lib/button/button.tsx")));
  silent(
    "a web file outside the two webs is ignored",
    claudeEdit(path.join(repoRoot, "libs/interface-components/src/App.tsx")),
  );
  silent("a markdown file in the web is ignored", claudeEdit(path.join(lseWebRoot, "apps/labelstudio/README.md")));
  silent(
    "a Cursor afterFileEdit on a Python file is ignored",
    cursorAfterFileEdit(path.join(repoRoot, "services/lso/label_studio/core/utils.py")),
  );
  silent("an empty payload is ignored", {});
  silent("a payload without a path is ignored", {
    hook_event_name: "PostToolUse",
    tool_name: "Bash",
    tool_input: { command: "ls" },
  });
});

describe.skipIf(!hookCheckedOut)("checkouts the gate does not apply to", () => {
  test("a web root that does not exist is ignored", () => {
    const r = run(claudeEdit(path.join(lsoWebRoot, "node_modules/x/services/lse/web/apps/a.tsx")), {
      exit: 1,
      message: "x",
    });
    expect(r.stdout).toBe("");
    expect(r.stderr).toBe("");
    expect(r.code).toBe(0);
    expect(r.calls).toBe("");
  });

  test("a web whose package.json has no ds:check script is ignored", () => {
    const oldWeb = path.join(scratch, "old/services/lso/web");
    fs.mkdirSync(path.join(oldWeb, "apps"), { recursive: true });
    fs.writeFileSync(path.join(oldWeb, "package.json"), JSON.stringify({ scripts: { lint: "biome check ." } }));
    const r = run(claudeEdit(path.join(oldWeb, "apps/a.tsx")), { exit: 1, message: "x" });
    expect(r.stdout).toBe("");
    expect(r.stderr).toBe("");
    expect(r.code).toBe(0);
    expect(r.calls).toBe("");
  });
});

describe("ds:check exit codes", () => {
  test("a tool error exits 2, never 1", () => {
    const result = Bun.spawnSync(["bun", "tools/ds-check/cli.ts", "--web", "nope"], {
      cwd: lsoWebRoot,
      stdout: "pipe",
      stderr: "pipe",
    });
    expect(result.exitCode).toBe(2);
    expect(result.stderr.toString()).toContain("--web must be lso or lse");
  });
});

describe.skipIf(!hookCheckedOut)("exit paths", () => {
  const lseFile = path.join(lseWebRoot, "apps/labelstudio/src/pages/Example.tsx");
  const lsoCss = path.join(lsoWebRoot, "apps/labelstudio/src/styles.css");

  test("runs ds:check in the web of the edited file", () => {
    const r = run(claudeEdit(lseFile));
    expect(r.calls).toBe(`${lseWebRoot} ${lseFile}`);
    const r2 = run(cursorAfterFileEdit(lsoCss));
    expect(r2.calls).toBe(`${lsoWebRoot} ${lsoCss}`);
  });

  test("a clean file prints nothing", () => {
    const r = run(claudeEdit(lseFile), { exit: 0, message: "[ds-check] lse: no regressions in 1 changed file(s)" });
    expect(r.stdout).toBe("");
    expect(r.code).toBe(0);
  });

  test("a regression reaches Claude Code as additionalContext and the edit stands", () => {
    const message = "apps/x.tsx  raw-control 0 → 1\n    apps/x.tsx:3  Use Button from @humansignal/ui";
    const r = run(claudeEdit(lseFile), { exit: 1, message });
    expect(r.code).toBe(0);
    const out = JSON.parse(r.stdout);
    expect(out.hookSpecificOutput.hookEventName).toBe("PostToolUse");
    expect(out.hookSpecificOutput.additionalContext).toContain("raw-control 0 → 1");
    expect(out.hookSpecificOutput.additionalContext).toContain("Use Button from @humansignal/ui");
    expect(out.decision).toBeUndefined();
  });

  test("a regression reaches Cursor postToolUse as additional_context", () => {
    const r = run(cursorPostToolUse(lseFile), { exit: 1, message: "apps/x.tsx  raw-control 0 → 1" });
    expect(r.code).toBe(0);
    const out = JSON.parse(r.stdout);
    expect(out.additional_context).toContain("raw-control 0 → 1");
    expect(out.hookSpecificOutput).toBeUndefined();
  });

  test("a regression on an event without a feedback channel is printed as text", () => {
    const r = run(cursorAfterFileEdit(lseFile), { exit: 1, message: "apps/x.tsx  raw-control 0 → 1" });
    expect(r.code).toBe(0);
    expect(r.stdout).toContain("raw-control 0 → 1");
    expect(() => JSON.parse(r.stdout)).toThrow();
  });

  test("a missing bun is reported on stderr without blocking", () => {
    const env = { ...process.env, PATH: "/usr/bin:/bin", HOME: scratch };
    const result = Bun.spawnSync([hook], {
      cwd: repoRoot,
      stdin: Buffer.from(JSON.stringify(claudeEdit(lseFile))),
      stdout: "pipe",
      stderr: "pipe",
      env,
    });
    expect(result.stdout.toString()).toBe("");
    expect(result.stderr.toString()).toContain("bun is not on PATH");
    expect(result.exitCode).toBe(1);
  });

  test("a ds:check tool error is reported on stderr without blocking", () => {
    const r = run(claudeEdit(lseFile), {
      exit: 2,
      message: "[ds-check] cannot find the merge base of origin/main and HEAD",
    });
    expect(r.stdout).toBe("");
    expect(r.stderr).toContain("cannot find the merge base");
    expect(r.code).toBe(1);
  });
});

describe.skipIf(!hookCheckedOut)("end to end", () => {
  const probeDir = path.join(lseWebRoot, "apps/labelstudio/src/pages/HookProbe");
  const probe = path.join(probeDir, "HookProbe.tsx");

  test.skipIf(!fs.existsSync(path.dirname(probeDir)))(
    "a raw <button> written to a real web file comes back with the component to use",
    () => {
      fs.mkdirSync(probeDir);
      fs.writeFileSync(probe, 'export const HookProbe = () => <button type="button">Probe</button>;\n');
      try {
        const r = run(claudeEdit(probe), { real: true });
        console.log(`[hook.test] real ds:check round trip: ${Math.round(r.ms)} ms`);
        expect(r.stderr).toBe("");
        expect(r.code).toBe(0);
        const out = JSON.parse(r.stdout);
        const context: string = out.hookSpecificOutput.additionalContext;
        expect(context).toContain("raw-control 0 → 1");
        expect(context).toContain("Button");
        expect(context).toContain("@humansignal/ui");
      } finally {
        fs.rmSync(probeDir, { recursive: true, force: true });
      }
    },
    30_000,
  );
});
