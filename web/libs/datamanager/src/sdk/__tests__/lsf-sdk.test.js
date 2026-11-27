import { shouldSaveDraftOnSelectionChange } from "../lsf-sdk";

describe("shouldSaveDraftOnSelectionChange", () => {
  it("returns false when annotation reports no pending draft changes", () => {
    const annotation = {
      needsDraftSave: () => false,
      history: { undoIdx: 5 },
    };

    expect(shouldSaveDraftOnSelectionChange(annotation)).toBe(false);
  });

  it("returns true when annotation reports pending draft changes", () => {
    const annotation = {
      needsDraftSave: () => true,
      history: { undoIdx: 0 },
    };

    expect(shouldSaveDraftOnSelectionChange(annotation)).toBe(true);
  });

  it("falls back to history undo state when needsDraftSave is unavailable", () => {
    expect(shouldSaveDraftOnSelectionChange({ history: { undoIdx: 1 } })).toBe(true);
    expect(shouldSaveDraftOnSelectionChange({ history: { undoIdx: 0 } })).toBe(false);
  });
});
