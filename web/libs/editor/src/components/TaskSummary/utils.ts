import Constants from "../../core/Constants";
import type { MSTControlTag } from "../../stores/types";
import { contrastColor, convertToRGBA } from "../../utils/colors";
import type { ControlTag, LabelColors, LabelCounts } from "./types";

const defaultLabelColor = Constants.LABEL_BACKGROUND;

/**
 * Generate light pastel-like background colors for label chips, cycling through
 * a palette of visually distinct color hues. Shades are intentionally light
 * and remain above the RGB threshold of 200 to ensure chip backgrounds are
 * always easily readable against white or light UIs.
 *
 * The method uses a fixed palette of "anchor" hues, moving to a different one
 * per index, and after each cycle, will decrease their intensity slightly (but
 * never below 200 per channel) to generate additional distinct but consistent shades.
 *
 * @param {number} index - The index in the palette (for color assignment)
 * @returns {string} - RGBA string of the computed background color
 */
const generateBackgroundColor = (index: number): string => {
  // Palette of anchor pastel colors (each as [r,g,b])
  const baseColors: [number, number, number][] = [
    // [250, 255, 250], // Light green
    [255, 255, 230], // Light yellow
    [247, 237, 250], // Light purple
    [240, 248, 255], // Alice blue (very light blue)
    [255, 240, 250], // Lavender blush (soft pink)
    [250, 250, 210], // Light goldenrod yellow
    [230, 255, 250], // Light cyan/turquoise
    [242, 255, 242], // Very pale mint
    [255, 250, 220], // Beige/cream
    [255, 245, 238], // Sea shell (pale coral)
    [225, 240, 255], // Pale blue-gray
    [246, 246, 232], // Soft creamy
  ];

  // How many base colors in our palette?
  const paletteLength = baseColors.length;

  // How many cycles have we gone through? (Each "cycle" darkens the shade)
  const cycle = Math.floor(index / paletteLength);

  // Index in our fixed palette
  const colorIdx = index % paletteLength;

  // Amount to decrease each channel per cycle (how quickly to darken)
  const decrementPerCycle = 10;

  // Get anchor color and adjust its channels
  let [r, g, b] = baseColors[colorIdx];

  // Reduce channels by cycle amount, but don't let any fall below 200 (to stay bright)
  const minChannelValue = 200;
  r = Math.max(r - decrementPerCycle * cycle, minChannelValue);
  g = Math.max(g - decrementPerCycle * cycle, minChannelValue);
  b = Math.max(b - decrementPerCycle * cycle, minChannelValue);

  // Use a soft, readable alpha
  const alpha = 0.8;

  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

/**
 * Get label colors for a control. Calculates background and border colors for each label.
 * @param control
 * @returns record of label colors
 */
export const getLabelColors = (control: MSTControlTag) => {
  if (!control.children) return {};

  const labelColors: Record<string, LabelColors> = {};
  let index = 0;

  for (const item of control.children) {
    const color = item.background;
    const background = color ? convertToRGBA(color, 0.3) : undefined;

    labelColors[item.value] = {
      value: item.value,
      border: color ?? defaultLabelColor,
      color: background ? contrastColor(background) : undefined,
      background: background ?? generateBackgroundColor(index),
    };
    index++;
  }

  return labelColors;
};

/**
 * Get label counts for a control. Extends color info with count.
 * @param {string[]} labels - list of labels to count
 * @param labelColors - record of label colors from `getLabelColors()`
 * @returns record with label counts and colors
 */
export const getLabelCounts = (labels: string[], labelColors: Record<string, LabelColors>) => {
  const labelCounts: Record<string, LabelCounts> = Object.fromEntries(
    Object.entries(labelColors).map(([lbl, attr]) => [lbl, { ...attr, count: 0 }]),
  );
  const defaultData = {
    background: convertToRGBA(defaultLabelColor, 0.3),
    border: defaultLabelColor,
    count: 0,
  };

  for (const label of labels) {
    let data = labelCounts[label];
    if (!data) {
      data = labelCounts[label] = { ...defaultData, value: label };
    }
    data.count++;
  }

  return labelCounts;
};

/**
 * Sort controls: global classifications first, then labels, then per-regions
 * @param controls - list of controls to sort
 * @returns sorted list of controls
 */
export const sortControls = (controls: ControlTag[]) => {
  return controls.sort((a, b) => {
    if (a.per_region && !b.per_region) return 1;
    if (!a.per_region && b.per_region) return -1;
    // for non-per-region controls, put classification controls first and labels next
    if (a.type.endsWith("labels") && !b.type.endsWith("labels")) return 1;
    if (!a.type.endsWith("labels") && b.type.endsWith("labels")) return -1;
    return 0;
  });
};
