import {
  matchesAnnotationsListFilter,
  filterAnnotationsList,
  isFilterActive,
  hasActiveStatusFilters,
  normalizeAnnotationsListFilter,
  stripReviewStatusFilters,
  DEFAULT_ANNOTATIONS_LIST_FILTER,
  DEFAULT_ANNOTATIONS_LIST_STATUS_FILTERS,
} from "../annotations-list-filter";
import type { AnnotationsListFilter, SharedAnnotation } from "../types";

function makeAnnotation(id: string, overrides: Partial<SharedAnnotation> = {}): SharedAnnotation {
  return {
    id,
    pk: id,
    type: "annotation",
    selected: false,
    createdBy: `user-${id}`,
    createdDate: new Date("2024-01-15T10:00:00Z").toISOString(),
    user: null,
    groundTruth: false,
    skipped: false,
    draftId: 0,
    score: null,
    commentCount: 0,
    unresolvedCommentCount: 0,
    acceptedState: null,
    ...overrides,
  };
}

function withStatus(status: Partial<AnnotationsListFilter["statuses"]>): AnnotationsListFilter["statuses"] {
  return { ...DEFAULT_ANNOTATIONS_LIST_STATUS_FILTERS, ...status };
}

describe("matchesAnnotationsListFilter", () => {
  const defaultFilter = DEFAULT_ANNOTATIONS_LIST_FILTER;

  it("matches everything with the default filter", () => {
    expect(matchesAnnotationsListFilter(makeAnnotation("1"), defaultFilter)).toBe(true);
    expect(matchesAnnotationsListFilter(makeAnnotation("2", { type: "prediction" }), defaultFilter)).toBe(true);
  });

  describe("type filter", () => {
    it("filters by annotation type", () => {
      const filter: AnnotationsListFilter = { ...defaultFilter, type: "annotation" };
      expect(matchesAnnotationsListFilter(makeAnnotation("1"), filter)).toBe(true);
      expect(matchesAnnotationsListFilter(makeAnnotation("2", { type: "prediction" }), filter)).toBe(false);
    });

    it("filters by prediction type", () => {
      const filter: AnnotationsListFilter = { ...defaultFilter, type: "prediction" };
      expect(matchesAnnotationsListFilter(makeAnnotation("1"), filter)).toBe(false);
      expect(matchesAnnotationsListFilter(makeAnnotation("2", { type: "prediction" }), filter)).toBe(true);
    });
  });

  describe("boolean status filters", () => {
    it("matches drafts when true", () => {
      const filter: AnnotationsListFilter = { ...defaultFilter, statuses: withStatus({ draft: true }) };
      expect(matchesAnnotationsListFilter(makeAnnotation("1", { pk: null }), filter)).toBe(true);
      expect(matchesAnnotationsListFilter(makeAnnotation("2", { pk: "123" }), filter)).toBe(false);
    });

    it("excludes drafts when false", () => {
      const filter: AnnotationsListFilter = { ...defaultFilter, statuses: withStatus({ draft: false }) };
      expect(matchesAnnotationsListFilter(makeAnnotation("1", { pk: null }), filter)).toBe(false);
      expect(matchesAnnotationsListFilter(makeAnnotation("2", { pk: "123" }), filter)).toBe(true);
    });

    it("matches drafts (draftId > 0)", () => {
      const filter: AnnotationsListFilter = { ...defaultFilter, statuses: withStatus({ draft: true }) };
      expect(matchesAnnotationsListFilter(makeAnnotation("1", { draftId: 5 }), filter)).toBe(true);
    });

    it("matches drafts (ephemeral)", () => {
      const filter: AnnotationsListFilter = { ...defaultFilter, statuses: withStatus({ draft: true }) };
      expect(matchesAnnotationsListFilter(makeAnnotation("1", { ephemeral: true }), filter)).toBe(true);
    });

    it("matches ground truth true and false", () => {
      const trueFilter: AnnotationsListFilter = { ...defaultFilter, statuses: withStatus({ groundTruth: true }) };
      const falseFilter: AnnotationsListFilter = { ...defaultFilter, statuses: withStatus({ groundTruth: false }) };
      expect(matchesAnnotationsListFilter(makeAnnotation("1", { groundTruth: true }), trueFilter)).toBe(true);
      expect(matchesAnnotationsListFilter(makeAnnotation("2", { groundTruth: false }), trueFilter)).toBe(false);
      expect(matchesAnnotationsListFilter(makeAnnotation("3", { groundTruth: false }), falseFilter)).toBe(true);
      expect(matchesAnnotationsListFilter(makeAnnotation("4", { groundTruth: true }), falseFilter)).toBe(false);
    });

    it("matches skipped true and false", () => {
      const trueFilter: AnnotationsListFilter = { ...defaultFilter, statuses: withStatus({ skipped: true }) };
      const falseFilter: AnnotationsListFilter = { ...defaultFilter, statuses: withStatus({ skipped: false }) };
      expect(matchesAnnotationsListFilter(makeAnnotation("1", { skipped: true }), trueFilter)).toBe(true);
      expect(matchesAnnotationsListFilter(makeAnnotation("2", { skipped: false }), trueFilter)).toBe(false);
      expect(matchesAnnotationsListFilter(makeAnnotation("3", { skipped: false }), falseFilter)).toBe(true);
    });

    it("matches unresolved comments true and false", () => {
      const trueFilter: AnnotationsListFilter = {
        ...defaultFilter,
        statuses: withStatus({ unresolvedComments: true }),
      };
      const falseFilter: AnnotationsListFilter = {
        ...defaultFilter,
        statuses: withStatus({ unresolvedComments: false }),
      };
      expect(matchesAnnotationsListFilter(makeAnnotation("1", { unresolvedCommentCount: 3 }), trueFilter)).toBe(true);
      expect(matchesAnnotationsListFilter(makeAnnotation("2", { unresolvedCommentCount: 0 }), trueFilter)).toBe(false);
      expect(matchesAnnotationsListFilter(makeAnnotation("3", { unresolvedCommentCount: 0 }), falseFilter)).toBe(true);
    });

    it("matches reviewed true and false", () => {
      const trueFilter: AnnotationsListFilter = { ...defaultFilter, statuses: withStatus({ reviewed: true }) };
      const falseFilter: AnnotationsListFilter = { ...defaultFilter, statuses: withStatus({ reviewed: false }) };
      expect(matchesAnnotationsListFilter(makeAnnotation("1", { acceptedState: "accepted" }), trueFilter)).toBe(true);
      expect(matchesAnnotationsListFilter(makeAnnotation("2", { acceptedState: null }), trueFilter)).toBe(false);
      expect(matchesAnnotationsListFilter(makeAnnotation("3", { acceptedState: null }), falseFilter)).toBe(true);
    });

    it("matches accepted and rejected filters", () => {
      const acceptedFilter: AnnotationsListFilter = { ...defaultFilter, statuses: withStatus({ accepted: true }) };
      const rejectedFilter: AnnotationsListFilter = { ...defaultFilter, statuses: withStatus({ rejected: true }) };
      expect(matchesAnnotationsListFilter(makeAnnotation("1", { acceptedState: "accepted" }), acceptedFilter)).toBe(
        true,
      );
      expect(matchesAnnotationsListFilter(makeAnnotation("2", { acceptedState: "fixed" }), acceptedFilter)).toBe(false);
      expect(matchesAnnotationsListFilter(makeAnnotation("3", { acceptedState: "rejected" }), acceptedFilter)).toBe(
        false,
      );
      expect(matchesAnnotationsListFilter(makeAnnotation("4", { acceptedState: "rejected" }), rejectedFilter)).toBe(
        true,
      );
    });

    it("matches fix + accepted filter", () => {
      const fixedAndAcceptedFilter: AnnotationsListFilter = {
        ...defaultFilter,
        statuses: withStatus({ fixedAndAccepted: true }),
      };
      const hideFixedAndAcceptedFilter: AnnotationsListFilter = {
        ...defaultFilter,
        statuses: withStatus({ fixedAndAccepted: false }),
      };
      expect(
        matchesAnnotationsListFilter(makeAnnotation("1", { acceptedState: "fixed" }), fixedAndAcceptedFilter),
      ).toBe(true);
      expect(
        matchesAnnotationsListFilter(makeAnnotation("2", { acceptedState: "accepted" }), fixedAndAcceptedFilter),
      ).toBe(false);
      expect(
        matchesAnnotationsListFilter(makeAnnotation("3", { acceptedState: "fixed" }), hideFixedAndAcceptedFilter),
      ).toBe(false);
      expect(
        matchesAnnotationsListFilter(makeAnnotation("4", { acceptedState: "accepted" }), hideFixedAndAcceptedFilter),
      ).toBe(true);
    });

    it("uses AND semantics across active status filters", () => {
      const filter: AnnotationsListFilter = {
        ...defaultFilter,
        statuses: withStatus({ groundTruth: true, skipped: true }),
      };
      expect(matchesAnnotationsListFilter(makeAnnotation("1", { groundTruth: true, skipped: true }), filter)).toBe(
        true,
      );
      expect(matchesAnnotationsListFilter(makeAnnotation("2", { groundTruth: true, skipped: false }), filter)).toBe(
        false,
      );
      expect(matchesAnnotationsListFilter(makeAnnotation("3", { groundTruth: false, skipped: true }), filter)).toBe(
        false,
      );
    });
  });

  describe("text search", () => {
    it("matches by annotation ID (pk)", () => {
      const filter: AnnotationsListFilter = { ...defaultFilter, query: "123" };
      expect(matchesAnnotationsListFilter(makeAnnotation("1", { pk: "123" }), filter)).toBe(true);
      expect(matchesAnnotationsListFilter(makeAnnotation("2", { pk: "456" }), filter)).toBe(false);
    });

    it("does not match by client id when pk differs", () => {
      const filter: AnnotationsListFilter = { ...defaultFilter, query: "abc" };
      expect(
        matchesAnnotationsListFilter(makeAnnotation("abc", { pk: "999", createdBy: "someone-else" }), filter),
      ).toBe(false);
      expect(
        matchesAnnotationsListFilter(makeAnnotation("client-only", { pk: null, createdBy: "someone-else" }), filter),
      ).toBe(false);
    });

    it("matches by createdBy name fallback (case insensitive)", () => {
      const filter: AnnotationsListFilter = { ...defaultFilter, query: "User" };
      expect(matchesAnnotationsListFilter(makeAnnotation("1", { createdBy: "user-1" }), filter)).toBe(true);
    });

    it("matches by user display name", () => {
      const filter: AnnotationsListFilter = { ...defaultFilter, query: "alice" };
      const a = makeAnnotation("1", {
        user: { firstName: "Alice", lastName: "Smith", email: "other@example.com" },
      });
      expect(matchesAnnotationsListFilter(a, filter)).toBe(true);
    });

    it("matches by user email", () => {
      const filter: AnnotationsListFilter = {
        ...defaultFilter,
        query: "alice",
      };
      const a = makeAnnotation("1", { user: { email: "alice@example.com" } });
      expect(matchesAnnotationsListFilter(a, filter)).toBe(true);
    });

    it("ignores whitespace-only query", () => {
      const filter: AnnotationsListFilter = { ...defaultFilter, query: "   " };
      expect(matchesAnnotationsListFilter(makeAnnotation("1"), filter)).toBe(true);
    });

    it("matches by label value in versions.result", () => {
      const filter: AnnotationsListFilter = { ...defaultFilter, query: "Airplane" };
      const match = makeAnnotation("1", {
        createdBy: "someone-else",
        versions: {
          result: [{ value: { choices: ["Airplane"] }, from_name: "choice", to_name: "image", type: "choices" }],
        },
      });
      const noMatch = makeAnnotation("2", {
        createdBy: "someone-else",
        versions: {
          result: [{ value: { choices: ["Car"] }, from_name: "choice", to_name: "image", type: "choices" }],
        },
      });
      expect(matchesAnnotationsListFilter(match, filter)).toBe(true);
      expect(matchesAnnotationsListFilter(noMatch, filter)).toBe(false);
    });

    it("matches by JSON key name in versions.result", () => {
      const filter: AnnotationsListFilter = { ...defaultFilter, query: "from_name" };
      const match = makeAnnotation("1", {
        createdBy: "someone-else",
        versions: {
          result: [{ value: { choices: ["Car"] }, from_name: "choice", to_name: "image", type: "choices" }],
        },
      });
      expect(matchesAnnotationsListFilter(match, filter)).toBe(true);
    });

    it("matches by label value in versions.draft", () => {
      const filter: AnnotationsListFilter = { ...defaultFilter, query: "Airplane" };
      const match = makeAnnotation("1", {
        createdBy: "someone-else",
        versions: {
          draft: [{ value: { choices: ["Airplane"] }, from_name: "choice", to_name: "image", type: "choices" }],
        },
      });
      expect(matchesAnnotationsListFilter(match, filter)).toBe(true);
    });
  });

  describe("combined filters", () => {
    it("applies type AND status AND text together", () => {
      const filter: AnnotationsListFilter = {
        query: "user-1",
        type: "annotation",
        statuses: withStatus({ groundTruth: true }),
      };
      const match = makeAnnotation("1", { groundTruth: true, createdBy: "user-1" });
      const noType = makeAnnotation("2", { type: "prediction", groundTruth: true, createdBy: "user-1" });
      const noStatus = makeAnnotation("3", { groundTruth: false, createdBy: "user-1" });
      const noQuery = makeAnnotation("4", { groundTruth: true, createdBy: "someone" });

      expect(matchesAnnotationsListFilter(match, filter)).toBe(true);
      expect(matchesAnnotationsListFilter(noType, filter)).toBe(false);
      expect(matchesAnnotationsListFilter(noStatus, filter)).toBe(false);
      expect(matchesAnnotationsListFilter(noQuery, filter)).toBe(false);
    });

    it("excludes predictions when type is all and status filters are active", () => {
      const filter: AnnotationsListFilter = {
        ...defaultFilter,
        statuses: withStatus({ accepted: true }),
      };
      expect(matchesAnnotationsListFilter(makeAnnotation("1", { acceptedState: "accepted" }), filter)).toBe(true);
      expect(matchesAnnotationsListFilter(makeAnnotation("2", { type: "prediction" }), filter)).toBe(false);
    });

    it("ignores status filters when type is prediction", () => {
      const filter: AnnotationsListFilter = {
        ...defaultFilter,
        type: "prediction",
        statuses: withStatus({ accepted: true, draft: true }),
      };
      expect(matchesAnnotationsListFilter(makeAnnotation("1", { type: "prediction" }), filter)).toBe(true);
      expect(
        matchesAnnotationsListFilter(makeAnnotation("2", { type: "annotation", acceptedState: "accepted" }), filter),
      ).toBe(false);
    });
  });
});

describe("filterAnnotationsList", () => {
  it("always includes the selected annotation even when filtered out", () => {
    const entities = [makeAnnotation("1", { groundTruth: true }), makeAnnotation("2", { groundTruth: false })];
    const filter: AnnotationsListFilter = { query: "", type: "all", statuses: withStatus({ groundTruth: true }) };
    const result = filterAnnotationsList(entities, filter, "2");
    expect(result.map((e) => e.id)).toEqual(["1", "2"]);
  });

  it("filters normally when selectedId is null", () => {
    const entities = [makeAnnotation("1", { groundTruth: true }), makeAnnotation("2", { groundTruth: false })];
    const filter: AnnotationsListFilter = { query: "", type: "all", statuses: withStatus({ groundTruth: true }) };
    const result = filterAnnotationsList(entities, filter, null);
    expect(result.map((e) => e.id)).toEqual(["1"]);
  });
});

describe("normalizeAnnotationsListFilter", () => {
  it("migrates legacy status arrays to boolean true filters", () => {
    const normalized = normalizeAnnotationsListFilter({
      query: "",
      type: "all",
      statuses: ["groundTruth", "draft"],
    });

    expect(normalized.statuses.groundTruth).toBe(true);
    expect(normalized.statuses.draft).toBe(true);
    expect(normalized.statuses.skipped).toBe(null);
  });

  it("migrates legacy statuses.annotation true to type annotation", () => {
    const normalized = normalizeAnnotationsListFilter({
      query: "",
      type: "all",
      statuses: { annotation: true, prediction: null },
    });

    expect(normalized.type).toBe("annotation");
    expect(normalized.statuses.draft).toBe(null);
  });

  it("migrates legacy statuses.prediction true to type prediction", () => {
    const normalized = normalizeAnnotationsListFilter({
      query: "",
      type: "all",
      statuses: { prediction: true, annotation: null },
    });

    expect(normalized.type).toBe("prediction");
  });

  it("migrates legacy statuses.annotation false to type prediction", () => {
    const normalized = normalizeAnnotationsListFilter({
      query: "",
      type: "all",
      statuses: { annotation: false, prediction: null },
    });

    expect(normalized.type).toBe("prediction");
  });

  it("migrates legacy status array annotation to type annotation", () => {
    const normalized = normalizeAnnotationsListFilter({
      query: "",
      type: "all",
      statuses: ["annotation", "groundTruth"],
    });

    expect(normalized.type).toBe("annotation");
    expect(normalized.statuses.groundTruth).toBe(true);
  });
});

describe("isFilterActive", () => {
  it("returns false for default filter", () => {
    expect(isFilterActive(DEFAULT_ANNOTATIONS_LIST_FILTER)).toBe(false);
  });

  it("returns true when query is set", () => {
    expect(isFilterActive({ ...DEFAULT_ANNOTATIONS_LIST_FILTER, query: "x" })).toBe(true);
  });

  it("returns true when type is not all", () => {
    expect(isFilterActive({ ...DEFAULT_ANNOTATIONS_LIST_FILTER, type: "annotation" })).toBe(true);
  });

  it("returns true when boolean status filters are set", () => {
    expect(
      isFilterActive({
        ...DEFAULT_ANNOTATIONS_LIST_FILTER,
        statuses: withStatus({ draft: true }),
      }),
    ).toBe(true);
    expect(
      isFilterActive({
        ...DEFAULT_ANNOTATIONS_LIST_FILTER,
        statuses: withStatus({ draft: false }),
      }),
    ).toBe(true);
  });
});

describe("hasActiveStatusFilters", () => {
  it("returns false when all status filters are null", () => {
    expect(hasActiveStatusFilters(DEFAULT_ANNOTATIONS_LIST_STATUS_FILTERS)).toBe(false);
  });

  it("returns true when any status filter is set", () => {
    expect(hasActiveStatusFilters(withStatus({ rejected: false }))).toBe(true);
  });
});

describe("stripReviewStatusFilters", () => {
  it("clears review status filters when review filters are disabled", () => {
    const filter: AnnotationsListFilter = {
      ...DEFAULT_ANNOTATIONS_LIST_FILTER,
      statuses: withStatus({ accepted: true, rejected: false, fixedAndAccepted: true, draft: true }),
    };

    const stripped = stripReviewStatusFilters(filter, false);

    expect(stripped.statuses.accepted).toBe(null);
    expect(stripped.statuses.rejected).toBe(null);
    expect(stripped.statuses.fixedAndAccepted).toBe(null);
    expect(stripped.statuses.draft).toBe(true);
  });

  it("leaves filter unchanged when review filters are enabled", () => {
    const filter: AnnotationsListFilter = {
      ...DEFAULT_ANNOTATIONS_LIST_FILTER,
      statuses: withStatus({ accepted: true }),
    };

    expect(stripReviewStatusFilters(filter, true)).toEqual(filter);
  });
});
