import { DEFAULT_HOTKEYS } from "./defaults";

// Type definitions - centralized here to avoid duplication
export interface Hotkey {
  id: string;
  section: string;
  element: string;
  label: string;
  key: string;
  mac?: string;
  active: boolean;
  description?: string;
  subgroup?: string;
}

export interface Section {
  id: string;
  title: string;
  description?: string;
}

export interface DirtyState {
  [sectionId: string]: boolean;
}

export interface DuplicateConfirmDialog {
  open: boolean;
  hotkeyId: string | null;
  newKey: string | null;
  conflictingHotkeys: Hotkey[];
}

export type HotkeySettings = Record<string, unknown>;

export interface ExportData {
  hotkeys: Hotkey[];
  settings: HotkeySettings;
  exportedAt: string;
  version: string;
}

export interface ImportData {
  hotkeys?: Hotkey[];
  settings?: HotkeySettings;
}

export interface SaveResult {
  ok: boolean;
  error?: string;
  data?: unknown;
  runtimeReloadSuccess?: boolean;
  projectAccessLost?: boolean;
}

export interface ApiResponse {
  custom_hotkeys?: Record<string, { key: string; active: boolean; description?: string }>;
  hotkey_settings?: HotkeySettings;
  error?: string;
}

// Type definition for the raw hotkey data from defaults
interface RawHotkey {
  id: number;
  section: string;
  element: string;
  label: string;
  key: string;
  mac?: string;
  active: boolean;
  description?: string;
}

// Convert DEFAULT_HOTKEYS with numeric IDs to typed hotkeys with string IDs
export const getTypedDefaultHotkeys = (): Hotkey[] => {
  return (DEFAULT_HOTKEYS as RawHotkey[]).map((hotkey) => ({
    ...hotkey,
    id: String(hotkey.id), // Convert numeric id to string
  }));
};

// Global property declaration
declare global {
  interface Window {
    DEFAULT_HOTKEYS?: Hotkey[];
  }
}

// Global property setup function - called explicitly rather than as side effect
export const setupGlobalHotkeys = (): void => {
  if (typeof window !== "undefined") {
    // Declare global property if not already present
    if (!window.DEFAULT_HOTKEYS) {
      window.DEFAULT_HOTKEYS = getTypedDefaultHotkeys();
    }
  }
};
