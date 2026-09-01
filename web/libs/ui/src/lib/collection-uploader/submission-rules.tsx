/**
 * Submission validation rules — the platform evaluator for the declarative
 * `x-ls-validation` block an interface carries on its submission property.
 *
 * Rules are data authored with the interface (by hand or by the generation
 * agent); this module is the single client-side evaluator so every interface
 * gets identical semantics and feedback. The backend enforces the subset it
 * can verify (type/size) from the same declaration; media facts the server
 * cannot see (duration, orientation, resolution) are evaluated here from file
 * metadata — review remains the enforcement of record for content quality.
 *
 * A rule whose fact is unknowable for the file at hand (e.g. duration of a
 * PDF, metadata not yet loaded) reports "unknown", never "fail": badges must
 * state what is verified, not guess.
 */

import { cn } from "../../utils/utils";

export interface SubmissionRules {
  /** Allowed MIME types, e.g. ["video/mp4", "video/quicktime"]. */
  types?: string[];
  /** Maximum file size in bytes. */
  max_bytes?: number;
  /** Minimum media duration in seconds. */
  min_duration?: number;
  /** Maximum media duration in seconds. */
  max_duration?: number;
  /** Required orientation of visual media. */
  orientation?: "portrait" | "landscape";
  /** Minimum resolution: the shorter side, in pixels. */
  min_resolution?: number;
}

/** Facts known about a file — pass what is available, omit the rest. */
export interface SubmissionFileMeta {
  contentType?: string | null;
  size?: number | null;
  durationSec?: number | null;
  width?: number | null;
  height?: number | null;
}

export type SubmissionRuleStatus = "pass" | "fail" | "unknown";

export interface SubmissionRuleResult {
  key: string;
  label: string;
  status: SubmissionRuleStatus;
}

function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return `${bytes} B`;
  const units = ["B", "KB", "MB", "GB"];
  let value = bytes;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit += 1;
  }
  return `${value.toFixed(value >= 10 || unit === 0 ? 0 : 1)} ${units[unit]}`;
}

function typeLabel(types: string[]): string {
  return types
    .map((t) => (t.includes("/") ? t.split("/").pop() : t))
    .map((t) => (t === "quicktime" ? "MOV" : (t ?? "").toUpperCase()))
    .join(" / ");
}

function durationLabel(min?: number, max?: number): string {
  if (min != null && max != null) return `${min}–${max}s`;
  if (min != null) return `≥ ${min}s`;
  return `≤ ${max}s`;
}

const check = (ok: boolean): SubmissionRuleStatus => (ok ? "pass" : "fail");

/**
 * Evaluate the declared rules against what is known about a file.
 * With no meta (nothing picked yet) every rule reports "unknown" — usable to
 * present the rules before the user uploads anything.
 */
export function evaluateSubmissionRules(
  meta: SubmissionFileMeta | null | undefined,
  rules: SubmissionRules | null | undefined,
): SubmissionRuleResult[] {
  if (!rules || typeof rules !== "object") return [];
  const results: SubmissionRuleResult[] = [];
  const m = meta ?? {};

  if (Array.isArray(rules.types) && rules.types.length) {
    results.push({
      key: "types",
      label: typeLabel(rules.types),
      status: m.contentType ? check(rules.types.includes(m.contentType)) : "unknown",
    });
  }
  if (typeof rules.max_bytes === "number" && rules.max_bytes > 0) {
    results.push({
      key: "max_bytes",
      label: `≤ ${formatBytes(rules.max_bytes)}`,
      status: typeof m.size === "number" ? check(m.size <= rules.max_bytes) : "unknown",
    });
  }
  const minDur = typeof rules.min_duration === "number" ? rules.min_duration : undefined;
  const maxDur = typeof rules.max_duration === "number" ? rules.max_duration : undefined;
  if (minDur != null || maxDur != null) {
    const duration = typeof m.durationSec === "number" && Number.isFinite(m.durationSec) ? m.durationSec : null;
    results.push({
      key: "duration",
      label: durationLabel(minDur, maxDur),
      status:
        duration == null
          ? "unknown"
          : check((minDur == null || duration >= minDur) && (maxDur == null || duration <= maxDur)),
    });
  }
  if (rules.orientation === "portrait" || rules.orientation === "landscape") {
    const known = typeof m.width === "number" && typeof m.height === "number" && m.width > 0 && m.height > 0;
    results.push({
      key: "orientation",
      label: rules.orientation === "portrait" ? "Portrait" : "Landscape",
      status: known
        ? check(
            rules.orientation === "portrait"
              ? (m.height as number) >= (m.width as number)
              : (m.width as number) >= (m.height as number),
          )
        : "unknown",
    });
  }
  if (typeof rules.min_resolution === "number" && rules.min_resolution > 0) {
    const known = typeof m.width === "number" && typeof m.height === "number" && m.width > 0 && m.height > 0;
    results.push({
      key: "min_resolution",
      label: `≥ ${rules.min_resolution}px`,
      status: known ? check(Math.min(m.width as number, m.height as number) >= rules.min_resolution) : "unknown",
    });
  }
  return results;
}

const BADGE_STYLE: Record<SubmissionRuleStatus, string> = {
  pass: "bg-positive-background text-positive-content",
  fail: "bg-negative-background text-negative-content",
  unknown: "bg-neutral-background text-neutral-content-subtle",
};

const BADGE_MARK: Record<SubmissionRuleStatus, string> = { pass: "✓", fail: "✕", unknown: "" };

/**
 * One badge per declared rule: green when the file satisfies it, red when it
 * does not, neutral while the fact is unknown (nothing picked yet, metadata
 * still loading, or not applicable to this file kind).
 */
export const SubmissionRuleBadges = ({
  results,
  className,
}: {
  results: SubmissionRuleResult[];
  className?: string;
}) => {
  if (!results.length) return null;
  return (
    <div className={cn("flex flex-wrap gap-tightest", className)} data-testid="submission-rule-badges">
      {results.map((rule) => (
        <span
          key={rule.key}
          data-testid={`submission-rule-${rule.key}-${rule.status}`}
          className={cn("rounded-small px-tight py-tightest text-xs whitespace-nowrap", BADGE_STYLE[rule.status])}
        >
          {BADGE_MARK[rule.status] ? `${BADGE_MARK[rule.status]} ` : ""}
          {rule.label}
        </span>
      ))}
    </div>
  );
};
