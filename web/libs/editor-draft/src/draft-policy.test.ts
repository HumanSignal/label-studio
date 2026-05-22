import { describe, expect, it } from "bun:test";
import {
  canWriteDraftSnapshot,
  draftViewModeFromClassic,
  reviewHasChanges,
  shouldAutosave,
  shouldFlushDraftBeforeHistorySwitch,
  shouldPersistBeforeLeave,
  shouldPromoteSubmittedToDraftSession,
} from "./draft-policy";
import { annotationHasEditableChanges, draftDiffersFromSubmitted } from "./draft-result-compare";
import type { DraftViewMode } from "./types";

describe("shouldAutosave", () => {
  const base = {
    hasUnsavedEdits: true,
    viewMode: "draft" as DraftViewMode,
    editable: true,
    readOnly: false,
    submissionStarted: false,
  };

  const cases: Array<{ name: string; input: typeof base; expect: boolean }> = [
    { name: "hydrate / open without edits", input: { ...base, hasUnsavedEdits: false }, expect: false },
    { name: "user edit while viewing draft", input: base, expect: true },
    {
      name: "FIT-1685 preview submitted while draft exists",
      input: { ...base, viewMode: "submitted" },
      expect: false,
    },
    { name: "preview history", input: { ...base, viewMode: "history" }, expect: false },
    { name: "not editable", input: { ...base, editable: false }, expect: false },
    { name: "read only", input: { ...base, readOnly: true }, expect: false },
    { name: "submission started", input: { ...base, submissionStarted: true }, expect: false },
    {
      name: "hydrate / task navigation suppress window",
      input: { ...base, suppressUserEdits: true },
      expect: false,
    },
  ];

  for (const { name, input, expect: expected } of cases) {
    it(name, () => {
      expect(shouldAutosave(input)).toBe(expected);
    });
  }
});

describe("shouldPersistBeforeLeave", () => {
  const base = {
    hasUnsavedEdits: true,
    viewMode: "draft" as DraftViewMode,
    editable: true,
    submissionStarted: false,
    hasPersistedDraftVersion: false,
    draftSavedAt: null as string | null,
    lastEditAt: null as string | null,
  };

  it("returns false when not dirty", () => {
    expect(shouldPersistBeforeLeave({ ...base, hasUnsavedEdits: false })).toBe(false);
  });

  it("returns false when previewing submitted with draft version (FIT-1685)", () => {
    expect(
      shouldPersistBeforeLeave({
        ...base,
        hasPersistedDraftVersion: true,
        viewMode: "submitted",
      }),
    ).toBe(false);
  });

  it("returns true when dirty and never saved", () => {
    expect(shouldPersistBeforeLeave(base)).toBe(true);
  });

  it("returns true when last edit is after draftSavedAt", () => {
    expect(
      shouldPersistBeforeLeave({
        ...base,
        draftSavedAt: "2026-01-01T00:00:00.000Z",
        lastEditAt: "2026-01-01T00:01:00.000Z",
      }),
    ).toBe(true);
  });

  it("returns false when draft is up to date", () => {
    expect(
      shouldPersistBeforeLeave({
        ...base,
        draftSavedAt: "2026-01-01T00:01:00.000Z",
        lastEditAt: "2026-01-01T00:00:00.000Z",
      }),
    ).toBe(false);
  });
});

describe("reviewHasChanges", () => {
  it("false when no undo and no unsaved edits (BROS-1172 / 1096)", () => {
    expect(reviewHasChanges({ canUndo: false, hasUnsavedEdits: false })).toBe(false);
  });

  it("true when can undo", () => {
    expect(reviewHasChanges({ canUndo: true, hasUnsavedEdits: false })).toBe(true);
  });

  it("true when unsaved edits", () => {
    expect(reviewHasChanges({ canUndo: false, hasUnsavedEdits: true })).toBe(true);
  });
});

describe("draftDiffersFromSubmitted", () => {
  it("false when draft is empty or matches submitted", () => {
    const submitted = [{ id: "a", type: "choices", value: { choices: ["Cat"] } }];
    expect(draftDiffersFromSubmitted(submitted, [])).toBe(false);
    expect(draftDiffersFromSubmitted(submitted, submitted)).toBe(false);
  });

  it("true when draft value differs", () => {
    const submitted = [{ id: "a", type: "choices", value: { choices: ["Dog"] } }];
    const draft = [{ id: "a", type: "choices", value: { choices: ["Bird"] } }];
    expect(draftDiffersFromSubmitted(submitted, draft)).toBe(true);
  });

  it("true when only region meta differs", () => {
    const submitted = [{ id: "a", type: "choices", value: { choices: ["Dog"] } }];
    const draft = [{ id: "a", type: "choices", value: { choices: ["Dog"] }, meta: { text: ["note"] } }];
    expect(draftDiffersFromSubmitted(submitted, draft)).toBe(true);
  });
});

describe("annotationHasEditableChanges", () => {
  it("true when persisted draft over submitted without session undo", () => {
    expect(
      annotationHasEditableChanges({
        canUndo: false,
        hasUnsavedEdits: false,
        draftOverSubmitted: true,
      }),
    ).toBe(true);
  });

  it("false on submitted live when only undo stack has depth (post-update hydrate)", () => {
    expect(
      annotationHasEditableChanges({
        canUndo: true,
        hasUnsavedEdits: false,
        draftOverSubmitted: false,
        isSubmittedLive: true,
      }),
    ).toBe(false);
  });

  it("true on submitted live when user has unsaved edits", () => {
    expect(
      annotationHasEditableChanges({
        canUndo: false,
        hasUnsavedEdits: true,
        isSubmittedLive: true,
      }),
    ).toBe(true);
  });
});

describe("draftViewModeFromClassic", () => {
  it("returns submitted when a draft exists but is not selected (FIT-1685)", () => {
    expect(draftViewModeFromClassic(true, false)).toBe("submitted");
  });

  it("returns draft when draft is selected or no persisted draft", () => {
    expect(draftViewModeFromClassic(true, true)).toBe("draft");
    expect(draftViewModeFromClassic(false, false)).toBe("draft");
  });
});

describe("shouldFlushDraftBeforeHistorySwitch", () => {
  it("returns false when already previewing history", () => {
    expect(
      shouldFlushDraftBeforeHistorySwitch({
        hasUnsavedEdits: true,
        viewMode: "history",
        selectedHistoryId: "hist-1",
      }),
    ).toBe(false);
  });

  it("returns true when leaving live draft with unsaved edits", () => {
    expect(
      shouldFlushDraftBeforeHistorySwitch({
        hasUnsavedEdits: true,
        viewMode: "draft",
        selectedHistoryId: null,
      }),
    ).toBe(true);
    expect(
      shouldFlushDraftBeforeHistorySwitch({
        hasUnsavedEdits: false,
        viewMode: "draft",
        selectedHistoryId: null,
      }),
    ).toBe(false);
  });

  it("returns true when leaving submitted live with unsaved edits (new draft over submitted)", () => {
    expect(
      shouldFlushDraftBeforeHistorySwitch({
        hasUnsavedEdits: true,
        viewMode: "submitted",
        selectedHistoryId: null,
      }),
    ).toBe(true);
  });

  it("returns false when hopping between history previews", () => {
    expect(
      shouldFlushDraftBeforeHistorySwitch({
        hasUnsavedEdits: true,
        viewMode: "history",
        selectedHistoryId: "hist-1",
      }),
    ).toBe(false);
  });
});

describe("canWriteDraftSnapshot", () => {
  it("blocks preview mode like saveDraft FIT-1685 guard", () => {
    expect(
      canWriteDraftSnapshot({
        submissionStarted: false,
        editable: true,
        readOnly: false,
        viewMode: "submitted",
      }),
    ).toBe(false);
  });

  it("allows draft mode when editable", () => {
    expect(
      canWriteDraftSnapshot({
        submissionStarted: false,
        editable: true,
        readOnly: false,
        viewMode: "draft",
      }),
    ).toBe(true);
  });
});

describe("shouldPromoteSubmittedToDraftSession", () => {
  it("true for live submitted persisted annotation edits", () => {
    expect(
      shouldPromoteSubmittedToDraftSession({
        viewMode: "submitted",
        selectedHistoryId: null,
        sentUserGenerate: true,
      }),
    ).toBe(true);
  });

  it("false when already in draft view or previewing history", () => {
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
        selectedHistoryId: "history-1",
        sentUserGenerate: true,
      }),
    ).toBe(false);
  });
});
