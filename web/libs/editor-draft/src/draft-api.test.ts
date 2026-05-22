import { describe, expect, it } from "bun:test";
import { parseShellAnnotationPk, resolveDraftCreateUrl, resolveDraftUpdateUrl } from "./draft-api";
import { mergeDraftIntoTaskSnapshot } from "./draft-task-merge";
import { shouldPromoteSubmittedToDraftSession } from "./draft-policy";

describe("draft-api", () => {
  it("parseShellAnnotationPk accepts numeric persisted ids only", () => {
    expect(parseShellAnnotationPk("10103")).toBe(10103);
    expect(parseShellAnnotationPk("new-annotation")).toBeUndefined();
    expect(parseShellAnnotationPk(null)).toBeUndefined();
  });

  it("resolveDraftCreateUrl uses annotation-scoped path when pk is known", () => {
    expect(resolveDraftCreateUrl(42, "10103")).toBe("/api/tasks/42/annotations/10103/drafts");
    expect(resolveDraftCreateUrl(42, "new-annotation")).toBe("/api/tasks/42/drafts");
  });

  it("resolveDraftUpdateUrl targets draft row", () => {
    expect(resolveDraftUpdateUrl(88)).toBe("/api/drafts/88/");
  });
});

describe("mergeDraftIntoTaskSnapshot", () => {
  it("links draft to annotation draft_id and task.drafts", () => {
    const task = {
      id: 1,
      annotations: [{ id: 55, draft_id: null }],
      drafts: [],
    };
    const merged = mergeDraftIntoTaskSnapshot(task, { id: 88, annotation: 55, result: [] });
    expect(merged.drafts).toEqual([{ id: 88, annotation: 55, result: [] }]);
    expect(merged.annotations[0].draft_id).toBe(88);
  });

  it("preserves created_at when PATCH autosave omits it", () => {
    const task = {
      id: 1,
      annotations: [{ id: 55, draft_id: 88 }],
      drafts: [{ id: 88, annotation: 55, created_at: "2026-05-22T10:00:00.000Z", result: [] }],
    };
    const merged = mergeDraftIntoTaskSnapshot(task, { id: 88, annotation: 55, result: [{ id: "r1" }] });
    expect(merged.drafts[0]?.created_at).toBe("2026-05-22T10:00:00.000Z");
    expect(merged.drafts[0]?.result).toEqual([{ id: "r1" }]);
  });

  it("keeps other task-level orphan drafts for the same owner when linking one draft", () => {
    const task = {
      id: 1,
      annotations: [{ id: 55, draft_id: null }],
      drafts: [
        { id: 70, annotation: null, created_by: { id: 9 }, result: [] },
        { id: 71, annotation: null, created_by: { id: 9 }, result: [{ id: "old" }] },
      ],
    };
    const merged = mergeDraftIntoTaskSnapshot(task, {
      id: 88,
      annotation: 55,
      created_by: { id: 9 },
      result: [{ id: "new" }],
    });
    expect(merged.drafts).toEqual([
      { id: 88, annotation: 55, created_by: { id: 9 }, result: [{ id: "new" }] },
      { id: 70, annotation: null, created_by: { id: 9 }, result: [] },
      { id: 71, annotation: null, created_by: { id: 9 }, result: [{ id: "old" }] },
    ]);
    expect(merged.annotations[0].draft_id).toBe(88);
  });

  it("prunes only orphan draft ids listed in options", () => {
    const task = {
      id: 1,
      annotations: [{ id: 55, draft_id: null }],
      drafts: [
        { id: 70, annotation: null, created_by: { id: 9 }, result: [] },
        { id: 71, annotation: null, created_by: { id: 9 }, result: [{ id: "old" }] },
      ],
    };
    const merged = mergeDraftIntoTaskSnapshot(
      task,
      {
        id: 88,
        annotation: 55,
        created_by: { id: 9 },
        result: [{ id: "new" }],
      },
      { pruneOrphanDraftIds: [70, 71] },
    );
    expect(merged.drafts).toEqual([{ id: 88, annotation: 55, created_by: { id: 9 }, result: [{ id: "new" }] }]);
  });
});

describe("shouldPromoteSubmittedToDraftSession", () => {
  it("true only for live submitted persisted annotations", () => {
    expect(
      shouldPromoteSubmittedToDraftSession({
        viewMode: "submitted",
        selectedHistoryId: null,
        sentUserGenerate: true,
      }),
    ).toBe(true);
    expect(
      shouldPromoteSubmittedToDraftSession({
        viewMode: "draft",
        selectedHistoryId: null,
        sentUserGenerate: true,
      }),
    ).toBe(false);
    expect(
      shouldPromoteSubmittedToDraftSession({
        viewMode: "submitted",
        selectedHistoryId: "h1",
        sentUserGenerate: true,
      }),
    ).toBe(false);
    expect(
      shouldPromoteSubmittedToDraftSession({
        viewMode: "submitted",
        selectedHistoryId: null,
        sentUserGenerate: false,
      }),
    ).toBe(false);
  });
});
