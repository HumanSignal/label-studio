import { render, screen } from "@testing-library/react";
import {
  evaluateSubmissionRules,
  SubmissionRuleBadges,
  submissionFlagLabel,
  submissionSignalLabel,
} from "./submission-rules";

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
    const audio = { types: ["audio/mp4", "audio/x-m4a", "audio/mpeg", "audio/ogg", "audio/wav"] };
    expect(evaluateSubmissionRules(null, audio).find((r) => r.key === "types")!.label).toBe("M4A / MP3 / OGG / WAV");
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

describe("rules on server-read facts", () => {
  const CAPTURE = { min_fps: 30, require_capture_metadata: true, gps_required: true };

  it("stays unknown until the server has inspected the file", () => {
    const byKey = (meta: Parameters<typeof evaluateSubmissionRules>[0]) =>
      Object.fromEntries(evaluateSubmissionRules(meta, CAPTURE).map((r) => [r.key, r.status]));
    expect(byKey(null)).toEqual({ fps: "unknown", require_capture_metadata: "unknown", gps_required: "unknown" });
    // picked in the browser: dimensions known, but nothing the server reads
    expect(byKey({ contentType: "video/mp4", width: 720, height: 1280 })).toEqual({
      fps: "unknown",
      require_capture_metadata: "unknown",
      gps_required: "unknown",
    });
  });

  it("passes and fails on verified facts", () => {
    const pass = evaluateSubmissionRules(
      { contentType: "video/mp4", verified: true, fps: 59.94, captureMetadata: true, gps: true },
      CAPTURE,
    );
    expect(pass.every((r) => r.status === "pass")).toBe(true);
    const fail = evaluateSubmissionRules(
      { contentType: "video/mp4", verified: true, fps: 24, captureMetadata: false, gps: false },
      CAPTURE,
    );
    expect(fail.every((r) => r.status === "fail")).toBe(true);
  });

  it("keeps a fact the server could not read unknown even on a verified file", () => {
    const results = evaluateSubmissionRules({ contentType: "application/pdf", verified: true }, CAPTURE);
    expect(results.every((r) => r.status === "unknown")).toBe(true);
  });

  it("accepts NTSC and VFR rates that sit just under the nominal minimum", () => {
    const at = (fps: number) =>
      evaluateSubmissionRules({ contentType: "video/mp4", verified: true, fps }, { min_fps: 30 })[0].status;
    expect(at(29.97)).toBe("pass");
    expect(at(29.6)).toBe("pass");
    expect(at(29.5)).toBe("fail");
    expect(at(24)).toBe("fail");
  });

  it("ignores a frame rate that did not come from the server", () => {
    const [result] = evaluateSubmissionRules({ contentType: "video/mp4", fps: 60 }, { min_fps: 30 });
    expect(result.status).toBe("unknown");
  });

  it("labels the capture rules", () => {
    const labels = Object.fromEntries(evaluateSubmissionRules(null, CAPTURE).map((r) => [r.key, r.label]));
    expect(labels).toEqual({ fps: "≥ 30 fps", require_capture_metadata: "Device info", gps_required: "GPS" });
    const fps = (rules: Record<string, number>) => evaluateSubmissionRules(null, rules)[0].label;
    expect(fps({ max_fps: 60 })).toBe("≤ 60 fps");
    expect(fps({ min_fps: 30, max_fps: 60 })).toBe("30–60 fps");
  });

  it("tolerates a measured rate just over the maximum but not a different rate", () => {
    const at = (fps: number) =>
      evaluateSubmissionRules({ contentType: "video/mp4", verified: true, fps }, { max_fps: 30 })[0].status;
    expect(at(30.3)).toBe("pass");
    expect(at(31)).toBe("fail");
    expect(at(24)).toBe("pass");
  });
});

describe("submissionSignalLabel", () => {
  it("names every modification signal the server can report, and falls back for an unknown code", () => {
    expect(submissionSignalLabel("reencoded")).toBe("Processed by a video tool after capture");
    expect(submissionSignalLabel("editing_software")).toBe("Saved by an editing app");
    expect(submissionSignalLabel("platform_source")).toBe("Downloaded from a video or social platform");
    expect(submissionSignalLabel("no_capture_metadata")).toBe("No camera make, model or software");
    expect(submissionSignalLabel("something_new")).toBe("Other signal");
  });
});

describe("submissionFlagLabel", () => {
  it("names every finding the server can report, and falls back for an unknown code", () => {
    expect(submissionFlagLabel("pdf_javascript")).toBe("Runs JavaScript");
    expect(submissionFlagLabel("pdf_launch_action")).toBe("Launches a program when opened");
    expect(submissionFlagLabel("pdf_embedded_files")).toBe("Carries embedded files");
    expect(submissionFlagLabel("pdf_remote_action")).toBe("Sends data to or loads from a remote address");
    expect(submissionFlagLabel("pdf_rich_media")).toBe("Embeds rich media");
    expect(submissionFlagLabel("hidden_archive")).toBe("Hides a ZIP archive");
    expect(submissionFlagLabel("hidden_document")).toBe("Hides a PDF document");
    expect(submissionFlagLabel("hidden_markup")).toBe("Contains HTML or script markup");
    expect(submissionFlagLabel("hidden_executable")).toBe("Hides an executable program");
    expect(submissionFlagLabel("something_new")).toBe("Flagged for review");
  });
});
