import { useHotkeys } from "react-hotkeys-hook";
import { pascalCase } from "@humansignal/core";
import { keymap } from "./keymap";

export type Hotkey = {
  title: string;
  shortcut?: string;
  macos?: string;
  other?: string;
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
    () => {
      // Yield to editor (LSF) hotkeys when the labeling panel is active.
      // The flag is set by Label.jsx when labeling starts and toggled via
      // pointerdown tracking so clicks on the DM table re-enable DM shortcuts.
      if (document.body.dataset.lsfLabeling === "true") return;

      callback();
    },
    {
      keyup: false,
      element: document.body,
    } as any,
    dependencies,
  );

  const title = action.title + (options.showShortcut ? `: [ ${readableShortcut(shortcut)} ]` : "");

  return title;
};
