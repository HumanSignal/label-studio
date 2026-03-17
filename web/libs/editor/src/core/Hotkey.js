/**
 * Stub for when this file is loaded without Vite (e.g. Node in tests).
 * Production uses core/Hotkey.ts.
 */
export function Hotkey() {
  return {
    addNamed: () => {},
    removeNamed: () => {},
    unbindAll: () => {},
    addKey: () => {},
    removeKey: () => {},
  };
}

Hotkey.DEFAULT_SCOPE = "__main__";
Hotkey.setScope = () => {};
Hotkey.unbindAll = () => {};
Hotkey.keymap = {};
