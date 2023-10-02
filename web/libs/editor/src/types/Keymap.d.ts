declare interface Hotkey {
  description: string;
  key: string;
  mac?: string;
  modifier?: string;
  modifierDescription?: string;
}

declare interface Keymap {
  [key: string]: Hotkey;
}

declare module '*/keymap.json' {
  export type K = Keymap;
}
