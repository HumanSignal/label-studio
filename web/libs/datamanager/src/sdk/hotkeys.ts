import { useHotkeys } from "react-hotkeys-hook";
import { toStudlyCaps } from "strman";
import { keymap } from "./keymap";

export type Hotkey = {
  title: string;
  shortcut?: string;
  macos?: string;
  other?: string;
};

const readableShortcut = (shortcut: string) => {
  return shortcut
    .split("+")
    .map((str) => toStudlyCaps(str))
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
  const shortcut = action.shortcut ?? ((isMacos ? action.macos : action.other) as string);

  useHotkeys(
    shortcut,
    () => {
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
