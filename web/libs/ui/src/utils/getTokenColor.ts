import designTokens from "../../../../design-tokens.json";

export type ColorFormat = "hex" | "rgb" | "rgba";
export type Theme = "light" | "dark";

export interface GetTokenColorOptions {
  format?: ColorFormat;
  alpha?: number;
  theme: Theme;
}

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

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
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

function rgbaToRgb(rgba: string): { r: number; g: number; b: number } | null {
  const match = rgba.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
  if (!match) return null;

  return {
    r: Number.parseInt(match[1], 10),
    g: Number.parseInt(match[2], 10),
    b: Number.parseInt(match[3], 10),
  };
}

function formatColor(rgb: { r: number; g: number; b: number }, format: ColorFormat, alpha?: number): string {
  const { r, g, b } = rgb;

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

function resolveReference(reference: string, tokens: TokenCollection): string | null {
  const refMatch = reference.match(/^\{(@[\w]+)\.([\w.$]+)\}$/);
  if (!refMatch) {
    if (reference.startsWith("#") || reference.startsWith("rgb")) {
      return reference;
    }
    return null;
  }

  const [, collection, pathStr] = refMatch;
  const pathParts = pathStr.split(".").filter(Boolean);
  const fullPath = [collection, ...pathParts];
  const value = getNestedValue(tokens, fullPath);

  if (!value) return null;

  if (typeof value === "object" && "$value" in value) {
    const tokenValue = value.$value as string;
    if (tokenValue.startsWith("{")) {
      return resolveReference(tokenValue, tokens);
    }
    return tokenValue;
  }

  return null;
}

function tokenNameToPath(tokenName: string): string[] {
  const parts = tokenName.split("-");
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

function findColorToken(tokenName: string, theme: Theme, tokens: TokenCollection): string | null {
  const path = tokenNameToPath(tokenName);
  const tokenObj = getNestedValue(tokens, path);

  if (!tokenObj || typeof tokenObj !== "object") {
    // Try alternative flatter path structure
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

function resolveTokenValue(tokenObj: TokenValue, theme: Theme, tokens: TokenCollection): string | null {
  const modes = tokenObj.$variable_metadata?.modes;
  if (modes && modes[theme]) {
    const modeValue = modes[theme];
    if (modeValue.startsWith("{")) {
      return resolveReference(modeValue, tokens);
    }
    return modeValue;
  }

  if (tokenObj.$value) {
    const value = tokenObj.$value;
    if (value.startsWith("{")) {
      return resolveReference(value, tokens);
    }
    return value;
  }

  return null;
}

export function getTokenColor(tokenName: string, options: GetTokenColorOptions): string {
  const { format = "hex", alpha, theme } = options;

  const rawColor = findColorToken(tokenName, theme, designTokens as unknown as TokenCollection);

  if (!rawColor) {
    console.warn(`[getTokenColor] Could not resolve token: "${tokenName}"`);
    return "#ff00ff"; // Magenta fallback to make missing tokens obvious
  }

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

export type GetColorFn = (tokenName: string, options?: Omit<GetTokenColorOptions, "theme">) => string;
