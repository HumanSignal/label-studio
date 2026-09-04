import { render, screen } from "@testing-library/react";
import { evaluateSubmissionRules, SubmissionRuleBadges } from "./submission-rules";

const RULES = {
  types: ["video/mp4", "video/quicktime"],
  max_bytes: 500 * 1024 * 1024,
  min_duration: 30,
  max_duration: 60,
  orientation: "portrait" as const,
  min_resolution: 720,
};

describe("evaluateSubmissionRules", () => {
  it("reports every rule as unknown before a file is picked", () => {
    const results = evaluateSubmissionRules(null, RULES);
    expect(results.map((r) => r.key)).toEqual(["types", "max_bytes", "duration", "orientation", "min_resolution"]);
    expect(results.every((r) => r.status === "unknown")).toBe(true);
  });

  it("passes a file satisfying every rule", () => {
    const results = evaluateSubmissionRules(
      { contentType: "video/mp4", size: 1024, durationSec: 45, width: 720, height: 1280 },
      RULES,
    );
    expect(results.every((r) => r.status === "pass")).toBe(true);
  });

  it("fails exactly the violated rules", () => {
    const results = evaluateSubmissionRules(
      // landscape, too long, right type/size, resolution ok
      { contentType: "video/mp4", size: 1024, durationSec: 90, width: 1920, height: 1080 },
      RULES,
    );
    const byKey = Object.fromEntries(results.map((r) => [r.key, r.status]));
    expect(byKey).toEqual({
      types: "pass",
      max_bytes: "pass",
      duration: "fail",
      orientation: "fail",
      min_resolution: "pass",
    });
  });

  it("keeps media rules unknown when the fact is not knowable for the file", () => {
    // A PDF has no duration or dimensions: those rules must not fail it.
    const results = evaluateSubmissionRules({ contentType: "video/mp4", size: 10 }, RULES);
    const byKey = Object.fromEntries(results.map((r) => [r.key, r.status]));
    expect(byKey.duration).toBe("unknown");
    expect(byKey.orientation).toBe("unknown");
    expect(byKey.min_resolution).toBe("unknown");
  });

  it("labels are human-readable", () => {
    const labels = Object.fromEntries(evaluateSubmissionRules(null, RULES).map((r) => [r.key, r.label]));
    expect(labels.types).toBe("MP4 / MOV");
    expect(labels.max_bytes).toBe("≤ 500 MB");
    expect(labels.duration).toBe("30–60s");
    expect(labels.orientation).toBe("Portrait");
    expect(labels.min_resolution).toBe("≥ 720px");
  });

  it("returns nothing for a missing or malformed declaration", () => {
    expect(evaluateSubmissionRules({ size: 1 }, null)).toEqual([]);
    expect(evaluateSubmissionRules({ size: 1 }, undefined)).toEqual([]);
    expect(evaluateSubmissionRules({ size: 1 }, {} as never)).toEqual([]);
  });

  it("evaluates the size floor and resolution ceiling", () => {
    const rules = { min_bytes: 5 * 1024 * 1024, max_resolution: 1080 };
    const small = evaluateSubmissionRules({ size: 1024, width: 4000, height: 3000 }, rules);
    const byKey = Object.fromEntries(small.map((r) => [r.key, r.status]));
    expect(byKey).toEqual({ min_bytes: "fail", max_resolution: "fail" });

    const good = evaluateSubmissionRules({ size: 6 * 1024 * 1024, width: 1080, height: 1920 }, rules);
    expect(good.every((r) => r.status === "pass")).toBe(true);

    const labels = Object.fromEntries(evaluateSubmissionRules(null, rules).map((r) => [r.key, r.label]));
    expect(labels.min_bytes).toBe("≥ 5.0 MB");
    expect(labels.max_resolution).toBe("≤ 1080px");
  });

  it("treats a zero size as unknown, never a failure (iOS capture quirk)", () => {
    const rules = { min_bytes: 1048576, max_bytes: 10485760 };
    const results = evaluateSubmissionRules({ size: 0 }, rules);
    const byKey = Object.fromEntries(results.map((r) => [r.key, r.status]));
    expect(byKey).toEqual({ min_bytes: "unknown", max_bytes: "unknown" });
  });

  it("orientation treats a square as valid either way", () => {
    const square = { width: 1000, height: 1000 };
    expect(evaluateSubmissionRules(square, { orientation: "portrait" })[0].status).toBe("pass");
    expect(evaluateSubmissionRules(square, { orientation: "landscape" })[0].status).toBe("pass");
  });
});

describe("SubmissionRuleBadges", () => {
  it("renders one badge per rule with its status", () => {
    const results = evaluateSubmissionRules(
      { contentType: "image/png", size: 1, width: 100, height: 50 },
      { types: ["video/mp4"], orientation: "portrait", min_duration: 5 },
    );
    render(<SubmissionRuleBadges results={results} />);
    expect(screen.getByTestId("submission-rule-types-fail")).toBeInTheDocument();
    expect(screen.getByTestId("submission-rule-orientation-fail")).toBeInTheDocument();
    expect(screen.getByTestId("submission-rule-duration-unknown")).toBeInTheDocument();
  });

  it("renders nothing without rules", () => {
    render(<SubmissionRuleBadges results={[]} />);
    expect(screen.queryByTestId("submission-rule-badges")).not.toBeInTheDocument();
  });
});
