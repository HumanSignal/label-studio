import i18next from "i18next";
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

/**
 * HOTKEY_SECTIONS in defaults.js is a module-level data catalog (also mirrored by
 * editor-side help surfaces), so its English titles stay in the data file and are
 * translated display-side via these keys — the same pattern the Data Manager uses
 * for backend-driven titles.
 */
const HOTKEY_SECTION_KEYS: Record<string, { titleKey: string; descriptionKey?: string }> = {
  annotation: {
    titleKey: "account:accountHotkeySectionAnnotationTitle",
    descriptionKey: "account:accountHotkeySectionAnnotationDesc",
  },
  data_manager: {
    titleKey: "account:accountHotkeySectionDataManagerTitle",
    descriptionKey: "account:accountHotkeySectionDataManagerDesc",
  },
  regions: {
    titleKey: "account:accountHotkeySectionRegionsTitle",
    descriptionKey: "account:accountHotkeySectionRegionsDesc",
  },
  tools: {
    titleKey: "account:accountHotkeySectionToolsTitle",
    descriptionKey: "account:accountHotkeySectionToolsDesc",
  },
  audio: {
    titleKey: "account:accountHotkeySectionAudioTitle",
    descriptionKey: "account:accountHotkeySectionAudioDesc",
  },
  video: {
    titleKey: "account:accountHotkeySectionVideoTitle",
    descriptionKey: "account:accountHotkeySectionVideoDesc",
  },
  timeseries: {
    titleKey: "account:accountHotkeySectionTimeseriesTitle",
    descriptionKey: "account:accountHotkeySectionTimeseriesDesc",
  },
  image_gallery: {
    titleKey: "account:accountHotkeySectionImageGalleryTitle",
    descriptionKey: "account:accountHotkeySectionImageGalleryDesc",
  },
  paragraphs: {
    titleKey: "account:accountHotkeySectionParagraphsTitle",
    descriptionKey: "account:accountHotkeySectionParagraphsDesc",
  },
};

export const hotkeySectionTitle = (sectionId: string, fallbackTitle: string): string => {
  const titleKey = HOTKEY_SECTION_KEYS[sectionId]?.titleKey;
  return titleKey ? i18next.t(titleKey, { defaultValue: fallbackTitle }) : fallbackTitle;
};

export const hotkeySectionDescription = (sectionId: string, fallbackDescription?: string): string | undefined => {
  if (!fallbackDescription) return undefined;
  const descriptionKey = HOTKEY_SECTION_KEYS[sectionId]?.descriptionKey;
  return descriptionKey ? i18next.t(descriptionKey, { defaultValue: fallbackDescription }) : fallbackDescription;
};
