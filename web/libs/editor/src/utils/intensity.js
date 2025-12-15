import { colorToRGBAArray } from "./colors";

/**
 * Parse textarea-based mean intensity values for gray/R/G/B channels.
 * Mirrors backend `_parse_textarea_means` behavior in
 * `label_studio/data_export/formats/segmentation_csv_exporter.py`.
 *
 * @param {string | string[] | null | undefined} rawValue
 * @returns {{ gray: number | null, r: number | null, g: number | null, b: number | null }}
 */
export const parseTextareaMeans = (rawValue) => {
  if (rawValue == null) {
    return { gray: null, r: null, g: null, b: null };
  }

  const value = Array.isArray(rawValue) ? rawValue[0] : rawValue;
  const raw = String(value).trim();

  if (!raw) {
    return { gray: null, r: null, g: null, b: null };
  }

  // First, try to interpret the whole string as a single gray value
  const direct = Number.parseFloat(raw);

  if (!Number.isNaN(direct) && /^-?\d+(\.\d+)?$/.test(raw)) {
    return { gray: direct, r: null, g: null, b: null };
  }

  let gray = null;
  let r = null;
  let g = null;
  let b = null;

  try {
    const regex = /(gray|grey|r|g|b)\s*[:=]\s*(-?\d+(?:\.\d+)?)/gi;
    let match;

    while ((match = regex.exec(raw)) !== null) {
      const key = match[1].toLowerCase();
      const val = Number.parseFloat(match[2]);

      if (Number.isNaN(val)) continue;

      if (key === "gray" || key === "grey") {
        gray = val;
      } else if (key === "r") {
        r = val;
      } else if (key === "g") {
        g = val;
      } else if (key === "b") {
        b = val;
      }
    }
  } catch {
    return { gray: null, r: null, g: null, b: null };
  }

  return { gray, r, g, b };
};

/**
 * Compute gray/R/G/B intensities from a display color.
 *
 * @param {string} color
 * @returns {{ gray: number, r: number, g: number, b: number }}
 */
export const computeColorIntensities = (color) => {
  const rgba = colorToRGBAArray(color);
  const r = rgba[0] ?? 0;
  const g = rgba[1] ?? 0;
  const b = rgba[2] ?? 0;

  // Luma approximation in 0–255 range
  const gray = 0.299 * r + 0.587 * g + 0.114 * b;

  return { gray, r, g, b };
};


