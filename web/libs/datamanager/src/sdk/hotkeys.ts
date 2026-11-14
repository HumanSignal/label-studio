import { useHotkeys } from "react-hotkeys-hook";
import { pascalCase } from "@humansignal/core";
import { keymap } from "./keymap";
import { shortcutFilter, shouldYieldToEditor } from "./shortcut-guards";

export type Hotkey = {
  title: string;
  shortcut?: string;
  macos?: string;
  other?: string;
  yieldToEditor?: boolean;
};

const readableShortcut = (shortcut: string | null | undefined) => {
  if (!shortcut || typeof shortcut !== "string") {
    return "";
  }

  return shortcut
    .split("+")
    .map((str) => pascalCase(str))
    .join(" + ");
};

export const useShortcut = (
  actionName: keyof typeof keymap,
  callback: () => void,
  options = { showShortcut: true },
  dependencies = undefined,
) => {
  const action = keymap[actionName] as Hotkey;
  const isMacos = /mac/i.test(navigator.platform);

  let shortcut = action.shortcut ?? ((isMacos ? action.macos : action.other) as string);

  // Check for custom shortcut in app settings
  const customMapping = window.APP_SETTINGS?.lookupHotkey?.(`data_manager:${actionName}`);
  if (customMapping) {
    // Explicitly use the custom key even if it's null
    shortcut = customMapping.key;
  }

  useHotkeys(
    shortcut,
    (event?: KeyboardEvent) => {
      // Yield to editor (LSF) hotkeys when the labeling panel is active, but only for actions
      // whose key the editor also uses (`yieldToEditor` in the keymap). Yielding every action
      // made task navigation (Shift+Up/Down) dead whenever a task was open (#9639).
      // The flag is set by Label.jsx when labeling starts and toggled via
      // pointerdown tracking so clicks on the DM table re-enable DM shortcuts.
      if (shouldYieldToEditor(action, document.body.dataset.lsfLabeling === "true")) return;

      // Handled here, so skip the browser default too: e.g. Shift+Down on a focused radio
      // button (a Choice the user just clicked) would otherwise also change the selected choice.
      event?.preventDefault();
      callback();
    },
    {
      keyup: false,
      element: document.body,
      // Ignore key presses only while typing. The hotkeys-js default also ignores radio buttons
      // and checkboxes, so shortcuts stopped working after clicking a Choice.
      filter: shortcutFilter,
    } as any,
    dependencies,
  );

  const title = action.title + (options.showShortcut ? `: [ ${readableShortcut(shortcut)} ]` : "");

  return title;
};
