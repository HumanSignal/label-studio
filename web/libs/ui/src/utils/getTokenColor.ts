/**
 * Design Token Color Utility
 *
 * Resolves color tokens from design-tokens.json to HEX/RGB values.
 * Supports theme-aware color resolution for light and dark modes.
 *
 * @example
 * ```typescript
 * // Get a color in the current theme
 * getTokenColor("primary-surface", { theme: "light" }); // "#4c5fa9"
 *
 * // Get a color with alpha
 * getTokenColor("neutral-border", { theme: "dark", alpha: 0.5 }); // "rgba(202, 197, 184, 0.5)"
 *
 * // Get as RGB format
 * getTokenColor("primary-surface", { theme: "light", format: "rgb" }); // "rgb(76, 95, 169)"
 * ```
 */

import designTokens from "../../../../design-tokens.json";

// Type definitions
export type ColorFormat = "hex" | "rgb" | "rgba";
export type Theme = "light" | "dark";

export interface GetTokenColorOptions {
  /** Output format: hex (default), rgb, or rgba */
  format?: ColorFormat;
  /** Alpha value (0-1). When provided, forces rgba format */
  alpha?: number;
  /** Theme mode for color resolution */
  theme: Theme;
}

// Type for the token structure
type TokenValue = {
  $type?: string;
  $value?: string;
  $variable_metadata?: {
    name?: string;
    modes?: Record<string, string>;
  };
  [key: string]: unknown;
};

type TokenCollection = {
  [key: string]: TokenValue | TokenCollection;
};

/**
 * Parse a HEX color to RGB components
 */
function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  // Remove # if present
  const cleanHex = hex.replace(/^#/, "");

  // Handle 3-digit hex
  const fullHex =
    cleanHex.length === 3
      ? cleanHex
          .split("")
          .map((c) => c + c)
          .join("")
      : cleanHex;

  const result = /^([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(fullHex);
  if (!result) return null;

  return {
    r: Number.parseInt(result[1], 16),
    g: Number.parseInt(result[2], 16),
    b: Number.parseInt(result[3], 16),
  };
}

/**
 * Parse an RGBA string to RGB components
 */
function rgbaToRgb(rgba: string): { r: number; g: number; b: number } | null {
  const match = rgba.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
  if (!match) return null;

  return {
    r: Number.parseInt(match[1], 10),
    g: Number.parseInt(match[2], 10),
    b: Number.parseInt(match[3], 10),
  };
}

/**
 * Format RGB components to the requested format
 */
function formatColor(rgb: { r: number; g: number; b: number }, format: ColorFormat, alpha?: number): string {
  const { r, g, b } = rgb;

  // If alpha is provided, always use rgba
  if (alpha !== undefined) {
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }

  switch (format) {
    case "rgb":
      return `rgb(${r}, ${g}, ${b})`;
    case "rgba":
      return `rgba(${r}, ${g}, ${b}, 1)`;
    default: {
      const toHex = (n: number) => n.toString(16).padStart(2, "0");
      return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
    }
  }
}

/**
 * Navigate to a nested property in the tokens object using a path
 */
function getNestedValue(obj: TokenCollection, path: string[]): TokenValue | TokenCollection | undefined {
  let current: TokenValue | TokenCollection | undefined = obj;

  for (const key of path) {
    if (current === undefined || typeof current !== "object") {
      return undefined;
    }
    current = current[key] as TokenValue | TokenCollection | undefined;
  }

  return current;
}

/**
 * Resolve a reference like "{@primitives.$color.$grape.700}" to its value
 */
function resolveReference(reference: string, tokens: TokenCollection): string | null {
  // Check if it's a reference format: {@collection.$path.$to.$value}
  const refMatch = reference.match(/^\{(@[\w]+)\.([\w.$]+)\}$/);
  if (!refMatch) {
    // Not a reference, return as-is if it's a color value
    if (reference.startsWith("#") || reference.startsWith("rgb")) {
      return reference;
    }
    return null;
  }

  const [, collection, pathStr] = refMatch;
  const pathParts = pathStr.split(".").filter(Boolean);

  // Build the full path including collection
  const fullPath = [collection, ...pathParts];

  const value = getNestedValue(tokens, fullPath);

  if (!value) return null;

  // If it's a token object, get its $value
  if (typeof value === "object" && "$value" in value) {
    const tokenValue = value.$value as string;
    // Recursively resolve if it's another reference
    if (tokenValue.startsWith("{")) {
      return resolveReference(tokenValue, tokens);
    }
    return tokenValue;
  }

  return null;
}

/**
 * Convert a token name like "primary-surface" to a path in the token structure
 *
 * Token naming convention:
 * - "primary-surface" -> ["@color", "$color", "$primary", "surface"]
 * - "accent-grape-base" -> ["@color", "$color", "$accent", "$grape", "base"]
 * - "neutral-border" -> ["@color", "$color", "$neutral", "border"]
 */
function tokenNameToPath(tokenName: string): string[] {
  const parts = tokenName.split("-");

  // Build the path with proper $ prefixes for nested structures
  const path = ["@color", "$color"];

  for (let i = 0; i < parts.length; i++) {
    const part = parts[i];
    // Add $ prefix for category/subcategory parts (not the final value)
    if (i < parts.length - 1) {
      path.push(`$${part}`);
    } else {
      path.push(part);
    }
  }

  return path;
}

/**
 * Find a color token and resolve it to a raw color value
 */
function findColorToken(tokenName: string, theme: Theme, tokens: TokenCollection): string | null {
  const path = tokenNameToPath(tokenName);
  const tokenObj = getNestedValue(tokens, path);

  if (!tokenObj || typeof tokenObj !== "object") {
    // Try alternative path structure for simple tokens like "neutral-border"
    // Sometimes the structure is flatter
    const altPath = ["@color", "$color", `$${path[2]?.replace("$", "")}`, path[path.length - 1]];
    const altTokenObj = getNestedValue(tokens, altPath);

    if (!altTokenObj || typeof altTokenObj !== "object") {
      console.warn(`[getTokenColor] Token not found: "${tokenName}"`);
      return null;
    }

    return resolveTokenValue(altTokenObj as TokenValue, theme, tokens);
  }

  return resolveTokenValue(tokenObj as TokenValue, theme, tokens);
}

/**
 * Resolve a token object to its final color value
 */
function resolveTokenValue(tokenObj: TokenValue, theme: Theme, tokens: TokenCollection): string | null {
  // Check for mode-specific value in $variable_metadata
  const modes = tokenObj.$variable_metadata?.modes;
  if (modes && modes[theme]) {
    const modeValue = modes[theme];
    // Resolve reference if needed
    if (modeValue.startsWith("{")) {
      return resolveReference(modeValue, tokens);
    }
    return modeValue;
  }

  // Fallback to $value
  if (tokenObj.$value) {
    const value = tokenObj.$value;
    if (value.startsWith("{")) {
      return resolveReference(value, tokens);
    }
    return value;
  }

  return null;
}

/**
 * Get a color from design tokens
 *
 * @param tokenName - The token name (e.g., "primary-surface", "neutral-border")
 * @param options - Options for format, alpha, and theme
 * @returns The color value in the requested format
 *
 * @example
 * ```typescript
 * // Basic usage
 * getTokenColor("primary-surface", { theme: "light" });
 *
 * // With alpha
 * getTokenColor("neutral-border", { theme: "dark", alpha: 0.5 });
 *
 * // As RGB format
 * getTokenColor("primary-surface", { theme: "light", format: "rgb" });
 * ```
 */
export function getTokenColor(tokenName: string, options: GetTokenColorOptions): string {
  const { format = "hex", alpha, theme } = options;

  const rawColor = findColorToken(tokenName, theme, designTokens as unknown as TokenCollection);

  if (!rawColor) {
    // Return a fallback color (magenta to make it obvious)
    console.warn(`[getTokenColor] Could not resolve token: "${tokenName}"`);
    return "#ff00ff";
  }

  // Parse the color to RGB
  let rgb: { r: number; g: number; b: number } | null = null;

  if (rawColor.startsWith("#")) {
    rgb = hexToRgb(rawColor);
  } else if (rawColor.startsWith("rgb")) {
    rgb = rgbaToRgb(rawColor);
  }

  if (!rgb) {
    console.warn(`[getTokenColor] Could not parse color value: "${rawColor}"`);
    return "#ff00ff";
  }

  return formatColor(rgb, format, alpha);
}

/**
 * Type for the getColor function returned by useTokenColor hook
 */
export type GetColorFn = (tokenName: string, options?: Omit<GetTokenColorOptions, "theme">) => string;
