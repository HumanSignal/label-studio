import { describe, expect, it } from "bun:test";
import defaultKeymap from "../../core/settings/keymap.json";
import { hotkeyLabel, rejectTooltip, REJECT_ACTION_HOTKEY_NAMES } from "../rejectHotkeys";

describe("reject hotkeys", () => {
  it("names a keymap entry for every reject action", () => {
    for (const name of Object.values(REJECT_ACTION_HOTKEY_NAMES)) {
      expect((defaultKeymap as Record<string, unknown>)[name]).toBeDefined();
    }
  });

  it("renders the bound combo the way tooltips show it", () => {
    expect(hotkeyLabel("annotation:skip")).toMatch(/^(Ctrl\+Space|⌥\+Enter)$/);
    expect(hotkeyLabel("annotation:reject-remove")).toMatch(/^(Ctrl|⌥)\+Shift\+1$/);
  });

  it("has no label for a name nothing binds", () => {
    expect(hotkeyLabel("annotation:not-a-hotkey")).toBe("");
  });
});

describe("rejectTooltip", () => {
  const description = "Reject without sending for rework";

  it("keeps the description when Show hotkeys on tooltips is off", () => {
    expect(rejectTooltip(description, "remove", false)).toBe(description);
  });

  it("lists Skip/Reject and the action's own chord when the setting is on", () => {
    expect(rejectTooltip(description, "remove", true)).toMatch(
      /^Reject without sending for rework: \[ (Ctrl\+Space|⌥\+Enter) \] \[ (Ctrl|⌥)\+Shift\+1 \]$/,
    );
  });

  it("falls back to Skip/Reject alone when the action has no named key", () => {
    expect(rejectTooltip(description, undefined, true)).toMatch(
      /^Reject without sending for rework: \[ (Ctrl\+Space|⌥\+Enter) \]$/,
    );
  });
});
