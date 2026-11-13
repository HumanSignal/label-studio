import { describe, expect, it } from "bun:test";
import { keymap } from "../keymap";
import { isTextEntryElement, shortcutFilter, shouldYieldToEditor } from "../shortcut-guards";

describe("isTextEntryElement", () => {
  it("treats text inputs, textareas, selects and contenteditable as text entry", () => {
    expect(isTextEntryElement({ tagName: "INPUT", type: "text" })).toBe(true);
    expect(isTextEntryElement({ tagName: "INPUT", type: "search" })).toBe(true);
    expect(isTextEntryElement({ tagName: "INPUT", type: "number" })).toBe(true);
    expect(isTextEntryElement({ tagName: "INPUT" })).toBe(true); // no type = text
    expect(isTextEntryElement({ tagName: "TEXTAREA" })).toBe(true);
    expect(isTextEntryElement({ tagName: "SELECT" })).toBe(true);
    expect(isTextEntryElement({ tagName: "DIV", isContentEditable: true })).toBe(true);
  });

  it("does not treat choice controls (radio, checkbox, buttons) as text entry", () => {
    expect(isTextEntryElement({ tagName: "INPUT", type: "radio" })).toBe(false);
    expect(isTextEntryElement({ tagName: "INPUT", type: "checkbox" })).toBe(false);
    expect(isTextEntryElement({ tagName: "INPUT", type: "RADIO" })).toBe(false);
    expect(isTextEntryElement({ tagName: "INPUT", type: "submit" })).toBe(false);
    expect(isTextEntryElement({ tagName: "BUTTON" })).toBe(false);
  });

  it("does not treat read-only fields or plain elements as text entry", () => {
    expect(isTextEntryElement({ tagName: "INPUT", type: "text", readOnly: true })).toBe(false);
    expect(isTextEntryElement({ tagName: "TEXTAREA", readOnly: true })).toBe(false);
    expect(isTextEntryElement({ tagName: "BODY" })).toBe(false);
    expect(isTextEntryElement({ tagName: "CANVAS" })).toBe(false);
    expect(isTextEntryElement(null)).toBe(false);
    expect(isTextEntryElement(undefined)).toBe(false);
  });
});

describe("shortcutFilter", () => {
  it("lets shortcuts through from a focused radio button (a Choice the user just clicked)", () => {
    expect(shortcutFilter({ target: { tagName: "INPUT", type: "radio" } })).toBe(true);
  });

  it("blocks shortcuts while typing", () => {
    expect(shortcutFilter({ target: { tagName: "INPUT", type: "text" } })).toBe(false);
    expect(shortcutFilter({ target: { tagName: "TEXTAREA" } })).toBe(false);
  });

  it("falls back to srcElement", () => {
    expect(shortcutFilter({ srcElement: { tagName: "TEXTAREA" } })).toBe(false);
    expect(shortcutFilter({ srcElement: { tagName: "BODY" } })).toBe(true);
  });
});

describe("shouldYieldToEditor", () => {
  it("only yields marked actions, and only while labeling is active", () => {
    expect(shouldYieldToEditor({ yieldToEditor: true }, true)).toBe(true);
    expect(shouldYieldToEditor({ yieldToEditor: true }, false)).toBe(false);
    expect(shouldYieldToEditor({}, true)).toBe(false);
    expect(shouldYieldToEditor({ yieldToEditor: false }, true)).toBe(false);
  });

  it("keeps task navigation working while labeling (regression: #9639)", () => {
    expect(shouldYieldToEditor(keymap["dm.focus-previous"], true)).toBe(false);
    expect(shouldYieldToEditor(keymap["dm.focus-next"], true)).toBe(false);
  });

  it("still yields the shortcuts whose keys the editor uses (Shift+Left/Right)", () => {
    expect(shouldYieldToEditor(keymap["dm.close-labeling"], true)).toBe(true);
    expect(shouldYieldToEditor(keymap["dm.open-labeling"], true)).toBe(true);
  });
});
