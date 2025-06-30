import { repeat } from "./Utils";

// ===================================================================
// CORE COLOR TYPES AND INTERFACES
// ===================================================================

export interface RgbaColor {
  r: number;
  g: number;
  b: number;
  a: number;
}

export type RgbaColorArray = [r: number, g: number, b: number, a: number];

// ===================================================================
// VALIDATION REGEX (ONLY USED ONES)
// ===================================================================

export const hexRegex = new RegExp(`^#${repeat("([a-f0-9]{2})", 3)}([a-f0-9]{2})?$`, "i");
export const rgbaRegex = new RegExp(
  `^rgba?\\(\\s*(\\d+)\\s*${repeat(",\\s*(\\d+)\\s*", 2)}(?:,\\s*([\\d.]+))?\\s*\\)$`,
  "i",
);
export const namedColorRegex = /^[a-z]+$/i;

// ===================================================================
// CORE COLOR CONVERSION FUNCTIONS
// ===================================================================

/**
 * Convert various color formats to RGBA object
 * Supports: hex strings, rgba strings, arrays, and objects
 */
export function stringToRgba(colorStr: string | RgbaColorArray | RgbaColor): RgbaColor {
  if (typeof colorStr === "string") {
    // Handle hex colors
    if (colorStr.startsWith("#")) {
      const hex = colorStr.slice(1);
      const bigint = Number.parseInt(hex, 16);
      return {
        r: (bigint >> 16) & 255,
        g: (bigint >> 8) & 255,
        b: bigint & 255,
        a: hex.length === 8 ? ((bigint >> 24) & 255) / 255 : 1,
      };
    }
    
    // Handle rgba/rgb strings
    const match = colorStr.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/);
    if (match) {
      return {
        r: Number.parseInt(match[1]),
        g: Number.parseInt(match[2]),
        b: Number.parseInt(match[3]),
        a: match[4] ? Number.parseFloat(match[4]) : 1,
      };
    }
    
    // Handle named colors
    if (namedColorRegex.test(colorStr)) {
      const hex = nameToHex(colorStr.toLowerCase());
      if (hex) return stringToRgba(hex);
    }
    
    console.warn(`Invalid color string: ${colorStr}. Defaulting to grey.`);
    return { r: 120, g: 120, b: 120, a: 1 };
  } 
  
  // Handle arrays
  else if (Array.isArray(colorStr)) {
    return {
      r: colorStr[0],
      g: colorStr[1],
      b: colorStr[2],
      a: colorStr[3] ?? 1,
    };
  } 
  
  // Handle objects
  else if (
    typeof colorStr === "object" &&
    colorStr !== null &&
    "r" in colorStr &&
    "g" in colorStr &&
    "b" in colorStr
  ) {
    return { ...colorStr, a: colorStr.a ?? 1 };
  }
  
  console.warn(`Invalid color type. Defaulting to grey.`);
  return { r: 120, g: 120, b: 120, a: 1 };
}

/**
 * Convert RGBA object to CSS rgba string
 */
export function rgbaToString(color: RgbaColor): string {
  return `rgba(${color.r}, ${color.g}, ${color.b}, ${color.a})`;
}

/**
 * Alias for stringToRgba for backward compatibility
 */
export const rgba = (value: string | RgbaColorArray | RgbaColor): RgbaColor => {
  return stringToRgba(value);
};

// ===================================================================
// NAMED COLOR MAPPING
// ===================================================================

/**
 * Convert basic color names to hex values
 * Only includes commonly used colors to keep it lightweight
 */
export const nameToHex = (color: string): string => {
  const colorMap: { [key: string]: string } = {
    // Basic colors
    black: "#000000",
    white: "#ffffff",
    red: "#ff0000",
    green: "#00ff00",
    blue: "#0000ff",
    yellow: "#ffff00",
    cyan: "#00ffff",
    magenta: "#ff00ff",
    
    // Grayscale
    grey: "#808080",
    gray: "#808080",
    darkgrey: "#404040",
    darkgray: "#404040",
    lightgrey: "#c0c0c0",
    lightgray: "#c0c0c0",
    
    // GPS visualization specific colors
    orange: "#ffa500",
    purple: "#800080",
    brown: "#a52a2a",
    pink: "#ffc0cb",
  };
  
  return colorMap[color.toLowerCase()] || "";
};
