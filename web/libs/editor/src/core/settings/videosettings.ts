import i18next from "i18next";
import type { SettingsProperties } from "./types";

// Translate lazily (at property access time) so the active language is always used.
const tr = (key: string, fallback: string) => i18next.t(`editor:${key}`, { defaultValue: fallback }) ?? fallback;

export default {
  videoDrawOutside: {
    get description() {
      return tr("setting_videoDrawOutside_description", "Allow drawing outside of video boundaries");
    },
    defaultValue: false,
    type: "boolean",
  },
  videoHopSize: {
    get description() {
      return tr("setting_videoHopSize_description", "Video hop size");
    },
    defaultValue: 10,
    type: "number",
  },
} as SettingsProperties;
