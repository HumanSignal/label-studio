import { Hotkey } from "../core/Hotkey";
import defaultKeymap from "../core/settings/keymap.json";
import { isMacOS } from "./utilities";

type Keymap = Record<string, { key?: string; mac?: string } | undefined>;

/** The chord a keymap binds to `name` on this platform, if any. */
const chordIn = (keymap: Keymap | undefined, name: string, isMac: boolean): string => {
  const entry = keymap?.[name];

  return ((isMac ? (entry?.mac ?? entry?.key) : entry?.key) ?? "").trim();
};

/** The live keymap wins, since a project may remap these; the bundled defaults are the fallback. */
const chord = (name: string, isMac: boolean): string =>
  chordIn(Hotkey.keymap as Keymap, name, isMac) || chordIn(defaultKeymap as Keymap, name, isMac);

/**
 * Each reject action gets its own named keymap entry (see `core/settings/keymap.json`), so a key
 * always means the same action whatever its position in the split-button menu. Keys are the
 * custom button names the host sends for `reject`.
 */
export const REJECT_ACTION_HOTKEY_NAMES: Record<string, string> = {
  remove: "annotation:reject-remove",
  requeue: "annotation:reject-requeue",
  redistribute: "annotation:reject-redistribute",
};

const SKIP_REJECT_HOTKEY_NAME = "annotation:skip";

/** `ctrl+shift+1` → `Ctrl+Shift+1`, reading whatever the keymap currently binds. */
export const hotkeyLabel = (name: string): string => {
  const isMac = isMacOS();
  const labels: Record<string, string> = {
    ctrl: "Ctrl",
    shift: "Shift",
    alt: isMac ? "⌥" : "Alt",
    space: "Space",
    enter: "Enter",
  };

  return chord(name, isMac)
    .split("+")
    .filter(Boolean)
    .map((part) => labels[part] ?? part.toUpperCase())
    .join("+");
};

const rejectActionShortcut = (action?: string): string =>
  action ? hotkeyLabel(REJECT_ACTION_HOTKEY_NAMES[action] ?? "") : "";

/**
 * Reject-button tooltip. The description always shows; with "Show hotkeys on tooltips" on it also
 * lists both chords that commit this reject — the shared Skip/Reject key and the action's own key.
 */
export const rejectTooltip = (description: string, action: string | undefined, enableTooltips: boolean): string => {
  if (!enableTooltips) return description;
  const keys = [hotkeyLabel(SKIP_REJECT_HOTKEY_NAME), rejectActionShortcut(action)].filter(Boolean);
  return keys.length ? `${description}: ${keys.map((key) => `[ ${key} ]`).join(" ")}` : description;
};
