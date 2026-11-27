import chroma from "chroma-js";

/**
 * Tailwind text classes for preset course badge icons (excludes neutral).
 * Literal class names so Tailwind includes them in the build.
 */
export const PRESET_ACCENT_ICON_CLASSES = {
  "#FF7557": "text-accent-persimmon-subtlest",
  "#FFA663": "text-accent-canteloupe-subtlest",
  "#FABA4C": "text-accent-mango-subtlest",
  "#78B757": "text-accent-kiwi-subtlest",
  "#57B7AB": "text-accent-kale-subtlest",
  "#539EEE": "text-accent-blueberry-subtlest",
  "#6D87F1": "text-accent-grape-subtlest",
  "#AC79D2": "text-accent-fig-subtlest",
  "#E37BD3": "text-accent-plum-subtlest",
};

const HEX_RE = /^#([0-9A-Fa-f]{6})$/;

/** Normalize to uppercase `#RRGGBB` for API / comparison. */
export function normalizeColorHex(value) {
  if (value == null || value === "") return null;
  const t = value.trim();
  if (!HEX_RE.test(t)) return null;
  return `#${t.slice(1).toUpperCase()}`;
}

/** Tailwind class for preset badge icons (excludes neutral). */
export function getPresetAccentIconClass(color) {
  const normalized = normalizeColorHex(color);
  if (!normalized || normalized === "#FFFFFF") return null;
  return PRESET_ACCENT_ICON_CLASSES[normalized] ?? null;
}

/** WCAG AA minimum contrast for large text / graphical UI (e.g. icons on swatches). */
const MIN_GRAPHICAL_CONTRAST = 3;

const ON_DARK_ICON_CONTRAST = "#FDFDFC";

function getOnColorForeground(hex) {
  try {
    const bg = chroma(hex);
    const onDarkContrast = chroma.contrast(bg, ON_DARK_ICON_CONTRAST);
    const blackContrast = chroma.contrast(bg, "#000000");
    const onDarkOk = onDarkContrast >= MIN_GRAPHICAL_CONTRAST;
    const blackOk = blackContrast >= MIN_GRAPHICAL_CONTRAST;

    if (onDarkOk && !blackOk) return "var(--color-neutral-on-dark-icon)";
    if (blackOk && !onDarkOk) return "#000000";
    if (onDarkOk && blackOk) {
      return bg.luminance() < 0.55 ? "var(--color-neutral-on-dark-icon)" : "#000000";
    }
    return onDarkContrast > blackContrast ? "var(--color-neutral-on-dark-icon)" : "#000000";
  } catch {
    return "var(--color-neutral-on-dark-icon)";
  }
}

/** Tailwind class for custom badge icons on saturated swatches. */
export function getCustomBadgeIconClass(hex) {
  return getOnColorForeground(hex) === "#000000" ? "text-black" : "text-neutral-on-dark-icon";
}
