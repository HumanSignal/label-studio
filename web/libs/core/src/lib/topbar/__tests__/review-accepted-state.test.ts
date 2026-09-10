import {
  isEnterpriseEdition,
  normalizeReviewAcceptedState,
  resolveClassicEntityReviewState,
  resolveFlexibleRejectButtonTitle,
  resolveReviewAcceptedStateFromTaskSource,
  resolveReviewBarCopy,
} from "../review-accepted-state";

describe("isEnterpriseEdition", () => {
  const origAppSettings = (window as { APP_SETTINGS?: unknown }).APP_SETTINGS;

  afterEach(() => {
    (window as { APP_SETTINGS?: unknown }).APP_SETTINGS = origAppSettings;
  });

  it("returns true when edition is Enterprise", () => {
    (window as { APP_SETTINGS?: unknown }).APP_SETTINGS = { version: { edition: "Enterprise" } };
    expect(isEnterpriseEdition()).toBe(true);
  });

  it("returns false for Community and missing settings", () => {
    (window as { APP_SETTINGS?: unknown }).APP_SETTINGS = { version: { edition: "Community" } };
    expect(isEnterpriseEdition()).toBe(false);
    (window as { APP_SETTINGS?: unknown }).APP_SETTINGS = undefined;
    expect(isEnterpriseEdition()).toBe(false);
  });
});

describe("normalizeReviewAcceptedState", () => {
  it("passes through accepted, rejected, and fixed", () => {
    expect(normalizeReviewAcceptedState("accepted")).toBe("accepted");
    expect(normalizeReviewAcceptedState("rejected")).toBe("rejected");
    expect(normalizeReviewAcceptedState("fixed")).toBe("fixed");
  });

  it("maps fixed_and_accepted to fixed", () => {
    expect(normalizeReviewAcceptedState("fixed_and_accepted")).toBe("fixed");
  });

  it("returns null for unknown values", () => {
    expect(normalizeReviewAcceptedState(null)).toBe(null);
    expect(normalizeReviewAcceptedState(undefined)).toBe(null);
    expect(normalizeReviewAcceptedState("unknown")).toBe(null);
  });
});

describe("resolveReviewAcceptedStateFromTaskSource", () => {
  const origAppSettings = (window as { APP_SETTINGS?: unknown }).APP_SETTINGS;

  afterEach(() => {
    (window as { APP_SETTINGS?: unknown }).APP_SETTINGS = origAppSettings;
  });

  function taskSourceWithReview(review: string) {
    return JSON.stringify({
      annotators: [{ review }],
      annotations: [{ id: 1 }],
    });
  }

  it("returns null outside Enterprise edition", () => {
    (window as { APP_SETTINGS?: unknown }).APP_SETTINGS = { version: { edition: "Community" } };
    expect(
      resolveReviewAcceptedStateFromTaskSource({ pk: 1, type: "annotation" }, taskSourceWithReview("accepted")),
    ).toBe(null);
  });

  it("returns null for predictions", () => {
    (window as { APP_SETTINGS?: unknown }).APP_SETTINGS = { version: { edition: "Enterprise" } };
    expect(
      resolveReviewAcceptedStateFromTaskSource({ pk: 1, type: "prediction" }, taskSourceWithReview("accepted")),
    ).toBe(null);
  });

  it.each([
    ["accepted", "accepted"],
    ["rejected", "rejected"],
    ["fixed", "fixed"],
    ["fixed_and_accepted", "fixed"],
  ] as const)("resolves %s from task source as %s", (review, expected) => {
    (window as { APP_SETTINGS?: unknown }).APP_SETTINGS = { version: { edition: "Enterprise" } };
    expect(resolveReviewAcceptedStateFromTaskSource({ pk: 1, type: "annotation" }, taskSourceWithReview(review))).toBe(
      expected,
    );
  });

  it("returns null when annotation pk is not in task source", () => {
    (window as { APP_SETTINGS?: unknown }).APP_SETTINGS = { version: { edition: "Enterprise" } };
    expect(
      resolveReviewAcceptedStateFromTaskSource({ pk: 99, type: "annotation" }, taskSourceWithReview("accepted")),
    ).toBe(null);
  });
});

describe("resolveClassicEntityReviewState", () => {
  const origAppSettings = (window as { APP_SETTINGS?: unknown }).APP_SETTINGS;

  afterEach(() => {
    (window as { APP_SETTINGS?: unknown }).APP_SETTINGS = origAppSettings;
  });

  it("prefers entity.acceptedState over task source", () => {
    (window as { APP_SETTINGS?: unknown }).APP_SETTINGS = { version: { edition: "Enterprise" } };
    const store = {
      task: {
        source: JSON.stringify({
          annotators: [{ review: "rejected" }],
          annotations: [{ id: 1 }],
        }),
      },
    };
    expect(resolveClassicEntityReviewState({ pk: 1, type: "annotation", acceptedState: "accepted" }, store)).toBe(
      "accepted",
    );
  });

  it("uses accepted_state when stub payload has empty annotators", () => {
    (window as { APP_SETTINGS?: unknown }).APP_SETTINGS = { version: { edition: "Enterprise" } };
    const store = {
      task: {
        source: JSON.stringify({
          annotators: [],
          annotations: [{ id: 1 }],
        }),
      },
    };
    expect(resolveClassicEntityReviewState({ pk: 1, type: "annotation", accepted_state: "rejected" }, store)).toBe(
      "rejected",
    );
  });

  it("falls back to task source when entity field is missing", () => {
    (window as { APP_SETTINGS?: unknown }).APP_SETTINGS = { version: { edition: "Enterprise" } };
    const store = {
      task: {
        source: JSON.stringify({
          annotators: [{ review: "fixed_and_accepted" }],
          annotations: [{ id: 1 }],
        }),
      },
    };
    expect(resolveClassicEntityReviewState({ pk: 1, type: "annotation" }, store)).toBe("fixed");
  });

  it("normalizes accepted_state snake_case field", () => {
    expect(
      resolveClassicEntityReviewState({ pk: 1, type: "annotation", accepted_state: "fixed_and_accepted" }, null),
    ).toBe("fixed");
  });
});

describe("resolveReviewBarCopy", () => {
  it.each([
    null,
    "accepted",
    "rejected",
    "fixed",
  ] as const)("keeps classic Reject / Accept for verdict %s", (verdict) => {
    expect(resolveReviewBarCopy(verdict, false)).toEqual({
      rejectLabel: "Reject",
      acceptLabel: "Accept",
    });
  });

  it.each([
    null,
    "accepted",
    "rejected",
    "fixed",
  ] as const)("uses Fix + Accept when dirty for verdict %s", (verdict) => {
    expect(resolveReviewBarCopy(verdict, true)).toEqual({
      rejectLabel: "Reject",
      acceptLabel: "Fix + Accept",
    });
  });
});

describe("resolveFlexibleRejectButtonTitle", () => {
  it("keeps host titles when there is no live verdict", () => {
    expect(resolveFlexibleRejectButtonTitle("remove", "Reject", null)).toBe("Reject");
    expect(resolveFlexibleRejectButtonTitle("remove", "Remove", null)).toBe("Remove");
    expect(resolveFlexibleRejectButtonTitle("requeue", "Requeue", null)).toBe("Requeue");
  });

  it("keeps the host remove title for a live accepted or fixed verdict", () => {
    expect(resolveFlexibleRejectButtonTitle("remove", "Reject", "accepted")).toBe("Reject");
    expect(resolveFlexibleRejectButtonTitle("remove", "Remove", "accepted")).toBe("Remove");
    expect(resolveFlexibleRejectButtonTitle("remove", "Remove", "fixed")).toBe("Remove");
  });

  it("keeps the host remove title for a live rejected verdict", () => {
    expect(resolveFlexibleRejectButtonTitle("remove", "Reject", "rejected")).toBe("Reject");
    expect(resolveFlexibleRejectButtonTitle("remove", "Remove", "rejected")).toBe("Remove");
  });

  it("leaves Requeue labeled Requeue even when the verdict is live", () => {
    expect(resolveFlexibleRejectButtonTitle("requeue", "Requeue", "accepted")).toBe("Requeue");
    expect(resolveFlexibleRejectButtonTitle("requeue", "Requeue", "rejected")).toBe("Requeue");
  });
});
