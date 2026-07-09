import {
  isEnterpriseEdition,
  normalizeReviewAcceptedState,
  resolveClassicEntityReviewState,
  resolveReviewAcceptedStateFromTaskSource,
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
