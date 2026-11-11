import { describe, expect, it } from "bun:test";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { REQUESTED_WITH_HEADER } from "../same-origin-fetch";

/**
 * FIT-2967 guard test.
 *
 * The CSRF fix landing in FIT-2968 requires every session-authenticated unsafe (POST/PUT/PATCH/
 * DELETE) request to carry the `X-Requested-With: XMLHttpRequest` header. `sameOriginFetch`
 * (./same-origin-fetch.ts) and the two API proxies (this lib's `APIProxy.getDefaultHeaders` and
 * the Data Manager's) are the only sanctioned way to get that header onto a same-origin write.
 *
 * This is a lint-style scan (not a bundler/AST pass) over the frontend + Django template sources
 * that fails the build the moment a NEW raw `fetch(...)` with an unsafe method, a raw
 * `navigator.sendBeacon(...)`, or a raw same-origin `XMLHttpRequest.open(...)` with an unsafe
 * method shows up outside the wrapper. It intentionally allow-lists the handful of call sites
 * that must NOT get the header (cross-origin presigned uploads / third-party requests) or that
 * are exempt for other documented reasons (anonymous analytics, a dev-only playground app).
 *
 * Method detection resolves, without a full parser:
 *   - `fetch(url, { method: "POST" })`                       — literal inside the call
 *   - `fetch(url, { method })` / `{ method: verb }`           — `const verb = "POST"` declared above
 *   - `fetch(url, init)`                                      — `const init = { method: "POST", ... }` declared above
 *   - `xhr.open("POST", ...)` / `xhr.open(verb, ...)`         — literal or `const verb = "POST"` declared above
 * A `headers` identifier inside the init object is resolved the same way when checking whether the
 * header is already present. Methods that flow in through function parameters, member access
 * (`opts.method`), or conditionals are NOT resolvable and are not flagged — route those through
 * `sameOriginFetch` anyway.
 *
 * Coverage is limited to what is on disk: CI runs this from a sparse checkout (LSO FE unit checks
 * out `services/lso/web` only), so roots that are not checked out are recorded as unscanned
 * instead of silently passing, and gitignored roots (`GITIGNORED_ROOTS`) are never scanned at all.
 */

// ---------------------------------------------------------------------------
// Repo root discovery — walk up from this file until we find the monorepo root
// (has both a `services` dir and a `.git` entry), so the test works regardless
// of the bun test runner's cwd. `.git` is a file (not a dir) inside a worktree.
// ---------------------------------------------------------------------------
function findRepoRoot(startDir: string): string {
  let dir = startDir;
  for (let i = 0; i < 20; i++) {
    if (existsSync(join(dir, "services")) && existsSync(join(dir, ".git"))) {
      return dir;
    }
    const parent = join(dir, "..");
    if (parent === dir) break;
    dir = parent;
  }
  throw new Error(`Could not locate monorepo root by walking up from ${startDir}`);
}

const REPO_ROOT = findRepoRoot(import.meta.dir);

// ---------------------------------------------------------------------------
// Allow-list: repo-relative paths that are intentionally exempt.
// ---------------------------------------------------------------------------
const ALLOW_LISTED_FILES = new Set<string>([
  // Cross-origin presigned XHR upload to cloud storage — must NOT carry the header, or the
  // presigned URL's signature (computed over an exact header set) would stop validating.
  "services/lse/web/libs/editor-shell/src/sandbox/collection-upload-engine.ts",
  // Third-party (Hubspot) survey widget — cross-origin, not a Label Studio API call.
  "services/lse/web/apps/labelstudio/src/pages/BillingPage/CancelPlanModal/HubspotCancellationSurvey.tsx",
  // Dev-only local playground app — never runs against a real session-authenticated backend.
  "services/lse/web/apps/local-playground/src/save-gateway.ts",
  // Anonymous, unauthenticated analytics beacon (no session cookie / write) — see FIT-2968 for the
  // planned explicit `/__lsa/` server-side exemption.
  "services/lso/web/libs/core/src/lib/utils/analytics.ts",
  "services/lso/label_studio/users/templates/users/new-ui/user_base.html",
  // The wrapper itself legitimately calls the raw global `fetch`.
  "services/lso/web/libs/core/src/lib/api-proxy/same-origin-fetch.ts",
]);

// ---------------------------------------------------------------------------
// Directories scanned for frontend source + Django templates.
// ---------------------------------------------------------------------------
const SOURCE_ROOTS = [
  "services/lso/web/apps",
  "services/lso/web/libs",
  "services/lse/web/apps",
  "services/lse/web/libs",
];

const TEMPLATE_ROOTS = ["services/lso/label_studio", "services/lse/label_studio_enterprise"];

/**
 * Roots this guard can always rely on: the LSO web workspace is the smallest sparse checkout that
 * runs this file (see .github/workflows/lso_fe_test_unit.yaml), so these must never be "unscanned".
 */
const ALWAYS_CHECKED_OUT_ROOTS = ["services/lso/web/apps", "services/lso/web/libs"];

/**
 * Paths that are gitignored (see the repo-root `.gitignore`) and therefore NEVER part of any
 * checkout this test runs in — even when a developer has populated them locally. They are
 * deliberately excluded from the scan so the result does not depend on local state, and listed
 * here so FIT-2968 knows exactly which same-origin writes this guard does NOT cover.
 */
interface GitignoredRoot {
  path: string;
  gitignoreLine: string;
  populatedBy: string;
  /** Same-origin unsafe writes known to live there — the header must be added in the upstream source. */
  knownSameOriginWrites: string[];
  /** Cross-origin unsafe writes known to live there — these must NOT carry the header. */
  knownCrossOriginWrites: string[];
}

const GITIGNORED_ROOTS: GitignoredRoot[] = [
  {
    path: "services/lse/label_studio_enterprise/htx/static/plugins",
    gitignoreLine: "services/lse/label_studio_enterprise/htx/static/plugins/",
    populatedBy:
      "services/lse/web/tools/plugins/index.mjs (git clone of HumanSignal/label-studio-plugins at build time)",
    knownSameOriginWrites: [
      "src/pausing-annotator/plugin.js — pause(): fetch POST /api/projects/:id/members/:id/pauses (add the header upstream in label-studio-plugins)",
    ],
    knownCrossOriginWrites: [
      "src/llm-backend/plugin.js — fetchLLM(): fetch POST to an external LLM endpoint (MY_URL_ROOT placeholder; must NOT carry the header)",
    ],
  },
];

const SOURCE_EXTENSIONS = [".ts", ".tsx", ".js", ".jsx"];

const EXCLUDED_DIR_SEGMENTS = new Set([
  "node_modules",
  "dist",
  "build",
  "coverage",
  ".next",
  "storybook-static",
  "__mocks__",
  "labelstudio-e2e", // Cypress E2E specs — not shipped app runtime code.
]);

function isExcludedTestFile(fileName: string): boolean {
  return (
    /\.(test|spec|cy|stories)\.(ts|tsx|js|jsx)$/.test(fileName) ||
    /\.d\.ts$/.test(fileName) ||
    fileName.endsWith(".stories.tsx") ||
    fileName.endsWith(".stories.ts")
  );
}

const GITIGNORED_ABS_PATHS = new Set(GITIGNORED_ROOTS.map((root) => join(REPO_ROOT, root.path)));

function walk(dir: string, matches: (fileName: string) => boolean, out: string[] = []): string[] {
  // Callers only pass roots that exist (see `partitionRoots`) — a missing root must never be
  // silently skipped here, that is exactly the "pretend we scanned it" failure mode.
  for (const entry of readdirSync(dir)) {
    if (EXCLUDED_DIR_SEGMENTS.has(entry)) continue;

    const fullPath = join(dir, entry);
    // Gitignored roots are never scanned, even if a developer populated them locally.
    if (GITIGNORED_ABS_PATHS.has(fullPath)) continue;

    const stat = statSync(fullPath);

    if (stat.isDirectory()) {
      walk(fullPath, matches, out);
    } else if (stat.isFile() && matches(entry)) {
      out.push(fullPath);
    }
  }

  return out;
}

interface RootPartition {
  checkedOut: string[];
  unscanned: string[];
}

function partitionRoots(roots: string[]): RootPartition {
  const checkedOut: string[] = [];
  const unscanned: string[] = [];

  for (const root of roots) {
    (existsSync(join(REPO_ROOT, root)) ? checkedOut : unscanned).push(root);
  }

  return { checkedOut, unscanned };
}

interface ScanPlan {
  sourceRoots: RootPartition;
  templateRoots: RootPartition;
  files: string[];
}

function buildScanPlan(): ScanPlan {
  const sourceRoots = partitionRoots(SOURCE_ROOTS);
  const templateRoots = partitionRoots(TEMPLATE_ROOTS);
  const files: string[] = [];

  for (const root of sourceRoots.checkedOut) {
    walk(
      join(REPO_ROOT, root),
      (fileName) => {
        if (isExcludedTestFile(fileName)) return false;
        return SOURCE_EXTENSIONS.some((ext) => fileName.endsWith(ext));
      },
      files,
    );
  }

  for (const root of templateRoots.checkedOut) {
    walk(join(REPO_ROOT, root), (fileName) => fileName.endsWith(".html"), files);
  }

  return { sourceRoots, templateRoots, files };
}

function isUnderAnyRoot(repoRelativePath: string, roots: string[]): boolean {
  return roots.some((root) => repoRelativePath === root || repoRelativePath.startsWith(`${root}/`));
}

// ---------------------------------------------------------------------------
// Detection
// ---------------------------------------------------------------------------
const UNSAFE_METHOD_PATTERN = "POST|PUT|PATCH|DELETE";
const IDENTIFIER = "[A-Za-z_$][\\w$]*";

// A raw `fetch(` / `window.fetch(` / `globalThis.fetch(` / `self.fetch(` call, not `sameOriginFetch(`
// / `embedFetch(` (case-sensitive: those have a capital "F", which this lowercase-only pattern never
// matches) and not some other object's `.fetch(` method.
const RAW_FETCH_CALL = /(?<![\w$.])(?:(?:window|globalThis|self)\s*\.\s*)?fetch\s*\(/g;
const SEND_BEACON_CALL = /\.sendBeacon\s*\(/g;
const XHR_OPEN_CALL = new RegExp(
  `\\.open\\s*\\(\\s*(?:["'\`](${UNSAFE_METHOD_PATTERN})["'\`]|(${IDENTIFIER}))\\s*,`,
  "gi",
);
const METHOD_LITERAL = new RegExp(`(?<![\\w$.])method\\s*:\\s*["'\`](${UNSAFE_METHOD_PATTERN})["'\`]`, "i");
const METHOD_IDENTIFIER = new RegExp(`(?<![\\w$.])method\\s*:\\s*(${IDENTIFIER})\\s*(?=[,}\\r\\n])`);
const METHOD_SHORTHAND = /(?<![\w$.:])method\s*(?=[,}\r\n])/;
const HEADERS_IDENTIFIER = new RegExp(`(?<![\\w$.])headers\\s*:\\s*(${IDENTIFIER})\\s*(?=[,}\\r\\n])`);
const HEADERS_SHORTHAND = /(?<![\w$.:])headers\s*(?=[,}\r\n])/;
const HAS_REQUESTED_WITH_HEADER = new RegExp(REQUESTED_WITH_HEADER, "i");
const XHR_TRAILING_WINDOW = 2000; // enough to reach the matching `.send(` in practice

export interface Violation {
  file: string;
  kind: "raw-fetch" | "send-beacon" | "xhr-open";
  snippet: string;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Given the index of an opening bracket in `content`, returns the substring up to (and including)
 * its matching closing bracket, respecting nested brackets and string literals. Used to scope
 * "does this call's arguments already carry the header" checks to the actual call / object,
 * instead of an arbitrary trailing character window (which can bleed into the NEXT unrelated call).
 */
function extractBalanced(content: string, openIndex: number, open: "(" | "{", close: ")" | "}"): string {
  let depth = 0;
  let inString: '"' | "'" | "`" | null = null;

  for (let i = openIndex; i < content.length; i++) {
    const ch = content[i];
    const prev = content[i - 1];

    if (inString) {
      if (ch === inString && prev !== "\\") inString = null;
      continue;
    }
    if (ch === '"' || ch === "'" || ch === "`") {
      inString = ch as '"' | "'" | "`";
      continue;
    }
    if (ch === open) depth++;
    if (ch === close) {
      depth--;
      if (depth === 0) return content.slice(openIndex, i + 1);
    }
  }

  // Unbalanced (shouldn't happen for valid source) — fall back to a generous slice.
  return content.slice(openIndex, openIndex + 2000);
}

/** Splits the inside of a balanced `( ... )` call into its top-level arguments. */
function splitTopLevelArgs(callText: string): string[] {
  const inner = callText.slice(1, -1);
  const args: string[] = [];
  let depth = 0;
  let inString: '"' | "'" | "`" | null = null;
  let current = "";

  for (let i = 0; i < inner.length; i++) {
    const ch = inner[i];
    const prev = inner[i - 1];

    if (inString) {
      current += ch;
      if (ch === inString && prev !== "\\") inString = null;
      continue;
    }
    if (ch === '"' || ch === "'" || ch === "`") {
      inString = ch as '"' | "'" | "`";
      current += ch;
      continue;
    }
    if (ch === "(" || ch === "{" || ch === "[") depth++;
    if (ch === ")" || ch === "}" || ch === "]") depth--;
    if (ch === "," && depth === 0) {
      args.push(current.trim());
      current = "";
      continue;
    }
    current += ch;
  }
  if (current.trim()) args.push(current.trim());

  return args;
}

function lastMatch(regex: RegExp, text: string): RegExpExecArray | null {
  let last: RegExpExecArray | null = null;
  const global = new RegExp(regex.source, regex.flags.includes("g") ? regex.flags : `${regex.flags}g`);

  for (const match of text.matchAll(global)) {
    last = match as RegExpExecArray;
  }

  return last;
}

/**
 * Resolves `const|let|var NAME = "POST"` (nearest declaration above `precedingText`'s end) to the
 * unsafe method literal it holds, or null when it is not an obvious unsafe literal.
 */
function resolveUnsafeMethodVariable(name: string, precedingText: string): string | null {
  const declaration = new RegExp(
    `\\b(?:const|let|var)\\s+${escapeRegExp(name)}\\s*(?::[^=\\n]+)?=\\s*["'\`](${UNSAFE_METHOD_PATTERN})["'\`]`,
    "gi",
  );
  const match = lastMatch(declaration, precedingText);

  return match ? match[1].toUpperCase() : null;
}

/**
 * Resolves `const|let|var NAME = { ... }` (nearest declaration above `precedingText`'s end) to the
 * balanced object-literal text, or null when `NAME` is not declared as an object literal there.
 */
function resolveObjectLiteralVariable(name: string, precedingText: string): { text: string; start: number } | null {
  const declaration = new RegExp(`\\b(?:const|let|var)\\s+${escapeRegExp(name)}\\s*(?::[^=\\n]+)?=\\s*\\{`, "g");
  const match = lastMatch(declaration, precedingText);

  if (!match) return null;

  const openIndex = match.index + match[0].length - 1;

  return { text: extractBalanced(precedingText, openIndex, "{", "}"), start: match.index };
}

/**
 * Returns the unsafe method an init-object literal (`{ method: "POST" }`, `{ method }`,
 * `{ method: verb }`) resolves to, or null.
 */
function resolveUnsafeMethodFromInit(initText: string, precedingText: string): string | null {
  const literal = initText.match(METHOD_LITERAL);
  if (literal) return literal[1].toUpperCase();

  const identifier = initText.match(METHOD_IDENTIFIER);
  if (identifier) return resolveUnsafeMethodVariable(identifier[1], precedingText);

  if (METHOD_SHORTHAND.test(initText)) return resolveUnsafeMethodVariable("method", precedingText);

  return null;
}

/** True when the init-object text (or a `headers` variable it references) already carries the header. */
function initCarriesHeader(initText: string, precedingText: string): boolean {
  if (HAS_REQUESTED_WITH_HEADER.test(initText)) return true;

  const headersName = initText.match(HEADERS_IDENTIFIER)?.[1] ?? (HEADERS_SHORTHAND.test(initText) ? "headers" : null);
  if (!headersName) return false;

  const headersObject = resolveObjectLiteralVariable(headersName, precedingText);

  return headersObject !== null && HAS_REQUESTED_WITH_HEADER.test(headersObject.text);
}

interface FetchAnalysis {
  method: string | null;
  carriesHeader: boolean;
  shape: "inline-init" | "init-variable";
}

function analyzeFetchCall(content: string, callText: string, openParenIndex: number): FetchAnalysis | null {
  const precedingText = content.slice(0, openParenIndex);
  const args = splitTopLevelArgs(callText);
  const initArg = args[1];

  if (!initArg) return null;

  // `fetch(url, { ... })` — the init object is inline.
  if (initArg.startsWith("{")) {
    return {
      method: resolveUnsafeMethodFromInit(initArg, precedingText),
      carriesHeader: initCarriesHeader(initArg, precedingText),
      shape: "inline-init",
    };
  }

  // `fetch(url, init)` — resolve `const init = { ... }` declared above the call.
  if (new RegExp(`^${IDENTIFIER}$`).test(initArg)) {
    const initObject = resolveObjectLiteralVariable(initArg, precedingText);
    if (!initObject) return null;

    const beforeInit = precedingText.slice(0, initObject.start);

    return {
      method: resolveUnsafeMethodFromInit(initObject.text, beforeInit),
      carriesHeader: initCarriesHeader(initObject.text, beforeInit),
      shape: "init-variable",
    };
  }

  // `fetch(url, { ...spread })`, `fetch(url, buildInit())`, etc. are not resolvable without an AST.
  return null;
}

export function scanSource(content: string, repoRelative: string): Violation[] {
  const violations: Violation[] = [];

  if (new RegExp(SEND_BEACON_CALL.source).test(content)) {
    violations.push({ file: repoRelative, kind: "send-beacon", snippet: "navigator.sendBeacon(...)" });
  }

  for (const match of content.matchAll(RAW_FETCH_CALL)) {
    const openParenIndex = match.index! + match[0].length - 1;
    const callText = extractBalanced(content, openParenIndex, "(", ")");
    const analysis = analyzeFetchCall(content, callText, openParenIndex);

    if (analysis?.method && !analysis.carriesHeader) {
      violations.push({
        file: repoRelative,
        kind: "raw-fetch",
        snippet: `fetch(...) with method "${analysis.method}" (${analysis.shape}) and no ${REQUESTED_WITH_HEADER} header`,
      });
    }
  }

  for (const match of content.matchAll(XHR_OPEN_CALL)) {
    const literalMethod = match[1];
    const methodVariable = match[2];
    const method = literalMethod
      ? literalMethod.toUpperCase()
      : resolveUnsafeMethodVariable(methodVariable, content.slice(0, match.index!));

    if (!method) continue;

    // A raw XHR can't set headers as part of `.open(...)`; look for a subsequent
    // `setRequestHeader("X-Requested-With", ...)` before the request is sent.
    const trailingWindow = content.slice(match.index!, match.index! + XHR_TRAILING_WINDOW);
    const sendIndex = trailingWindow.search(/\.send\s*\(/);
    const scoped = sendIndex === -1 ? trailingWindow : trailingWindow.slice(0, sendIndex);

    if (!HAS_REQUESTED_WITH_HEADER.test(scoped)) {
      violations.push({
        file: repoRelative,
        kind: "xhr-open",
        snippet: `XMLHttpRequest.open("${method}", ...) with no ${REQUESTED_WITH_HEADER} setRequestHeader`,
      });
    }
  }

  return violations;
}

function scanFile(absPath: string, repoRelative: string): Violation[] {
  return scanSource(readFileSync(absPath, "utf8"), repoRelative);
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
const plan = buildScanPlan();
const allCheckedOutRoots = [...plan.sourceRoots.checkedOut, ...plan.templateRoots.checkedOut];
const allUnscannedRoots = [...plan.sourceRoots.unscanned, ...plan.templateRoots.unscanned];

describe("unsafe same-origin request guard (FIT-2967)", () => {
  it("scans every root that is checked out and records the ones that are not", () => {
    // The LSO web workspace is the minimum sparse checkout this test runs in; if these are
    // missing the test is running somewhere it cannot do its job.
    for (const root of ALWAYS_CHECKED_OUT_ROOTS) {
      expect(plan.sourceRoots.checkedOut).toContain(root);
    }

    expect(plan.files.length).toBeGreaterThan(0);

    // Not an assertion — an explicit coverage record in the CI log, so a sparse checkout that
    // leaves roots out does not read as a full scan.
    const report = [
      `scanned ${plan.files.length} file(s) under: ${allCheckedOutRoots.join(", ")}`,
      allUnscannedRoots.length
        ? `NOT checked out here (unscanned): ${allUnscannedRoots.join(", ")}`
        : "all configured roots are checked out",
      ...GITIGNORED_ROOTS.map(
        (root) =>
          `gitignored, never scanned: ${root.path} — same-origin writes needing the header upstream: ` +
          root.knownSameOriginWrites.join("; "),
      ),
    ];
    console.info(`[unsafe-request-guard]\n  ${report.join("\n  ")}`);
  });

  it("has no raw fetch/sendBeacon/XHR unsafe writes outside sameOriginFetch and the allow-list", () => {
    const violations: Violation[] = [];

    for (const absPath of plan.files) {
      const repoRelative = relative(REPO_ROOT, absPath);

      if (ALLOW_LISTED_FILES.has(repoRelative)) continue;

      violations.push(...scanFile(absPath, repoRelative));
    }

    if (violations.length > 0) {
      const message = violations.map((v) => `  [${v.kind}] ${v.file}: ${v.snippet}`).join("\n");

      throw new Error(
        `Found ${violations.length} unwrapped unsafe request(s). Route them through sameOriginFetch ` +
          "(services/lso/web/libs/core/src/lib/api-proxy/same-origin-fetch.ts), or if the call is " +
          `intentionally cross-origin / exempt, add it to ALLOW_LISTED_FILES in this test with a reason:\n${message}`,
      );
    }
  });

  it("keeps the allow-list free of entries for files that no longer exist (checked-out roots only)", () => {
    // Only entries under a root that is actually on disk can be verified; the rest are reported as
    // unverifiable rather than failing a sparse checkout that never had them.
    const verifiable = [...ALLOW_LISTED_FILES].filter((relPath) => isUnderAnyRoot(relPath, allCheckedOutRoots));
    const unverifiable = [...ALLOW_LISTED_FILES].filter((relPath) => !isUnderAnyRoot(relPath, allCheckedOutRoots));
    const missing = verifiable.filter((relPath) => !existsSync(join(REPO_ROOT, relPath)));

    if (unverifiable.length) {
      console.info(`[unsafe-request-guard] allow-list entries outside this checkout: ${unverifiable.join(", ")}`);
    }

    // Every allow-list entry must belong to a configured root, otherwise it is dead config.
    const orphaned = [...ALLOW_LISTED_FILES].filter(
      (relPath) => !isUnderAnyRoot(relPath, [...SOURCE_ROOTS, ...TEMPLATE_ROOTS]),
    );

    expect(orphaned).toEqual([]);
    expect(missing).toEqual([]);
  });

  it("keeps gitignored roots gitignored and outside every scanned root", () => {
    const gitignorePath = join(REPO_ROOT, ".gitignore");
    const gitignore = existsSync(gitignorePath) ? readFileSync(gitignorePath, "utf8").split(/\r?\n/) : null;

    for (const root of GITIGNORED_ROOTS) {
      // A gitignored root can never be scanned by this guard; if it is ever un-ignored (checked in),
      // move it into SOURCE_ROOTS so the header rule applies there too.
      if (gitignore) {
        expect(gitignore).toContain(root.gitignoreLine);
      }

      // Documented so FIT-2968 knows exactly which same-origin writes are NOT covered by this scan.
      expect(root.knownSameOriginWrites.length).toBeGreaterThan(0);
      expect(root.populatedBy.length).toBeGreaterThan(0);

      // Never walked, even when populated locally.
      for (const file of plan.files) {
        expect(relative(REPO_ROOT, file).startsWith(`${root.path}/`)).toBe(false);
      }
    }
  });
});

describe("unsafe same-origin request guard — detector", () => {
  const FILE = "fixture.ts";
  const HEADER = `"${REQUESTED_WITH_HEADER}": "XMLHttpRequest"`;

  it("flags an inline literal unsafe method without the header", () => {
    const src = `await fetch("/api/x", { method: "POST", body });`;

    expect(scanSource(src, FILE).map((v) => v.kind)).toEqual(["raw-fetch"]);
  });

  it.each(["window", "globalThis", "self"])("flags %s.fetch(...) the same as a bare fetch(...)", (host) => {
    const src = `await ${host}.fetch("/api/x", { method: "DELETE" });`;

    expect(scanSource(src, FILE).map((v) => v.kind)).toEqual(["raw-fetch"]);
  });

  it("does not flag a safe method, an inline header, or the sameOriginFetch wrapper", () => {
    const src = [
      `await fetch("/api/x", { method: "GET" });`,
      `await fetch("/api/x", { method: "POST", headers: { ${HEADER} } });`,
      `await sameOriginFetch("/api/x", { method: "POST" });`,
      `await embedFetch("/api/x", { method: "POST" });`,
      `await store.fetch("/api/x", { method: "POST" });`,
      `await fetch("/api/x");`,
    ].join("\n");

    expect(scanSource(src, FILE)).toEqual([]);
  });

  it("resolves `method: verb` and shorthand `{ method }` to a declared unsafe literal", () => {
    const viaIdentifier = `const verb = "PUT";\nawait fetch("/api/x", { method: verb });`;
    const viaShorthand = `const method = 'patch';\nawait fetch("/api/x", { method, body });`;
    const safeIdentifier = `const verb = "GET";\nawait fetch("/api/x", { method: verb });`;

    expect(scanSource(viaIdentifier, FILE).map((v) => v.snippet)).toEqual([
      `fetch(...) with method "PUT" (inline-init) and no ${REQUESTED_WITH_HEADER} header`,
    ]);
    expect(scanSource(viaShorthand, FILE).map((v) => v.kind)).toEqual(["raw-fetch"]);
    expect(scanSource(safeIdentifier, FILE)).toEqual([]);
  });

  it("resolves `fetch(url, init)` to an init object declared above the call", () => {
    const flagged = [
      "const options = {",
      '  method: "POST",',
      '  headers: { "Content-Type": "application/json" },',
      "  body: JSON.stringify(body),",
      "};",
      "const response = await fetch(`/api/projects/${project}/members/${user}/pauses`, options);",
    ].join("\n");
    const withHeader = flagged.replace(
      '"Content-Type": "application/json"',
      `"Content-Type": "application/json", ${HEADER}`,
    );
    const safe = flagged.replace('method: "POST"', 'method: "GET"');

    expect(scanSource(flagged, FILE).map((v) => v.snippet)).toEqual([
      `fetch(...) with method "POST" (init-variable) and no ${REQUESTED_WITH_HEADER} header`,
    ]);
    expect(scanSource(withHeader, FILE)).toEqual([]);
    expect(scanSource(safe, FILE)).toEqual([]);
  });

  it("resolves a `headers` variable referenced from the init object when checking for the header", () => {
    const covered = [
      `const headers = { "Content-Type": "application/json", ${HEADER} };`,
      `await fetch("/api/x", { method: "POST", headers });`,
    ].join("\n");
    const uncovered = [
      `const headers = { "Content-Type": "application/json" };`,
      `const init = { method: "POST", headers: headers };`,
      `await fetch("/api/x", init);`,
    ].join("\n");

    expect(scanSource(covered, FILE)).toEqual([]);
    expect(scanSource(uncovered, FILE).map((v) => v.kind)).toEqual(["raw-fetch"]);
  });

  it("uses the nearest declaration above the call, not an earlier one", () => {
    const src = [
      `const init = { method: "POST" };`,
      `await sameOriginFetch("/api/a", init);`,
      `const init2 = { method: "GET" };`,
      `await fetch("/api/b", init2);`,
    ].join("\n");

    expect(scanSource(src, FILE)).toEqual([]);
  });

  it("does not flag shapes it cannot resolve (parameters, member access, spreads)", () => {
    const src = [
      `function go(init: RequestInit) { return fetch("/api/x", init); }`,
      `await fetch("/api/x", { method: opts.method });`,
      `await fetch("/api/x", { ...base, body });`,
      `await fetch("/api/x", buildInit());`,
    ].join("\n");

    expect(scanSource(src, FILE)).toEqual([]);
  });

  it("flags navigator.sendBeacon unconditionally (it cannot carry the header)", () => {
    expect(scanSource("navigator.sendBeacon(url, blob);", FILE).map((v) => v.kind)).toEqual(["send-beacon"]);
  });

  it("flags XHR unsafe open() via literal or declared variable unless setRequestHeader adds the header", () => {
    const literal = `xhr.open("POST", url, true);\nxhr.send(body);`;
    const variable = `const verb = "DELETE";\nxhr.open(verb, url);\nxhr.send();`;
    const covered = `xhr.open("POST", url, true);\nxhr.setRequestHeader("${REQUESTED_WITH_HEADER}", "XMLHttpRequest");\nxhr.send(body);`;
    const safe = `xhr.open("GET", url);\nxhr.send();`;

    expect(scanSource(literal, FILE).map((v) => v.kind)).toEqual(["xhr-open"]);
    expect(scanSource(variable, FILE).map((v) => v.snippet)).toEqual([
      `XMLHttpRequest.open("DELETE", ...) with no ${REQUESTED_WITH_HEADER} setRequestHeader`,
    ]);
    expect(scanSource(covered, FILE)).toEqual([]);
    expect(scanSource(safe, FILE)).toEqual([]);
  });
});
