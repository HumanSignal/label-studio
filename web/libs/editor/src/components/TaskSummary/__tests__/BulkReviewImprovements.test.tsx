/**
 * Tests for Bulk Review improvements in TaskSummaryV2.
 *
 * Covers 5 requirements:
 *   1. Review counter in the control panel (hidden when 0 reviewed)
 *   2. Dialog: overwrite warning, "Reviews to be applied:" title, updated description
 *   3. Remove "this action cannot be undone"
 *   4. Dynamic modal title + KPI-style accept/reject cards
 *   5. Title Case button labels
 *
 * Uses a simple 2-dimension Choices config:
 *   - "sentiment" (Choices: positive / negative)
 *   - "topic" (Choices: news / sports)
 *
 * Three annotators + one GT annotation:
 *   Alice (pk=101): sentiment=positive, topic=news   → matches GT → Accept
 *   Bob   (pk=102): sentiment=negative, topic=news   → mismatch  → Reject
 *   Carol (pk=103): sentiment=positive, topic=sports  → mismatch  → Reject
 *   GT    (pk=200): sentiment=positive, topic=news
 */

import { render, screen } from "@testing-library/react";
import { TaskSummaryControlPanel } from "../agreement-dashboard/task-summary-control-panel";
import { openAutoReviewDialog } from "../agreement-dashboard/auto-review-dialog";
import * as modal from "@humansignal/ui/lib/modal";
import type { AnnotatorInfo, DimensionInfo, ExistingGroundTruth, GroundTruthCell } from "../agreement-dashboard/types";
import type { MSTAnnotation } from "../../../stores/types";

Object.defineProperty(window, "APP_SETTINGS", {
  value: { user: { id: 1 }, feature_flags: {}, feature_flags_default_value: false },
  writable: true,
});

// ---------------------------------------------------------------------------
// Test data builders
// ---------------------------------------------------------------------------

const buildDimension = (id: number, name: string, values: (string | null)[]): DimensionInfo => ({
  dimensionId: id,
  name,
  controlTag: "Choices",
  metricType: "exact_match",
  isCategorical: true,
  values,
  scores: values.map(() => values.map(() => 1)),
  labels: [...new Set(values.filter(Boolean) as string[])],
  overallWeight: 1,
  isRequired: true,
});

const buildAnnotator = (id: number, index: number, name: string): AnnotatorInfo => ({
  id,
  index,
  displayName: name,
  user: { id, email: `${name.toLowerCase()}@test.com` },
});

const buildAnnotation = (pk: number, userId: number): MSTAnnotation =>
  ({
    id: String(pk),
    pk: String(pk),
    type: "annotation",
    user: { id: userId },
  }) as MSTAnnotation;

// ---------------------------------------------------------------------------
// Shared test fixtures (2 Choices dimensions, 3 annotators)
// ---------------------------------------------------------------------------

// dimension_values arrays are indexed by annotator index (0=Alice, 1=Bob, 2=Carol, 3=GT)
const dimensions: DimensionInfo[] = [
  buildDimension(1, "sentiment", ["positive", "negative", "positive", "positive"]),
  buildDimension(2, "topic", ["news", "news", "sports", "news"]),
];

const annotators: AnnotatorInfo[] = [
  buildAnnotator(1, 0, "Alice"),
  buildAnnotator(2, 1, "Bob"),
  buildAnnotator(3, 2, "Carol"),
];

const annotationIds = [101, 102, 103, 200];

const gtCells = new Map<number, GroundTruthCell>([
  [1, { dimensionId: 1, value: "positive", source: "manual" }],
  [2, { dimensionId: 2, value: "news", source: "manual" }],
]);

const existingGt: ExistingGroundTruth = {
  annotationId: 200,
  annotatorIndex: 3,
  completedBy: 99,
  cells: gtCells,
};

const annotations: MSTAnnotation[] = [buildAnnotation(101, 1), buildAnnotation(102, 2), buildAnnotation(103, 3)];

// ---------------------------------------------------------------------------
// Dialog helper — spy on confirm() and capture the call
// ---------------------------------------------------------------------------

let lastConfirmCall: { title?: string; body?: React.ReactNode; okText?: string } | null = null;

beforeEach(() => {
  lastConfirmCall = null;
  spyOn(modal, "confirm").mockImplementation((args: any) => {
    lastConfirmCall = args;
    return { update: () => {}, close: () => {}, visible: false };
  });
});

/** Call openAutoReviewDialog with default test fixtures + optional overrides. */
const callDialog = (overrides?: Record<string, unknown>) => {
  openAutoReviewDialog({
    taskId: 1,
    existingGt,
    annotations,
    dimensions,
    annotationIds,
    annotators,
    onCommit: () => {},
    ...overrides,
  } as any);
};

/** Render the captured dialog body and return the container. */
const renderDialogBody = () => {
  expect(lastConfirmCall).not.toBeNull();
  return render(<>{lastConfirmCall!.body}</>);
};

// ===========================================================================
// Req 1 — Review counter in Ground Truth / Bulk Review panel
// ===========================================================================

describe("Req 1 — Review counter in control panel", () => {
  const baseProps = {
    groundTruthStatus: "saved" as const,
    isComplete: true,
    resolvedCount: 2,
    totalCount: 2,
    hasExistingGt: true,
    onSaveGroundTruth: () => {},
    onCancel: () => {},
    onAutoReview: () => {},
  };

  it("shows review counter when some annotations have been reviewed", () => {
    render(
      <TaskSummaryControlPanel
        {...(baseProps as any)}
        reviewStats={{ reviewedCount: 2, totalCount: 3, acceptedCount: 1, rejectedCount: 1 }}
      />,
    );
    expect(screen.getByText(/2\s*\/\s*3\s*reviewed/i)).toBeInTheDocument();
    expect(screen.getByText(/1 accepted/i)).toBeInTheDocument();
    expect(screen.getByText(/1 rejected/i)).toBeInTheDocument();
  });

  it("hides review counter when zero annotations have been reviewed", () => {
    render(
      <TaskSummaryControlPanel
        {...(baseProps as any)}
        reviewStats={{ reviewedCount: 0, totalCount: 3, acceptedCount: 0, rejectedCount: 0 }}
      />,
    );
    expect(screen.queryByText(/reviewed/i)).not.toBeInTheDocument();
  });

  it("hides review counter when reviewStats is not provided", () => {
    render(<TaskSummaryControlPanel {...baseProps} />);
    expect(screen.queryByText(/reviewed/i)).not.toBeInTheDocument();
  });
});

// ===========================================================================
// Req 2a — Warning when annotations already have reviews
// ===========================================================================

describe("Req 2a — Overwrite warning in dialog", () => {
  it("shows overwrite warning when some annotations already have reviews", () => {
    callDialog({
      existingReviews: new Map([
        [101, true],
        [102, false],
      ]),
    });
    renderDialogBody();
    expect(screen.getByText(/2\s*\/\s*3 annotations have already been reviewed/i)).toBeInTheDocument();
    expect(screen.getByText(/overwrite existing reviews/i)).toBeInTheDocument();
  });

  it("does not show overwrite warning when no annotations have reviews", () => {
    callDialog({ existingReviews: new Map() });
    renderDialogBody();
    expect(screen.queryByText(/overwrite existing reviews/i)).not.toBeInTheDocument();
  });

  it("does not show overwrite warning when existingReviews is not provided", () => {
    callDialog();
    renderDialogBody();
    expect(screen.queryByText(/overwrite existing reviews/i)).not.toBeInTheDocument();
  });
});

// ===========================================================================
// Req 2b — "Reviews to be applied:" title above the table
// ===========================================================================

describe("Req 2b — Table title in dialog", () => {
  it("shows 'Reviews to be applied:' above the annotator table", () => {
    callDialog();
    renderDialogBody();
    expect(screen.getByText("Reviews to be applied:")).toBeInTheDocument();
  });
});

// ===========================================================================
// Req 2c — Updated description text
// ===========================================================================

describe("Req 2c — Description text in dialog", () => {
  it("shows the updated description", () => {
    callDialog();
    renderDialogBody();
    expect(screen.getByText("Accept matching annotations and reject non-matching ones.")).toBeInTheDocument();
  });

  it("does not show the old description", () => {
    callDialog();
    renderDialogBody();
    expect(screen.queryByText("Matching annotations accepted, non-matching rejected.")).not.toBeInTheDocument();
  });
});

// ===========================================================================
// Req 3 — Remove "this action cannot be undone"
// ===========================================================================

describe("Req 3 — No 'cannot be undone' warning", () => {
  it("does not render the 'cannot be undone' message", () => {
    callDialog();
    renderDialogBody();
    expect(screen.queryByText(/cannot be undone/i)).not.toBeInTheDocument();
  });
});

// ===========================================================================
// Req 4 — Modal title with annotation count + KPI-style cards
// ===========================================================================

describe("Req 4 — Modal title and KPI cards", () => {
  it("sets modal title to 'Review N Annotations against Ground Truth'", () => {
    callDialog();
    expect(lastConfirmCall?.title).toBe("Review 3 Annotations against Ground Truth");
  });

  it("does not include the old 'Creates N reviews' summary", () => {
    callDialog();
    renderDialogBody();
    expect(screen.queryByText(/creates.*review/i)).not.toBeInTheDocument();
  });

  it("renders KPI-style accepted count", () => {
    callDialog();
    renderDialogBody();
    const acceptedCard = screen.getByTestId("kpi-accepted");
    expect(acceptedCard).toBeInTheDocument();
    expect(acceptedCard.textContent).toContain("1");
    expect(acceptedCard.textContent).toMatch(/accepted/i);
  });

  it("renders KPI-style rejected count", () => {
    callDialog();
    renderDialogBody();
    const rejectedCard = screen.getByTestId("kpi-rejected");
    expect(rejectedCard).toBeInTheDocument();
    expect(rejectedCard.textContent).toContain("2");
    expect(rejectedCard.textContent).toMatch(/rejected/i);
  });
});

// ===========================================================================
// Req 5 — Title Case button labels
// ===========================================================================

describe("Req 5 — Title Case button labels", () => {
  it("control panel button reads 'Bulk Review Against Ground Truth'", () => {
    const baseProps = {
      groundTruthStatus: "saved" as const,
      isComplete: true,
      resolvedCount: 2,
      totalCount: 2,
      hasExistingGt: true,
      onSaveGroundTruth: () => {},
      onCancel: () => {},
      onAutoReview: () => {},
    };
    render(<TaskSummaryControlPanel {...baseProps} />);
    expect(screen.getByRole("button", { name: /bulk review/i })).toHaveTextContent("Bulk Review Against Ground Truth");
  });

  it("dialog OK button reads 'Apply Reviews'", () => {
    callDialog();
    expect(lastConfirmCall?.okText).toBe("Apply Reviews");
  });
});
