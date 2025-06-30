import colormap from "colormap";

const colorSchemeCache = new Map<string, (t: number) => number[]>();

function hexToRgb(hex: string): number[] {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? [Number.parseInt(result[1], 16), Number.parseInt(result[2], 16), Number.parseInt(result[3], 16)]
    : [0, 0, 0];
}

function createScheme(name: string): (t: number) => number[] {
  const colors = colormap({
    colormap: name as any,
    nshades: 256,
    format: "hex",
    alpha: 1,
  }).map(hexToRgb);

  return (t: number): number[] => {
    if (t <= 0) return colors[0];
    if (t >= 1) return colors[colors.length - 1];

    const index = Math.floor(t * (colors.length - 1));
    return colors[index];
  };
}

const PREDEFINED_SCHEMES = ["magma", "viridis"];

PREDEFINED_SCHEMES.forEach((name) => {
  colorSchemeCache.set(name, createScheme(name));
});

export function getColorFromScheme(scheme: string, t: number): number[] {
  if (!colorSchemeCache.has(scheme)) {
    try {
      colorSchemeCache.set(scheme, createScheme(scheme));
    } catch (e) {
      console.warn(`Color scheme "${scheme}" not found, defaulting to magma.`, e);
      colorSchemeCache.set(scheme, colorSchemeCache.get("magma")!);
    }
  }

  const colorScheme = colorSchemeCache.get(scheme)!;
  return colorScheme(t);
}

export function getContrastColor(rgb: number[]): number[] {
  if (!rgb) return [255, 255, 255, 220];
  const [r, g, b] = rgb;
  const yiq = (r * 299 + g * 587 + b * 114) / 1000;
  return yiq >= 128 ? [0, 0, 0, 220] : [255, 255, 255, 220];
}
