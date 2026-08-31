import {
  DEFAULT_ANNOTATIONS_LIST_SORT,
  normalizeAnnotationsListSort,
  sortAnnotationsList,
} from "../sortAnnotationsList";
import type { SharedAnnotation } from "../types";

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

describe("normalizeAnnotationsListSort", () => {
  it("normalizes legacy field-only values", () => {
    expect(normalizeAnnotationsListSort("createdAt")).toEqual({ field: "createdAt", direction: "desc" });
    expect(normalizeAnnotationsListSort("updatedAt")).toEqual({ field: "updatedAt", direction: "desc" });
  });

  it("normalizes full sort state objects", () => {
    expect(normalizeAnnotationsListSort({ field: "updatedAt", direction: "asc" })).toEqual({
      field: "updatedAt",
      direction: "asc",
    });
  });

  it("falls back to default for invalid values", () => {
    expect(normalizeAnnotationsListSort(null)).toEqual(DEFAULT_ANNOTATIONS_LIST_SORT);
    expect(normalizeAnnotationsListSort({ field: "invalid", direction: "sideways" })).toEqual({
      field: "createdAt",
      direction: "desc",
    });
  });

  it("normalizes name field", () => {
    expect(normalizeAnnotationsListSort("name")).toEqual({ field: "name", direction: "desc" });
    expect(normalizeAnnotationsListSort({ field: "name", direction: "asc" })).toEqual({
      field: "name",
      direction: "asc",
    });
  });
});

describe("sortAnnotationsList", () => {
  describe("createdAt sort", () => {
    it("sorts descending by createdDate (newest first)", () => {
      const entities = [
        makeAnnotation("1", { createdDate: "2024-01-01T00:00:00Z" }),
        makeAnnotation("2", { createdDate: "2024-01-03T00:00:00Z" }),
        makeAnnotation("3", { createdDate: "2024-01-02T00:00:00Z" }),
      ];
      const sorted = sortAnnotationsList(entities, { field: "createdAt", direction: "desc" });
      expect(sorted.map((e) => e.id)).toEqual(["2", "3", "1"]);
    });

    it("sorts ascending by createdDate (oldest first)", () => {
      const entities = [
        makeAnnotation("1", { createdDate: "2024-01-01T00:00:00Z" }),
        makeAnnotation("2", { createdDate: "2024-01-03T00:00:00Z" }),
        makeAnnotation("3", { createdDate: "2024-01-02T00:00:00Z" }),
      ];
      const sorted = sortAnnotationsList(entities, { field: "createdAt", direction: "asc" });
      expect(sorted.map((e) => e.id)).toEqual(["1", "3", "2"]);
    });

    it("does not mutate the input array", () => {
      const entities = [
        makeAnnotation("1", { createdDate: "2024-01-01T00:00:00Z" }),
        makeAnnotation("2", { createdDate: "2024-01-03T00:00:00Z" }),
      ];
      const original = [...entities];
      sortAnnotationsList(entities, { field: "createdAt", direction: "desc" });
      expect(entities).toEqual(original);
    });

    it("returns same array reference for 0 or 1 items", () => {
      const empty: SharedAnnotation[] = [];
      expect(sortAnnotationsList(empty, { field: "createdAt", direction: "desc" })).toBe(empty);

      const single = [makeAnnotation("1")];
      expect(sortAnnotationsList(single, { field: "createdAt", direction: "desc" })).toBe(single);
    });
  });

  describe("updatedAt sort", () => {
    it("sorts descending by updatedDate when available", () => {
      const entities = [
        makeAnnotation("1", { createdDate: "2024-01-01T00:00:00Z", updatedDate: "2024-01-05T00:00:00Z" }),
        makeAnnotation("2", { createdDate: "2024-01-03T00:00:00Z", updatedDate: "2024-01-04T00:00:00Z" }),
        makeAnnotation("3", { createdDate: "2024-01-02T00:00:00Z", updatedDate: "2024-01-06T00:00:00Z" }),
      ];
      const sorted = sortAnnotationsList(entities, { field: "updatedAt", direction: "desc" });
      expect(sorted.map((e) => e.id)).toEqual(["3", "1", "2"]);
    });

    it("falls back to createdDate when updatedDate is missing", () => {
      const entities = [
        makeAnnotation("1", { createdDate: "2024-01-01T00:00:00Z" }),
        makeAnnotation("2", { createdDate: "2024-01-03T00:00:00Z", updatedDate: "2024-01-02T00:00:00Z" }),
      ];
      const sorted = sortAnnotationsList(entities, { field: "updatedAt", direction: "desc" });
      expect(sorted.map((e) => e.id)).toEqual(["2", "1"]);
    });

    it("falls back to createdDate when updatedDate is empty string", () => {
      const entities = [
        makeAnnotation("1", { createdDate: "2024-01-03T00:00:00Z", updatedDate: "" }),
        makeAnnotation("2", { createdDate: "2024-01-01T00:00:00Z", updatedDate: "2024-01-04T00:00:00Z" }),
      ];
      const sorted = sortAnnotationsList(entities, { field: "updatedAt", direction: "desc" });
      expect(sorted.map((e) => e.id)).toEqual(["2", "1"]);
    });
  });

  describe("name sort", () => {
    it("sorts ascending by display name", () => {
      const entities = [
        makeAnnotation("1", { user: { firstName: "Charlie", lastName: "Brown" } }),
        makeAnnotation("2", { user: { firstName: "Alice", lastName: "Smith" } }),
        makeAnnotation("3", { createdBy: "bob@example.com" }),
      ];
      const sorted = sortAnnotationsList(entities, { field: "name", direction: "asc" });
      expect(sorted.map((e) => e.id)).toEqual(["2", "3", "1"]);
    });

    it("sorts descending by display name", () => {
      const entities = [
        makeAnnotation("1", { user: { firstName: "Charlie", lastName: "Brown" } }),
        makeAnnotation("2", { user: { firstName: "Alice", lastName: "Smith" } }),
        makeAnnotation("3", { createdBy: "bob@example.com" }),
      ];
      const sorted = sortAnnotationsList(entities, { field: "name", direction: "desc" });
      expect(sorted.map((e) => e.id)).toEqual(["1", "3", "2"]);
    });

    it("falls back to createdBy when user is missing", () => {
      const entities = [makeAnnotation("1", { createdBy: "zebra" }), makeAnnotation("2", { createdBy: "alpha" })];
      const sorted = sortAnnotationsList(entities, { field: "name", direction: "asc" });
      expect(sorted.map((e) => e.id)).toEqual(["2", "1"]);
    });
  });
});
