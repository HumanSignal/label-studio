import { describe, expect, it } from "bun:test";
import {
  canWriteDraftSnapshot,
  draftViewModeFromClassic,
  reviewHasChanges,
  shouldAutosave,
  shouldPersistBeforeLeave,
} from "./draft-policy";
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

describe("draftViewModeFromClassic", () => {
  it("returns submitted when a draft exists but is not selected (FIT-1685)", () => {
    expect(draftViewModeFromClassic(true, false)).toBe("submitted");
  });

  it("returns draft when draft is selected or no persisted draft", () => {
    expect(draftViewModeFromClassic(true, true)).toBe("draft");
    expect(draftViewModeFromClassic(false, false)).toBe("draft");
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
