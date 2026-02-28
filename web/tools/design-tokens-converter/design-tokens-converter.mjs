import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const camelCase = (str) => {
  return str.replace(/-([a-z])/g, (g) => g[1].toUpperCase());
};

/** Check if a string is a valid JS identifier (for unquoted object key). */
const isValidJsIdentifier = (key) => {
  if (typeof key !== "string" || key.length === 0) return false;
  if (!/^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(key)) return false;
  return true;
};

/** Check if key is a numeric string that can be emitted as numeric literal (no leading zeros). */
const isNumericLiteralKey = (key) => {
  if (typeof key !== "string" || key.length === 0) return false;
  return /^\d+$/.test(key) && key === String(Number(key));
};

/**
 * Serialize object to JavaScript object literal string with unquoted keys where valid,
 * so output matches Biome's preferred style (no unnecessary quotes).
 * @param {unknown} obj - Value to serialize
 * @param {number} indent - Current indent level (spaces)
 * @returns {string} - JS literal string
 */
function serializeToJsLiteral(obj, indent = 0) {
  const pad = " ".repeat(indent);
  const padInner = " ".repeat(indent + 2);
  if (obj === null) return "null";
  if (typeof obj === "boolean") return obj ? "true" : "false";
  if (typeof obj === "number") return Object.isFinite(obj) ? String(obj) : "null";
  if (typeof obj === "string") return JSON.stringify(obj);
  if (Array.isArray(obj)) {
    if (obj.length === 0) return "[]";
    const lines = obj.map((v) => `${padInner}${serializeToJsLiteral(v, indent + 2)},`);
    return `[\n${lines.join("\n")}\n${pad}]`;
  }
  if (typeof obj === "object") {
    const entries = Object.entries(obj);
    if (entries.length === 0) return "{}";
    const lines = entries.map(([k, v]) => {
      let keyStr;
      if (isNumericLiteralKey(k)) {
        keyStr = String(Number(k));
      } else if (isValidJsIdentifier(k)) {
        keyStr = k;
      } else {
        keyStr = JSON.stringify(k);
      }
      return `${padInner}${keyStr}: ${serializeToJsLiteral(v, indent + 2).trimStart()},`;
    });
    return `{\n${lines.join("\n")}\n${pad}}`;
  }
  return "undefined";
}

// Get current file directory for resolving paths
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const RAW_COLOR_VALUE_TOKENS = ["primary", "shadow", "outline", "surface", "accent", "background"];

const shouldGenerateRawColorValue = (name) => {
  return RAW_COLOR_VALUE_TOKENS.some((token) => name.includes(token));
};

// Determine correct paths for the workspace
const findWorkspaceRoot = () => {
  // We'll start with this file's directory and go up until we find the web directory
  let currentDir = __dirname;
  while (!currentDir.endsWith("web") && currentDir !== "/") {
    currentDir = path.dirname(currentDir);
  }

  if (!currentDir.endsWith("web")) {
    throw new Error("Could not find workspace root directory");
  }

  return currentDir;
};

const workspaceRoot = findWorkspaceRoot();

// Paths
const designVariablesPath = path.join(workspaceRoot, "design-tokens.json");
const cssOutputPath = path.join(workspaceRoot, "libs/ui/src/tokens/tokens.scss");
const jsOutputPath = path.join(workspaceRoot, "libs/ui/src/tokens/tokens.js");

/**
 * Convert a value to rem units rounded to 4 decimal places no trailing zeros
 * @param {string} value - The value to convert
 * @returns {string} - The converted value in rem units
 */
function convertToRem(value) {
  const remValue = (Number(value) / 16).toFixed(4).replace(/\.?0+$/, "");
  // Ensure 0 is returned as a unitless value
  if (remValue === "0") {
    return remValue;
  }
  return `${remValue}rem`;
}

/** CSS generic font families that must not be quoted (per CSS spec) */
const CSS_GENERIC_FONT_FAMILIES = new Set([
  "serif",
  "sans-serif",
  "monospace",
  "system-ui",
  "ui-serif",
  "ui-sans-serif",
  "ui-monospace",
  "ui-rounded",
]);

/**
 * Format a comma-separated font-family value for CSS: specific font names get double quotes,
 * generic/system fonts (e.g. monospace, sans-serif) stay unquoted.
 * @param {string} value - Comma-separated font family list from design tokens
 * @returns {string} - CSS-ready font-family value
 */
function formatFontFamilyForCss(value) {
  if (typeof value !== "string" || !value.trim()) {
    return value;
  }
  const parts = value
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const formatted = parts.map((part) => {
    const lower = part.toLowerCase();
    if (CSS_GENERIC_FONT_FAMILIES.has(lower)) {
      return part;
    }
    return `"${part}"`;
  });
  return formatted.join(", ");
}

/**
 * Process design variables and extract tokens
 * @param {Object} variables - The design variables object
 * @returns {Object} - Object containing tokens for CSS and JavaScript
 */
function processDesignVariables(variables) {
  const result = {
    cssVariables: {
      light: [],
      dark: [],
    },
    jsTokens: {
      colors: {},
      spacing: {},
      typography: {},
      cornerRadius: {},
    },
  };

  // Process colors
  if (variables["@color"] && variables["@color"].$color) {
    processColorTokens(variables["@color"].$color, "", result, variables);
  }
  // Process primitives
  if (variables["@primitives"] && variables["@primitives"].$color) {
    processPrimitiveColors(variables["@primitives"].$color, result, variables);
  }

  // Process primitive spacing
  if (variables["@primitives"] && variables["@primitives"].$spacing) {
    processPrimitiveSpacing(variables["@primitives"].$spacing, result);
  }

  // Process primitive typography
  if (variables["@primitives"] && variables["@primitives"].$typography) {
    processPrimitiveTypography(variables["@primitives"].$typography, result);
  }

  // Process primitive corner-radius
  if (variables["@primitives"] && variables["@primitives"]["$corner-radius"]) {
    processPrimitiveCornerRadius(variables["@primitives"]["$corner-radius"], result);
  }

  // Process sizing tokens
  if (variables["@sizing"]) {
    processSizingTokens(variables["@sizing"], result, variables);
  }

  // Process typography
  if (variables["@typography"]) {
    processTypographyTokens(variables["@typography"], result, variables);
  }

  // Post-process for Tailwind compatibility
  result.jsTokens.colors = transformColorObjectForTailwind(result.jsTokens.colors);

  return result;
}

/**
 * Process primitive spacing tokens
 * @param {Object} spacingObj - The spacing object from primitives
 * @param {Object} result - The result object to populate
 */
function processPrimitiveSpacing(spacingObj, result) {
  for (const key in spacingObj) {
    if (spacingObj[key].$type === "number" && spacingObj[key].$value !== undefined) {
      const name = key.replace("$", "");
      const value = spacingObj[key].$value;
      const cssVarName = `--spacing-${name}`;

      // Add to CSS variables
      result.cssVariables.light.push(`${cssVarName}: ${convertToRem(value)};`);

      // Add to JavaScript tokens
      if (!result.jsTokens.spacing.primitive) {
        result.jsTokens.spacing.primitive = {};
      }

      result.jsTokens.spacing.primitive[name] = `var(${cssVarName})`;
    }
  }
}

/**
 * Process primitive typography tokens
 * @param {Object} typographyObj - The typography object from primitives
 * @param {Object} result - The result object to populate
 */
function processPrimitiveTypography(typographyObj, result) {
  // Process font sizes
  if (typographyObj["$font-size"]) {
    for (const key in typographyObj["$font-size"]) {
      if (
        typographyObj["$font-size"][key].$type === "number" &&
        typographyObj["$font-size"][key].$value !== undefined
      ) {
        const name = key.replace("$", "");
        const value = typographyObj["$font-size"][key].$value;
        const cssVarName = `--font-size-${name}`;

        // Add to CSS variables
        result.cssVariables.light.push(`${cssVarName}: ${convertToRem(value)};`);

        // Add to JavaScript tokens
        if (!result.jsTokens.typography.fontSize) {
          result.jsTokens.typography.fontSize = {};
        }
        if (!result.jsTokens.typography.fontSize.primitive) {
          result.jsTokens.typography.fontSize.primitive = {};
        }
        result.jsTokens.typography.fontSize.primitive[name] = `var(${cssVarName})`;
      }
    }
  }

  // Process font weights
  if (typographyObj["$font-weight"]) {
    for (const key in typographyObj["$font-weight"]) {
      if (
        typographyObj["$font-weight"][key].$type === "number" &&
        typographyObj["$font-weight"][key].$value !== undefined
      ) {
        const name = key.replace("$", "");
        const value = typographyObj["$font-weight"][key].$value;
        const cssVarName = `--font-weight-${name}`;

        // Add to CSS variables
        result.cssVariables.light.push(`${cssVarName}: ${value};`);

        // Add to JavaScript tokens
        if (!result.jsTokens.typography.fontWeight) {
          result.jsTokens.typography.fontWeight = {};
        }
        if (!result.jsTokens.typography.fontWeight.primitive) {
          result.jsTokens.typography.fontWeight.primitive = {};
        }
        result.jsTokens.typography.fontWeight.primitive[name] = `var(${cssVarName})`;
      }
    }
  }

  // Process line heights
  if (typographyObj["$line-height"]) {
    for (const key in typographyObj["$line-height"]) {
      if (
        typographyObj["$line-height"][key].$type === "number" &&
        typographyObj["$line-height"][key].$value !== undefined
      ) {
        const name = key.replace("$", "");
        const value = typographyObj["$line-height"][key].$value;
        const cssVarName = `--line-height-${name}`;

        // Add to CSS variables
        result.cssVariables.light.push(`${cssVarName}: ${convertToRem(value)};`);

        // Add to JavaScript tokens
        if (!result.jsTokens.typography.lineHeight) {
          result.jsTokens.typography.lineHeight = {};
        }
        if (!result.jsTokens.typography.lineHeight.primitive) {
          result.jsTokens.typography.lineHeight.primitive = {};
        }
        result.jsTokens.typography.lineHeight.primitive[name] = `var(${cssVarName})`;
      }
    }
  }

  // Process letter spacing
  if (typographyObj["$letter-spacing"]) {
    for (const key in typographyObj["$letter-spacing"]) {
      if (
        typographyObj["$letter-spacing"][key].$type === "number" &&
        typographyObj["$letter-spacing"][key].$value !== undefined
      ) {
        const name = key.replace("$", "");
        const value = typographyObj["$letter-spacing"][key].$value;
        const cssVarName = `--letter-spacing-${name}`;

        // Add to CSS variables
        result.cssVariables.light.push(`${cssVarName}: ${convertToRem(value)};`);

        // Add to JavaScript tokens
        if (!result.jsTokens.typography.letterSpacing) {
          result.jsTokens.typography.letterSpacing = {};
        }
        if (!result.jsTokens.typography.letterSpacing.primitive) {
          result.jsTokens.typography.letterSpacing.primitive = {};
        }
        result.jsTokens.typography.letterSpacing.primitive[name] = `var(${cssVarName})`;
      }
    }
  }

  // Process font families
  if (typographyObj["$font-family"]) {
    for (const key in typographyObj["$font-family"]) {
      if (typographyObj["$font-family"][key].$value !== undefined) {
        const name = key.replace("$", "");
        const value = typographyObj["$font-family"][key].$value;
        const cssVarName = `--font-family-${name}`;
        const cssValue = formatFontFamilyForCss(value);

        // Add to CSS variables
        result.cssVariables.light.push(`${cssVarName}: ${cssValue};`);

        // Add to JavaScript tokens
        if (!result.jsTokens.typography.fontFamily) {
          result.jsTokens.typography.fontFamily = {};
        }
        if (!result.jsTokens.typography.fontFamily.primitive) {
          result.jsTokens.typography.fontFamily.primitive = {};
        }
        result.jsTokens.typography.fontFamily.primitive[name] = `var(${cssVarName})`;
      }
    }
  }

  // Font-style shorthand (normal / italic). Figma exports font-weight "italic" variants as
  // non-numeric values (e.g. "Medium Italic"); we skip those and use CSS font-style instead.
  result.cssVariables.light.push("--font-style-normal: normal;");
  result.cssVariables.light.push("--font-style-italic: italic;");
  if (!result.jsTokens.typography.fontStyle) {
    result.jsTokens.typography.fontStyle = {};
  }
  if (!result.jsTokens.typography.fontStyle.primitive) {
    result.jsTokens.typography.fontStyle.primitive = {};
  }
  result.jsTokens.typography.fontStyle.primitive.normal = "var(--font-style-normal)";
  result.jsTokens.typography.fontStyle.primitive.italic = "var(--font-style-italic)";
}

/**
 * Process primitive corner radius tokens
 * @param {Object} cornerRadiusObj - The corner radius object from primitives
 * @param {Object} result - The result object to populate
 */
function processPrimitiveCornerRadius(cornerRadiusObj, result) {
  for (const key in cornerRadiusObj) {
    if (cornerRadiusObj[key].$type === "number" && cornerRadiusObj[key].$value !== undefined) {
      const name = key.replace("$", "");
      const value = cornerRadiusObj[key].$value;
      const cssVarName = `--corner-radius-${name}`;

      let resolvedValue;
      if (typeof value === "string" && value.startsWith("{") && value.endsWith("}")) {
        const reference = value.substring(1, value.length - 1);
        const parts = reference.split(".");

        // If it's a reference to a primitive spacing value, directly use the corresponding CSS variable
        if (parts[0] === "@primitives") {
          const collectionKey = parts[1].replace("$", "");
          const valueKey = parts[2].replace("$", "");
          resolvedValue = `var(--${collectionKey}-${valueKey})`;
          result.cssVariables.light.push(`${cssVarName}: ${resolvedValue};`);
        } else {
          // Otherwise, try to resolve the value normally
          resolvedValue = resolveReference(value, variables);
          result.cssVariables.light.push(`${cssVarName}: ${convertToRem(resolvedValue)};`);
        }
      } else {
        // Not a reference, use directly
        resolvedValue = value;
        result.cssVariables.light.push(`${cssVarName}: ${convertToRem(resolvedValue)};`);
      }

      // Add to JavaScript tokens
      if (!result.jsTokens.cornerRadius.primitive) {
        result.jsTokens.cornerRadius.primitive = {};
      }
      result.jsTokens.cornerRadius.primitive[name] = `var(${cssVarName})`;
    }
  }
}

/**
 * Process sizing tokens from design variables
 * @param {Object} sizingObj - The spacing object from design variables
 * @param {Object} result - The result object to populate
 * @param {Object} variables - The variables object for reference resolution
 * @param {String} parentKey - The parent key for nested tokens
 */
function processSizingTokens(sizingObj, result, variables, parentKey = "") {
  for (const key in sizingObj) {
    if (key.startsWith("$")) {
      // process nested keys
      processSizingTokens(
        sizingObj[key],
        result,
        variables,
        // Fix the variable name from corder to corner
        `${parentKey ? `${parentKey}-` : ""}${key.replace(/\$/g, "").replace("corder", "corner")}`,
      );
      continue;
    }

    if (sizingObj[key].$type === "number" && sizingObj[key].$value !== undefined) {
      const name = key.replace("$", "");
      const value = sizingObj[key].$value;
      const tokenKey = parentKey || key;
      const jsTokenKey = camelCase(tokenKey.replace("$", ""));
      const cssVarName = `--${tokenKey}-${name}`;

      let resolvedValue;
      if (typeof value === "string" && value.startsWith("{") && value.endsWith("}")) {
        const reference = value.substring(1, value.length - 1);
        const parts = reference.split(".");

        // If it's a reference to a primitive spacing value, directly use the corresponding CSS variable
        if (parts[0] === "@primitives") {
          const collectionKey = parts[1].replace("$", "");
          const valueKey = parts[2].replace("$", "");
          resolvedValue = `var(--${collectionKey}-${valueKey})`;
          result.cssVariables.light.push(`${cssVarName}: ${resolvedValue};`);
        } else {
          // Otherwise, try to resolve the value normally
          resolvedValue = resolveReference(value, variables);
          result.cssVariables.light.push(`${cssVarName}: ${convertToRem(resolvedValue)};`);
        }
      } else {
        // Not a reference, use directly
        resolvedValue = value;
        result.cssVariables.light.push(`${cssVarName}: ${convertToRem(resolvedValue)};`);
      }

      // Add to JavaScript tokens
      if (!result.jsTokens[jsTokenKey]) {
        result.jsTokens[jsTokenKey] = {};
      }

      result.jsTokens[jsTokenKey][name] = `var(${cssVarName})`;
    }
  }
}

function processTokenCollection(collectionKey, subCollectionKey) {
  const collectionJsKey = camelCase(collectionKey);
  const subCollectionJsKey = camelCase(subCollectionKey);
  const subCollectionKeyRegex = new RegExp(`${subCollectionKey}\\-?`, "g");
  return function process(tokenCollection, result, variables, parentKey = subCollectionKey) {
    for (const key in tokenCollection) {
      if (key.startsWith("$")) {
        // process nested keys
        process(tokenCollection[key], result, variables, `${parentKey ? `${parentKey}-` : ""}${key.replace("$", "")}`);
        continue;
      }

      if (tokenCollection[key].$value !== undefined) {
        const isNumber = tokenCollection[key].$type === "number";
        const name = key.replace("$", "");
        const value = tokenCollection[key].$value;
        const cssVarName = `--${parentKey}-${name}`;

        // Skip font-weight tokens that are Figma "italic" style variants (e.g. "Light Italic");
        // they are not valid CSS font-weight. Use --font-style-normal / --font-style-italic instead.
        const isFontWeightItalicVariant =
          subCollectionKey === "font-weight" &&
          (name.endsWith("-italic") || (!isNumber && typeof value === "string" && !value.startsWith("{")));
        if (isFontWeightItalicVariant) {
          continue;
        }

        let resolvedValue;
        if (typeof value === "string" && value.startsWith("{") && value.endsWith("}")) {
          const reference = value.substring(1, value.length - 1);
          const parts = reference.replace(`$${collectionKey}.`, "").split(".");

          // If it's a reference to a primitive spacing value, directly use the corresponding CSS variable
          if (parts[0] === "@primitives") {
            const collectionKey = parts[1].replace("$", "");
            const valueKey = parts[2].replace("$", "");
            resolvedValue = `var(--${collectionKey}-${valueKey})`;
            result.cssVariables.light.push(`${cssVarName}: ${resolvedValue};`);
          } else {
            // Otherwise, try to resolve the value normally
            resolvedValue = resolveReference(value, variables);
            const cssValue =
              subCollectionKey === "font-family" && typeof resolvedValue === "string"
                ? formatFontFamilyForCss(resolvedValue)
                : isNumber
                  ? convertToRem(resolvedValue)
                  : resolvedValue;
            result.cssVariables.light.push(`${cssVarName}: ${cssValue};`);
          }
        } else {
          // Not a reference, use directly
          resolvedValue = value;
          const cssValue =
            subCollectionKey === "font-family" && typeof resolvedValue === "string"
              ? formatFontFamilyForCss(resolvedValue)
              : isNumber
                ? convertToRem(resolvedValue)
                : resolvedValue;
          result.cssVariables.light.push(`${cssVarName}: ${cssValue};`);
        }

        // Add to JavaScript tokens
        if (!result.jsTokens[collectionJsKey]) {
          result.jsTokens[collectionJsKey] = {};
        }
        if (!result.jsTokens[collectionJsKey][subCollectionJsKey]) {
          result.jsTokens[collectionJsKey][subCollectionJsKey] = {};
        }
        const jsKey = `${parentKey ? `${parentKey}-` : ""}${name}`;
        result.jsTokens[collectionJsKey][subCollectionJsKey][jsKey.replace(subCollectionKeyRegex, "")] =
          `var(${cssVarName})`;
      }
    }
  };
}

/**
 * Process font size tokens
 * @param {Object} fontSizeObj - The font size object from typography
 * @param {Object} result - The result object to populate
 * @param {Object} variables - The variables object for reference resolution
 * @param {String} parentKey - The parent key for nested tokens
 */
const processFontSizeTokens = processTokenCollection("typography", "font-size");

/**
 * Process font weight tokens
 * @param {Object} fontWeightObj - The font weight object from typography
 * @param {Object} result - The result object to populate
 * @param {Object} variables - The variables object for reference resolution
 */
const processFontWeightTokens = processTokenCollection("typography", "font-weight");

/**
 * Process line height tokens
 * @param {Object} lineHeightObj - The line height object from typography
 * @param {Object} result - The result object to populate
 * @param {Object} variables - The variables object for reference resolution
 */
const processLineHeightTokens = processTokenCollection("typography", "line-height");

/**
 * Process letter spacing tokens
 * @param {Object} letterSpacingObj - The letter spacing object from typography
 * @param {Object} result - The result object to populate
 * @param {Object} variables - The variables object for reference resolution
 */
const processLetterSpacingTokens = processTokenCollection("typography", "letter-spacing");

/**
 * Process font family tokens
 * @param {Object} fontObj - The font family object from typography
 * @param {Object} result - The result object to populate
 */
const processFontFamilyTokens = processTokenCollection("typography", "font-family");

/**
 * Process typography tokens from design variables
 * @param {Object} typographyObj - The typography object from design variables
 * @param {Object} result - The result object to populate
 * @param {Object} variables - The variables object for reference resolution
 */
function processTypographyTokens(typographyObj, result, variables) {
  // Process font families
  if (typographyObj["$font-family"]) {
    processFontFamilyTokens(typographyObj["$font-family"], result, variables);
  }

  // Process font sizes
  if (typographyObj["$font-size"]) {
    processFontSizeTokens(typographyObj["$font-size"], result, variables);
  }

  // Process font weights
  if (typographyObj["$font-weight"]) {
    processFontWeightTokens(typographyObj["$font-weight"], result, variables);
  }

  // Process line heights
  if (typographyObj["$line-height"]) {
    processLineHeightTokens(typographyObj["$line-height"], result, variables);
  }

  // Process letter spacing
  if (typographyObj["$letter-spacing"]) {
    processLetterSpacingTokens(typographyObj["$letter-spacing"], result, variables);
  }
}

/**
 * Process color tokens from design variables
 * @param {Object} colorObj - The color object from design variables
 * @param {String} parentPath - The parent path for nesting
 * @param {Object} result - The result object to populate
 */
function processColorTokens(colorObj, parentPath, result, variables) {
  for (const key in colorObj) {
    if (typeof colorObj[key] === "object" && !Array.isArray(colorObj[key])) {
      const newPath = parentPath ? `${parentPath}-${key.replace(/\$/g, "")}` : key.replace(/\$/g, "");

      // If this is a color token with value and type
      if (colorObj[key].$type === "color" && colorObj[key].$value) {
        const name = parentPath ? `${parentPath}-${key.replace(/\$/g, "")}` : key.replace(/\$/g, "");
        const value = colorObj[key].$value;
        const cssVarName = `--color-${name.replace(/\$/g, "")}`;

        // Add to CSS variables for light mode
        if (
          colorObj[key].$variable_metadata &&
          colorObj[key].$variable_metadata.modes &&
          colorObj[key].$variable_metadata.modes.light
        ) {
          const lightValue = resolveColor(colorObj[key].$variable_metadata.modes.light, variables);
          result.cssVariables.light.push(`${cssVarName}: ${lightValue};`);

          if (shouldGenerateRawColorValue(name)) {
            const rawRgbValues = hexToRgbRaw(colorObj[key].$variable_metadata.modes.light, variables);
            result.cssVariables.light.push(`${cssVarName}-raw: ${rawRgbValues};`);
          }
        } else {
          const resolvedValue = resolveColor(value, variables);
          result.cssVariables.light.push(`${cssVarName}: ${resolvedValue};`);

          if (shouldGenerateRawColorValue(name)) {
            const rawRgbValues = hexToRgbRaw(value, variables);
            result.cssVariables.light.push(`${cssVarName}-raw: ${rawRgbValues};`);
          }
        }

        // Add to CSS variables for dark mode
        if (
          colorObj[key].$variable_metadata &&
          colorObj[key].$variable_metadata.modes &&
          colorObj[key].$variable_metadata.modes.dark
        ) {
          const darkValue = resolveColor(colorObj[key].$variable_metadata.modes.dark, variables);
          result.cssVariables.dark.push(`${cssVarName}: ${darkValue};`);

          if (shouldGenerateRawColorValue(name)) {
            const rawRgbValues = hexToRgbRaw(colorObj[key].$variable_metadata.modes.dark, variables);
            result.cssVariables.dark.push(`${cssVarName}-raw: ${rawRgbValues};`);
          }
        }

        // Add to JavaScript tokens
        addToJsTokens(result.jsTokens.colors, name.replace(/\$/g, ""), cssVarName);
      } else {
        // Recursively process nested color objects
        processColorTokens(colorObj[key], newPath, result, variables);
      }
    }
  }
}

/**
 * Process primitive colors
 * @param {Object} primitiveColors - The primitive colors object
 * @param {Object} result - The result object to populate
 * @param {Object} variables - The variables object for reference resolution
 */
function processPrimitiveColors(primitiveColors, result, variables) {
  for (const colorFamily in primitiveColors) {
    const familyName = colorFamily.replace("$", "");

    for (const shade in primitiveColors[colorFamily]) {
      try {
        if (primitiveColors[colorFamily][shade].$type === "color" && primitiveColors[colorFamily][shade].$value) {
          const name = `${familyName}-${shade}`;
          const value = primitiveColors[colorFamily][shade].$value;
          const cssVarName = `--color-${name}`;

          // Add to CSS variables, converting to RGB format for opacity support
          const rgbValue = hexToRgb(value);
          result.cssVariables.light.push(`${cssVarName}: ${rgbValue};`);

          // Add raw RGB values for primitives to support translucent colors
          // if dark mode is available
          if (
            primitiveColors[colorFamily][shade].$variable_metadata &&
            primitiveColors[colorFamily][shade].$variable_metadata.modes &&
            primitiveColors[colorFamily][shade].$variable_metadata.modes.dark
          ) {
            const rawRgbValues = hexToRgbRaw(value);
            result.cssVariables.light.push(`${cssVarName}-raw: ${rawRgbValues};`);

            const darkValue = primitiveColors[colorFamily][shade].$variable_metadata.modes.dark;
            const darkRgbValue = hexToRgb(darkValue);
            result.cssVariables.dark.push(`${cssVarName}: ${darkRgbValue};`);

            // Add raw RGB values for dark mode
            const darkRawRgbValues = hexToRgbRaw(darkValue);
            result.cssVariables.dark.push(`${cssVarName}-raw: ${darkRawRgbValues};`);
          }

          // Add to JavaScript tokens
          if (!result.jsTokens.colors.primitive) {
            result.jsTokens.colors.primitive = {};
          }
          if (!result.jsTokens.colors.primitive[familyName]) {
            result.jsTokens.colors.primitive[familyName] = {};
          }

          result.jsTokens.colors.primitive[familyName][shade] = `var(${cssVarName})`;
        }
      } catch (error) {
        console.warn(`Warning: Error processing primitive color ${colorFamily}.${shade}:`, error.message);
      }
    }
  }
}

/**
 * Convert hex color to RGB format for opacity support
 * @param {string} hex - Hex color code
 * @returns {string} - RGB color format as rgb(r, g, b) or raw r g b
 * @param {boolean} raw - Whether to return the raw RGB values
 */
function hexToRgb(hex, raw = false) {
  // Check if it's already in rgb/rgba format
  if (hex.startsWith("rgb")) {
    return raw ? hex.replace("rgb(", "").replace(")", "") : hex;
  }

  // Remove # if present
  hex = hex.replace(/^#/, "");

  // Parse the hex values
  let r;
  let g;
  let b;
  if (hex.length === 3) {
    // Convert 3-digit hex to 6-digit
    r = Number.parseInt(hex[0] + hex[0], 16);
    g = Number.parseInt(hex[1] + hex[1], 16);
    b = Number.parseInt(hex[2] + hex[2], 16);
  } else if (hex.length === 6) {
    r = Number.parseInt(hex.substring(0, 2), 16);
    g = Number.parseInt(hex.substring(2, 4), 16);
    b = Number.parseInt(hex.substring(4, 6), 16);
  } else {
    // Invalid hex, return as is
    return hex;
  }

  // Return RGB format
  return raw ? `${r} ${g} ${b}` : `rgb(${r} ${g} ${b})`;
}

/**
 * Convert hex color to raw RGB values for translucent color support
 * @param {string} hex - Hex color code or reference
 * @param {Object} variables - Variables for resolving references
 * @returns {string} - Raw RGB values as "r g b"
 */
function hexToRgbRaw(hex, variables) {
  // If it's a reference, try to resolve it
  if (typeof hex === "string" && hex.startsWith("{") && hex.endsWith("}") && variables) {
    const resolvedValue = resolveReference(hex, variables);
    if (resolvedValue !== hex) {
      return hexToRgbRaw(resolvedValue);
    }
  }

  // Check if it's already in rgb/rgba format
  if (typeof hex === "string" && hex.startsWith("rgb")) {
    // Extract the RGB values from the rgb() format
    const match = hex.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
    if (match) {
      return `${match[1]} ${match[2]} ${match[3]}`;
    }
    return hex;
  }

  if (typeof hex === "string") {
    return hexToRgb(hex, true);
  }

  return hex;
}

/**
 * Resolve color values, handling references to other variables
 * @param {String} value - The color value to resolve
 * @param {Object} variables - The variables object for reference resolution
 * @param {Boolean} asCssVariable - Whether to return the value as a CSS variable
 * @returns {String} - The resolved color value
 */
function resolveColor(value, variables, asCssVariable = true) {
  if (typeof value !== "string") return value;

  // Handle references like "{@primitives.$color.$sand.100}"
  if (value.startsWith("{") && value.endsWith("}")) {
    const reference = value.substring(1, value.length - 1);
    const parts = reference.split(".");

    if (asCssVariable) {
      // Remove 'primitive' from CSS variable references
      if (reference.startsWith("@primitives.$color")) {
        return `var(--color-${reference.replace("@primitives.$color.", "").replace(/[$.]/g, "-").substring(1)})`;
      }
      return `var(--color-${reference
        .replace("@primitives.", "")
        .replace("$color.", "")
        .replace(/[$.]/g, "-")
        .substring(1)})`;
    }

    // Navigate through the object to find the referenced value
    let current = variables;
    for (const part of parts) {
      if (current[part]) {
        current = current[part];
      } else {
        // If we can't resolve, return the CSS variable equivalent
        if (reference.startsWith("@primitives.$color")) {
          return `var(--color-${reference.replace("@primitives.$color.", "").replace(/[$.]/g, "-").substring(1)})`;
        }
        return `var(--color-${reference.replace(/[@$.]/g, "-").substring(1)})`;
      }
    }

    if (current.$value) {
      return hexToRgb(current.$value);
    }

    return value;
  }

  // Convert direct color values to RGB
  return hexToRgb(value);
}

/**
 * Resolve references to other variables
 * @param {String|Number} value - The value to resolve
 * @param {Object} variables - The variables object for reference resolution
 * @returns {String|Number} - The resolved value
 */
function resolveReference(value, variables) {
  if (typeof value !== "string") return value;

  // Handle references like "{@sizing.$spacing.base}"
  if (value.startsWith("{") && value.endsWith("}")) {
    const reference = value.substring(1, value.length - 1);
    const parts = reference.split(".");

    // Navigate through the object to find the referenced value
    let current = variables;
    for (const part of parts) {
      if (current[part]) {
        current = current[part];
      } else {
        // If we can't resolve, return the original value
        return value;
      }
    }

    if (current.$value !== undefined) {
      return current.$value;
    }

    return value;
  }

  return value;
}

/**
 * Add a token to the JavaScript tokens object
 * @param {Object} obj - The object to add to
 * @param {String} path - The path to add at
 * @param {String} cssVarName - The CSS variable name
 */
function addToJsTokens(obj, path, cssVarName) {
  const parts = path.split("-");
  let current = obj;

  // Handle the case where we have nested properties like "surface-hover"
  // which should be transformed to obj.surface.hover
  for (let i = 0; i < parts.length - 1; i++) {
    const part = parts[i];

    // Check if this is a terminal value (string) that we're trying to add properties to
    if (typeof current[part] === "string") {
      // Create a new object to replace the string value
      const oldValue = current[part];
      current[part] = {
        DEFAULT: oldValue,
      };
    } else if (!current[part]) {
      current[part] = {};
    }

    current = current[part];
  }

  const lastPart = parts[parts.length - 1];

  // If lastPart is something like "hover" and we're dealing with "surface-hover",
  // we should set it as a property of the "surface" object
  current[lastPart] = `var(${cssVarName})`;
}

/**
 * Generate CSS content
 * @param {Object} result - The processed tokens
 * @returns {String} - The CSS content
 */
function generateCssContent(result) {
  let content = "// Generated from design-tokens.json - DO NOT EDIT DIRECTLY\n\n";

  // Light mode variables (default)
  content += ":root {\n";
  result.cssVariables.light.forEach((variable) => {
    content += `  ${variable}\n`;
  });
  content += "}\n\n";

  // Dark mode variables
  content += '[data-color-scheme="dark"] {\n';
  result.cssVariables.dark.forEach((variable) => {
    content += `  ${variable}\n`;
  });
  content += "}\n";

  return content;
}

/**
 * Transform color object structure for better Tailwind CSS compatibility
 * @param {Object} colors - The color object to transform
 * @returns {Object} - The transformed color object
 */
function transformColorObjectForTailwind(colors) {
  const transformed = {};

  // Process each color category
  for (const category in colors) {
    transformed[category] = {};
    const colorGroup = colors[category];

    // Group variants like "surface-hover" under their base name with variants as properties
    for (const key in colorGroup) {
      const parts = key.split("-");

      // Skip if already processed
      if (parts.length === 1) {
        transformed[category][key] = colorGroup[key];
        continue;
      }

      // Handle cases like "surface-hover", "surface-active", etc.
      const baseName = parts[0];
      const variantName = parts.slice(1).join("-");

      if (!transformed[category][baseName]) {
        // Check if base color exists in original object
        if (colorGroup[baseName]) {
          transformed[category][baseName] = {
            DEFAULT: colorGroup[baseName],
          };
        } else {
          transformed[category][baseName] = {};
        }
      } else if (typeof transformed[category][baseName] === "string") {
        // Convert string value to object with DEFAULT property
        transformed[category][baseName] = {
          DEFAULT: transformed[category][baseName],
        };
      }

      // Add the variant
      transformed[category][baseName][variantName] = colorGroup[key];
    }
  }

  return transformed;
}

/**
 * Process JS tokens for output, merging primitive values
 * @param {Object} tokens - The tokens to process
 * @returns {Object} - The processed tokens
 */
function processJsTokens(tokens) {
  // Merge primitive values at all levels
  const merged = mergePrimitiveValues(tokens);

  // Then transform colors for Tailwind if they exist
  if (merged.colors) {
    merged.colors = transformColorObjectForTailwind(merged.colors);
  }

  return merged;
}

/**
 * Merge primitive values from nested structures
 * @param {Object} values - The object to process
 * @returns {Object} - The processed object with primitive values merged
 */
function mergePrimitiveValues(values) {
  if (typeof values !== "object" || values === null || Array.isArray(values)) {
    return values;
  }

  const result = {};

  // First, process all non-primitive keys and add them to the result
  for (const [key, value] of Object.entries(values)) {
    if (key !== "primitive") {
      if (typeof value === "object" && value !== null && !Array.isArray(value)) {
        result[key] = mergePrimitiveValues(value);
      } else {
        result[key] = value;
      }
    }
  }

  // Then, if there's a primitive key, merge up its values into the result
  if (values.primitive) {
    if (typeof values.primitive === "object" && !Array.isArray(values.primitive)) {
      // Handle nested primitive objects (e.g., typography.primitive.fontSize)
      for (const [primKey, primValue] of Object.entries(values.primitive)) {
        result[primKey] = mergePrimitiveValues(primValue);
      }
    }
  }

  return result;
}

/**
 * Generate JS content from tokens
 * @param {Object} jsTokens - The JS tokens to convert to content
 * @returns {string} - The JS content
 */
function generateJsContent(jsTokens) {
  const literalStr = serializeToJsLiteral(processJsTokens(jsTokens), 0);
  const content = `// This file is generated by the design-tokens-converter tool.
// Do not edit this file directly. Edit design-tokens.json instead.

const designTokens = ${literalStr};

module.exports = designTokens;
`;

  return content;
}

/**
 * Main function to run the design tokens converter
 */
const designTokensConverter = async () => {
  try {
    console.log("Reading design variables file from:", designVariablesPath);

    // Check if file exists before trying to read it
    try {
      await fs.access(designVariablesPath);
    } catch (error) {
      console.error(`Error: The design-tokens.json file does not exist at ${designVariablesPath}`);
      console.log("Please create this file by exporting your design tokens from Figma");
      return { success: false, error: "Design tokens file not found" };
    }

    const designVariablesData = await fs.readFile(designVariablesPath, "utf8");

    try {
      const variables = JSON.parse(designVariablesData);

      console.log("Processing design variables...");
      const processed = processDesignVariables(variables);

      console.log("Generating CSS...");
      const cssContent = generateCssContent(processed);

      console.log("Generating JavaScript...");
      const jsContent = generateJsContent(processed.jsTokens);

      // Ensure directory exists
      const cssDir = path.dirname(cssOutputPath);
      await fs.mkdir(cssDir, { recursive: true });

      // Write files
      await fs.writeFile(cssOutputPath, cssContent);
      await fs.writeFile(jsOutputPath, jsContent);

      console.log(`CSS variables written to ${cssOutputPath}`);
      console.log(`JavaScript tokens written to ${jsOutputPath}`);

      return { success: true };
    } catch (parseError) {
      console.error("Error parsing design tokens JSON:");
      console.trace(parseError);
      console.log("Please ensure your design-tokens.json file contains valid JSON");
      return { success: false, error: "JSON parsing error" };
    }
  } catch (error) {
    console.error("Error:", error);
    return { success: false, error: error.message };
  }
};

// Execute the function when this script is run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  designTokensConverter().then((result) => {
    if (!result.success) {
      process.exit(1);
    }
    console.log("Design tokens conversion complete");
  });
}

export default designTokensConverter;
