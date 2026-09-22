import { DEFAULT_HOTKEYS, HOTKEY_SECTIONS, getDynamicHotkeys, getDynamicSections, getDynamicVersion } from "./defaults";

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

export {
  registerDynamicHotkeySection,
  unregisterDynamicHotkeySection,
  clearDynamicHotkeySections,
  subscribeDynamicHotkeys,
  getDynamicSections,
  getDynamicHotkeys,
} from "./defaults";

export interface GetHotkeyOptions {
  includeDynamic?: boolean;
}

export interface ManifestActionLike {
  id?: string;
  label: string;
  defaultHotkey?: string;
  scope?: string;
  canonicalActionId?: string;
  description?: string;
}

export interface ComponentManifestLike {
  name: string;
  title?: string;
  description?: string;
  category?: string;
  actions: Record<string, ManifestActionLike>;
}

export const manifestToHotkeySection = (manifest: ComponentManifestLike): { section: Section; hotkeys: Hotkey[] } => {
  const sectionId = manifest.name;
  const title = manifest.title || manifest.name.replace(/([a-z])([A-Z])/g, "$1 $2");
  const section: Section = {
    id: sectionId,
    title,
    description: manifest.description,
  };

  const rawActions = Array.isArray(manifest.actions)
    ? (manifest.actions as any[]).reduce(
        (acc, a) => {
          if (a && typeof a === "object") {
            const key = a.id || a.name;
            if (key) acc[key] = a;
          }
          return acc;
        },
        {} as Record<string, ManifestActionLike>,
      )
    : manifest.actions || {};

  const hotkeys: Hotkey[] = Object.entries(rawActions).map(([actionKey, action]) => {
    const element = action.id || actionKey;
    const key = action.defaultHotkey ?? "";
    return {
      id: `${sectionId}:${element}`,
      section: sectionId,
      element,
      label: action.label || element,
      key,
      mac: key,
      active: true,
      description: action.description,
    };
  });

  return { section, hotkeys };
};

let cachedSectionsStatic: Section[] | null = null;
let cachedSectionsDynamic: Section[] | null = null;
let cachedSectionsDynamicVersion = -1;

export const getHotkeySections = (options?: GetHotkeyOptions): Section[] => {
  const includeDynamic = options?.includeDynamic ?? false;
  if (!cachedSectionsStatic) {
    cachedSectionsStatic = [...(HOTKEY_SECTIONS as Section[])];
  }
  if (!includeDynamic) {
    return cachedSectionsStatic;
  }
  const currentVersion = getDynamicVersion();
  if (cachedSectionsDynamic && cachedSectionsDynamicVersion === currentVersion) {
    return cachedSectionsDynamic;
  }
  cachedSectionsDynamic = [...cachedSectionsStatic, ...(getDynamicSections() as Section[])];
  cachedSectionsDynamicVersion = currentVersion;
  return cachedSectionsDynamic;
};

let cachedDefaultsStatic: Hotkey[] | null = null;
let cachedDefaultsDynamic: Hotkey[] | null = null;
let cachedDefaultsDynamicVersion = -1;

// Convert DEFAULT_HOTKEYS with numeric IDs to typed hotkeys with string IDs
export const getTypedDefaultHotkeys = (options?: GetHotkeyOptions): Hotkey[] => {
  const includeDynamic = options?.includeDynamic ?? false;
  if (!cachedDefaultsStatic) {
    cachedDefaultsStatic = (DEFAULT_HOTKEYS as RawHotkey[]).map((hotkey) => ({
      ...hotkey,
      id: String(hotkey.id), // Convert numeric id to string
    }));
  }
  if (!includeDynamic) {
    return cachedDefaultsStatic;
  }
  const currentVersion = getDynamicVersion();
  if (cachedDefaultsDynamic && cachedDefaultsDynamicVersion === currentVersion) {
    return cachedDefaultsDynamic;
  }
  const dynamicHotkeys = (getDynamicHotkeys() as RawHotkey[]).map((hotkey) => ({
    ...hotkey,
    id: String(hotkey.id),
  }));
  cachedDefaultsDynamic = [...cachedDefaultsStatic, ...dynamicHotkeys];
  cachedDefaultsDynamicVersion = currentVersion;
  return cachedDefaultsDynamic;
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
