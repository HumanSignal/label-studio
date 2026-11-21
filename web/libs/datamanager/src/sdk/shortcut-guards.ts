/**
 * Decides when Data Manager shortcuts may run. Kept free of imports so it can be unit tested
 * without a DOM or the rest of the SDK.
 */

/** `<input>` types that are controls rather than places to type text. */
const NON_TEXT_INPUT_TYPES = new Set([
  "button",
  "checkbox",
  "color",
  "file",
  "hidden",
  "image",
  "radio",
  "range",
  "reset",
  "submit",
]);

type ElementLike = {
  tagName?: string;
  type?: string;
  readOnly?: boolean;
  isContentEditable?: boolean;
} | null;

/**
 * True when the element takes typed text, so a key press there belongs to the user's typing,
 * not to a shortcut. Radio buttons, checkboxes and other non-text controls (e.g. a labeling
 * Choice the user just clicked) are not text entry.
 */
export const isTextEntryElement = (element: ElementLike | undefined): boolean => {
  if (!element) return false;
  if (element.isContentEditable) return true;

  switch (element.tagName) {
    case "TEXTAREA":
      return !element.readOnly;
    case "SELECT":
      return true;
    case "INPUT":
      if (element.readOnly) return false;
      return !NON_TEXT_INPUT_TYPES.has((element.type || "text").toLowerCase());
    default:
      return false;
  }
};

/**
 * Filter for hotkeys-js (used by react-hotkeys-hook): let shortcuts through unless the user is
 * typing. The library's default filter also drops events from radio buttons and checkboxes,
 * which made task navigation dead right after clicking a Choice.
 */
export const shortcutFilter = (event: { target?: unknown; srcElement?: unknown }): boolean =>
  !isTextEntryElement((event.target ?? event.srcElement) as ElementLike);

/**
 * Whether a Data Manager shortcut should give way to the labeling editor. Only actions whose key
 * the editor also uses (marked `yieldToEditor` in the keymap) yield, and only while the
 * labeling panel is the active panel.
 */
export const shouldYieldToEditor = (action: { yieldToEditor?: boolean }, labelingActive: boolean): boolean =>
  labelingActive && action.yieldToEditor === true;
