import type React from "react";
import { useState, useRef, useEffect } from "react";
import LinkTo from "@storybook/addon-links/react";

import type { Meta } from "@storybook/react";
import { useAtom, useAtomValue, useSetAtom } from "jotai";
import { atomWithStorage } from "jotai/utils";
import { evaluatedThemeAtom } from "../../../storybook/addons/theme-toggle/atoms";
// @ts-ignore: JS module without types
import * as importedDesignTokens from "./tokens";

// Define types for design tokens
type DesignTokenValue = string | Record<string, unknown>;
type FlattenedTokens = Record<string, string>;
type ImportedDesignTokens = {
  default?: Record<string, DesignTokenValue>;
} & Record<string, DesignTokenValue>;
const designTokens = (importedDesignTokens as ImportedDesignTokens).default ?? importedDesignTokens;

const pxToRem = (px: number) => `${px / 16}rem`;

// Token categories and their descriptions
const categoryDescriptions: Record<string, string> = {
  colors: "Color tokens for UI elements including semantic, and scale colors",
  spacing: "Spacing values for layout, padding, margins, and positioning",
  typography: "Typography tokens for font families, font sizes, font weights, line heights, and letter spacing",
  cornerRadius: "Corner radius values for UI components with rounded edges",
};

// Color subcategories and their descriptions
const colorSubcategoryDescriptions: Record<string, string> = {
  primitives: "Base color scales for the design system",
  neutral: "Neutral colors for backgrounds, text, borders, and other UI elements",
  accent: "Accent colors for highlighting and distinguishing UI elements",
  primary: "Primary brand colors for key UI elements and interactions",
  negative: "Negative/danger colors for error states and destructive actions",
  positive: "Positive/success colors for confirmations and success states",
  warning: "Warning colors for cautionary messages and states",
};

// Component to render a token value
const TokenValue = ({ token, tokenName }: { token: string; tokenName: string }) => {
  const theme = useAtomValue(evaluatedThemeAtom);

  // Determine token type
  const isColor = typeof token === "string" && token.includes("--color-");
  const isSpacing = typeof token === "string" && token.includes("--spacing-");
  const isTypography =
    typeof token === "string" &&
    (token.includes("--font-size-") ||
      token.includes("--line-height-") ||
      token.includes("--letter-spacing-") ||
      token.includes("--font-family-") ||
      token.includes("--font-weight-"));
  const isCornerRadius = typeof token === "string" && token.includes("--corner-radius-");

  // Create a ref to access computed values
  const [computedValue, setComputedValue] = useState<string>("");
  const elementRef = useRef<HTMLDivElement>(null);
  const computedValueRef = useRef<string>(computedValue);
  computedValueRef.current = computedValue;

  // Get the computed value when the component mounts
  useEffect(() => {
    const handleComputedValue = () => {
      if (elementRef.current && token.includes("var(")) {
        // Extract the CSS variable name from the token string
        const varName = token.match(/var\((.*?)\)/)?.[1] || "";
        if (varName) {
          // Get the computed style for the variable
          const computedStyle = getComputedStyle(document.body).getPropertyValue(varName).trim();
          if (computedStyle !== computedValueRef.current) {
            setComputedValue(computedStyle);
          }
        }
      }
    };

    handleComputedValue();
  }, [token, theme]);

  const handleCopy = (e: React.MouseEvent<HTMLDivElement>) => {
    // Copy token name to clipboard
    navigator.clipboard.writeText(token);

    // Find and show the copy indicator
    const parent = e.currentTarget;
    const copyIndicator = parent.querySelector(".copy-indicator") as HTMLElement;

    if (copyIndicator) {
      copyIndicator.style.bottom = "8px";
      copyIndicator.style.opacity = "1";

      // Hide after a delay
      setTimeout(() => {
        copyIndicator.style.bottom = "-30px";
        copyIndicator.style.opacity = "0";
      }, 1500);
    }
  };

  // Get the token value name and path
  const tokens = tokenName.split(".");
  let tokenValueName = tokens.pop() || tokenName;
  if (tokenValueName === "DEFAULT") {
    tokenValueName = tokens.pop() || tokenName;
  }

  return (
    <div
      ref={elementRef}
      className="flex flex-col p-4 border border-neutral-border rounded-lg mb-2 cursor-pointer relative overflow-hidden transition-all duration-200 hover:shadow-md"
      onClick={handleCopy}
      title={`Click to copy: ${tokenName}`}
    >
      {/* Visual preview for different token types */}
      {isColor && (
        <div className="flex flex-col gap-2 mb-3">
          <div
            className="w-full h-16 bg-neutral-surface rounded border border-neutral-border shadow-inner"
            style={{ backgroundColor: token }}
          />
        </div>
      )}

      {isSpacing && (
        <div className="mb-3 h-16 flex items-center justify-center px-4">
          <div
            className="h-2 rounded min-w-1 relative"
            style={{
              width: token,
              background: "linear-gradient(90deg, #6366F1 0%, #A855F7 100%)",
            }}
          />
        </div>
      )}

      {isTypography && (
        <div className="mb-3 h-16 flex items-center justify-center overflow-hidden">
          {token.includes("--font-size-") && (
            <div
              className="whitespace-nowrap leading-tight"
              style={{
                fontSize: token,
              }}
            >
              Aa
            </div>
          )}

          {token.includes("--line-height-") && (
            <div className="relative w-3/5 h-10">
              <div
                className="w-full flex items-center justify-center text-xs text-primary-content relative"
                style={{
                  height: token,
                  backgroundColor: "rgba(99, 102, 241, 0.2)",
                }}
              >
                Line Height
              </div>
            </div>
          )}

          {token.includes("--letter-spacing-") && (
            <div
              className="text-sm relative px-4"
              style={{
                letterSpacing: token,
              }}
            >
              LETTER SPACING
            </div>
          )}

          {token.includes("--font-family-") && (
            <div
              className="text-sm relative px-4"
              style={{
                fontFamily: token,
              }}
            >
              Font Family
            </div>
          )}

          {token.includes("--font-weight-") && (
            <div
              className="text-sm relative px-4"
              style={{
                fontWeight: token,
              }}
            >
              Font Weight
            </div>
          )}
        </div>
      )}

      {isCornerRadius && (
        <div className="mb-3 h-16 flex items-center justify-center relative">
          <div
            className="w-3/5 h-10 bg-primary-surface-content-subtle text-primary-surface-content-boldest border border-dashed border-primary-border"
            style={{
              borderRadius: token,
            }}
          />
        </div>
      )}

      {/* Token information */}
      <div className="flex justify-between">
        <div className="flex-1 flex flex-col gap-1">
          <div className="flex justify-between items-center">
            <div className="flex flex-col">
              <div className="text-neutral-content text-sm font-bold break-words">{tokenValueName}</div>
              <div className="text-[10px] text-neutral-content-subtlest -mt-1">{tokens.join(".")}</div>
            </div>

            <span className="text-xs text-neutral-content text-right">{computedValue || "..."}</span>
          </div>

          <div className="text-xs font-bold text-neutral-content-subtler text-center break-all flex-shrink-0 bg-neutral-surface p-0.5 rounded">
            {token.replace("var(", "").replace(")", "")}
          </div>
        </div>
      </div>

      {/* Copy indicator */}
      <div className="copy-indicator absolute -bottom-7 right-2 bg-neutral-inverted-surface text-neutral-inverted-content px-2 py-1 rounded text-xs opacity-0 transition-all duration-300 z-10">
        Copied!
      </div>
    </div>
  );
};

const searchAtom = atomWithStorage("tokensSearch", "");
const activeCategoryAtom = atomWithStorage("tokensActiveCategory", "all");
const activeColorSubcategoryAtom = atomWithStorage("tokensActiveColorSubcategory", "all");

// Component for the token catalog
const TokenCatalog = () => {
  const [searchTerm, setSearchTerm] = useAtom(searchAtom);
  const [activeCategory, setActiveCategory] = useAtom(activeCategoryAtom);
  const [activeColorSubcategory, setActiveColorSubcategory] = useAtom(activeColorSubcategoryAtom);

  // Function to flatten nested token objects into a searchable format
  const flattenTokens = (obj: Record<string, DesignTokenValue>, prefix = ""): FlattenedTokens => {
    const result: FlattenedTokens = {};

    for (const key in obj) {
      const newPrefix = prefix ? `${prefix}.${key}` : key;

      if (typeof obj[key] === "object" && obj[key] !== null) {
        Object.assign(result, flattenTokens(obj[key] as Record<string, DesignTokenValue>, newPrefix));
      } else {
        result[newPrefix] = obj[key] as string;
      }
    }

    return result;
  };

  // Get all tokens in a flat structure
  const allTokens = flattenTokens(designTokens);

  // Filter tokens based on search and category filters
  const filteredTokens = Object.entries(allTokens).filter(([name, value]) => {
    // Filter by search term
    const matchesSearch =
      searchTerm === "" ||
      name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      String(value).toLowerCase().includes(searchTerm.toLowerCase());

    // Filter by category
    const matchesCategory = activeCategory === "all" || name.startsWith(activeCategory);

    // Filter by color subcategory if in colors category
    const matchesColorSubcategory =
      !name.startsWith("colors") ||
      activeColorSubcategory === "all" ||
      (activeColorSubcategory === "primitives"
        ? !name.startsWith("colors.neutral") &&
          !name.startsWith("colors.primary") &&
          !name.startsWith("colors.negative") &&
          !name.startsWith("colors.positive") &&
          !name.startsWith("colors.warning") &&
          !name.startsWith("colors.accent") &&
          name.startsWith("colors.")
        : name.startsWith(`colors.${activeColorSubcategory}`));

    return matchesSearch && matchesCategory && matchesColorSubcategory;
  });

  // Group filtered tokens by their top-level category
  const groupedTokens: Record<string, Array<[string, string]>> = filteredTokens.reduce(
    (acc, [name, value]) => {
      const topCategory = name.split(".")[0];

      if (!acc[topCategory]) {
        acc[topCategory] = [];
      }

      acc[topCategory].push([name, value]);
      return acc;
    },
    {} as Record<string, Array<[string, string]>>,
  );

  return (
    <div className="token-catalog p-8">
      <div className="mb-6">
        <input
          type="text"
          placeholder="Search tokens by name or value..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="p-2 rounded border border-neutral-border bg-neutral-background text-neutral-content focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-focus-outline w-full text-sm mb-4"
        />

        <div className="flex gap-2 mb-4 flex-wrap">
          <button
            type="button"
            onClick={() => {
              setActiveCategory("all");
              setActiveColorSubcategory("all");
            }}
            className={`py-1.5 px-3 rounded border text-sm cursor-pointer ${
              activeCategory === "all"
                ? "bg-primary-surface border-primary-border text-primary-surface-content"
                : "bg-neutral-surface border-neutral-border"
            }`}
          >
            All Categories
          </button>
          {Object.keys(categoryDescriptions).map((category) => (
            <button
              type="button"
              key={category}
              onClick={() => {
                setActiveCategory(category);
                if (category !== "colors") {
                  setActiveColorSubcategory("all");
                }
              }}
              className={`py-1.5 px-3 rounded border text-sm cursor-pointer ${
                activeCategory === category
                  ? "bg-primary-surface border-primary-border text-primary-surface-content"
                  : "bg-neutral-surface border-neutral-border"
              }`}
            >
              {category}
            </button>
          ))}
        </div>

        {activeCategory === "colors" && (
          <div className="flex gap-2 mb-4 flex-wrap">
            <button
              type="button"
              onClick={() => setActiveColorSubcategory("all")}
              className={`py-1.5 px-3 rounded border text-sm cursor-pointer ${
                activeColorSubcategory === "all"
                  ? "bg-primary-surface border-primary-border text-primary-surface-content"
                  : "bg-neutral-surface border-neutral-border"
              }`}
            >
              All Colors
            </button>
            {Object.keys(colorSubcategoryDescriptions).map((subcategory) => (
              <button
                type="button"
                key={subcategory}
                onClick={() => {
                  setActiveColorSubcategory(subcategory);
                }}
                className={`py-1.5 px-3 rounded border text-sm cursor-pointer ${
                  activeColorSubcategory === subcategory
                    ? "bg-primary-surface border-primary-border text-primary-surface-content"
                    : "bg-neutral-surface border-neutral-border"
                }`}
              >
                {subcategory}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Display the tokens */}
      {Object.keys(groupedTokens).length === 0 ? (
        <div className="text-center my-10 text-neutral-content-subtler">No tokens found matching "{searchTerm}"</div>
      ) : (
        Object.entries(groupedTokens).map(([category, tokens]) => (
          <div key={category} className="category-section mb-10">
            <h2 className="text-lg m-0 mb-2 pb-2 border-b border-neutral-border">
              {category} ({tokens.length})
            </h2>
            <p className="text-sm m-0 mb-4 text-neutral-content-subtler">
              {categoryDescriptions[category] || "Design tokens in this category"}
            </p>

            <div className="grid gap-4" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))" }}>
              {tokens.map(([name, value]) => (
                <TokenValue key={name} token={value} tokenName={name} />
              ))}
            </div>
          </div>
        ))
      )}
    </div>
  );
};

// Component to display design tokens organized by categories
const TokenCategorized = () => {
  const setSearchTerm = useSetAtom(searchAtom);
  const setActiveCategory = useSetAtom(activeCategoryAtom);
  const setActiveColorSubcategory = useSetAtom(activeColorSubcategoryAtom);

  // Helper function to generate a color palette for the colors category
  const generateColorPalette = () => {
    return (
      <div className="flex flex-col gap-4">
        <div className="flex gap-16">
          <div className="flex gap-3 items-center">
            {["primary", "positive", "warning", "negative", "neutral"].map((color) => (
              <div key={color} className="flex flex-col items-center w-13">
                <div
                  className="w-12 h-12 rounded border border-neutral-border"
                  style={{ backgroundColor: `var(--color-${color}-surface)` }}
                  title={`${color}`}
                />
                <div className="text-xs">{color}</div>
              </div>
            ))}
          </div>
          <div className="flex gap-3 items-center">
            {["grape", "blueberry", "kale", "kiwi", "mango", "persimmon"].map((color) => (
              <div key={color} className="flex flex-col items-center w-13">
                <div
                  className="w-12 h-12 rounded border border-neutral-border"
                  style={{ backgroundColor: `var(--color-${color}-500)` }}
                  title={`${color}`}
                />
                <div className="text-xs">{color}</div>
              </div>
            ))}
          </div>
        </div>
        <div className="flex flex-wrap gap-4">
          {Object.entries(colorSubcategoryDescriptions).map(([subCategory, subDescription]) => (
            <LinkTo
              key={subCategory}
              kind="design-tokens"
              story="tokens-catalog"
              className="flex-1 basis-[300px] border border-neutral-border rounded-lg p-4 cursor-pointer relative overflow-hidden hover:shadow-md transition-all duration-200"
              onClick={() => {
                setSearchTerm("");
                setActiveCategory("colors");
                setActiveColorSubcategory(subCategory);
              }}
            >
              {/* Color preview for each subcategory */}
              {!["primitives", "neutral", "accent"].includes(subCategory) && (
                <div
                  className="absolute top-0 right-0 w-15 h-15 opacity-30 rounded-bl-full border-l border-b border-neutral-border"
                  style={{ backgroundColor: `var(--color-${subCategory}-surface)` }}
                />
              )}

              {["primitives", "neutral", "accent"].includes(subCategory) && (
                <div className="absolute top-0 right-0 w-15 h-15 opacity-30 overflow-hidden border-l border-b border-neutral-border">
                  <div className="flex">
                    <div
                      className="w-5 h-5"
                      style={{
                        backgroundColor: `var(--color-${
                          subCategory === "primitives"
                            ? "grape-500"
                            : subCategory === "neutral"
                              ? "neutral-surface"
                              : "accent-grape-bold"
                        })`,
                      }}
                    />
                    <div
                      className="w-5 h-5"
                      style={{
                        backgroundColor: `var(--color-${
                          subCategory === "primitives"
                            ? "blueberry-500"
                            : subCategory === "neutral"
                              ? "neutral-surface-hover"
                              : "accent-blueberry-bold"
                        })`,
                      }}
                    />
                    <div
                      className="w-5 h-5"
                      style={{
                        backgroundColor: `var(--color-${
                          subCategory === "primitives"
                            ? "kale-500"
                            : subCategory === "neutral"
                              ? "neutral-surface-active"
                              : "accent-kale-bold"
                        })`,
                      }}
                    />
                  </div>
                  <div className="flex">
                    <div
                      className="w-5 h-5"
                      style={{
                        backgroundColor: `var(--color-${
                          subCategory === "primitives"
                            ? "kiwi-500"
                            : subCategory === "neutral"
                              ? "neutral-border"
                              : "accent-kiwi-bold"
                        })`,
                      }}
                    />
                    <div
                      className="w-5 h-5"
                      style={{
                        backgroundColor: `var(--color-${
                          subCategory === "primitives"
                            ? "mango-500"
                            : subCategory === "neutral"
                              ? "neutral-border-subtle"
                              : "accent-mango-bold"
                        })`,
                      }}
                    />
                    <div
                      className="w-5 h-5"
                      style={{
                        backgroundColor: `var(--color-${
                          subCategory === "primitives"
                            ? "persimmon-500"
                            : subCategory === "neutral"
                              ? "neutral-border-subtler"
                              : "accent-persimmon-bold"
                        })`,
                      }}
                    />
                  </div>
                  <div className="flex">
                    <div
                      className="w-5 h-5"
                      style={{
                        backgroundColor: `var(--color-${
                          subCategory === "primitives"
                            ? "plum-500"
                            : subCategory === "neutral"
                              ? "neutral-content"
                              : "accent-plum-bold"
                        })`,
                      }}
                    />
                    <div
                      className="w-5 h-5"
                      style={{
                        backgroundColor: `var(--color-${
                          subCategory === "primitives"
                            ? "fig-500"
                            : subCategory === "neutral"
                              ? "neutral-content-subtle"
                              : "accent-fig-bold"
                        })`,
                      }}
                    />
                    <div
                      className="w-5 h-5"
                      style={{
                        backgroundColor: `var(--color-${
                          subCategory === "primitives"
                            ? "sand-500"
                            : subCategory === "neutral"
                              ? "neutral-content-subtler"
                              : "accent-sand-bold"
                        })`,
                      }}
                    />
                  </div>
                </div>
              )}

              <h3 className="text-base mb-2">{subCategory}</h3>
              <p className="text-sm text-neutral-content-subtler relative z-10">{subDescription}</p>
            </LinkTo>
          ))}
        </div>
      </div>
    );
  };

  const RawColorsPalette = () => {
    return (
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <h3 className="text-base">Raw Color Values</h3>
          <p className="text-sm text-neutral-content-subtler">
            These color tokens have raw RGB values available for creating translucent colors with custom opacity. The
            same code will automatically adapt to dark mode.
          </p>
        </div>
        <div className="flex flex-col gap-6">
          {/* Primitive color demonstration */}
          <div className="mt-2">
            <h4 className="text-sm font-semibold mb-2">Primary Color with Different Opacities</h4>
            <div className="flex gap-4">
              {[10, 25, 50, 75, 100].map((opacity) => (
                <div key={opacity} className="flex flex-col items-center">
                  <div
                    className="w-12 h-12 rounded bg-neutral-surface border border-neutral-border mb-1"
                    style={{ backgroundColor: `rgb(var(--color-primary-surface-raw) / ${opacity}%)` }}
                  />
                  <span className="text-xs">{opacity}%</span>
                </div>
              ))}
            </div>
            <div className="mt-3 bg-neutral-surface p-2 rounded text-xs font-mono">
              background-color: rgb(var(--color-primary-surface-raw) / 50%);
            </div>
          </div>

          {/* Shadow/outline example */}
          <div>
            <h4 className="text-sm font-semibold mb-2">Shadow Example</h4>
            <div className="flex gap-4">
              <div className="flex flex-col items-center">
                <div
                  className="w-16 h-16 rounded bg-neutral-surface flex items-center justify-center"
                  style={{
                    boxShadow: "0 4px 8px rgb(var(--color-neutral-shadow-raw) / 15%)",
                  }}
                >
                  <span className="text-xs text-center">Neutral Shadow</span>
                </div>
              </div>
            </div>
            <div className="mt-3 bg-neutral-surface p-2 rounded text-xs font-mono">
              box-shadow: 0 4px 8px rgb(var(--color-neutral-shadow-raw) / 15%);
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Helper function to generate a spacing visualization
  const generateSpacingPreview = () => {
    return (
      <div className="flex flex-col gap-2 mt-4 items-start">
        {["100", "200", "400", "800"].map((size) => (
          <div key={size} className="flex flex-col">
            <div
              className="h-5 bg-primary-surface text-primary-content rounded relative"
              style={{ width: `var(--spacing-${size})` }}
              title={`spacing-${size}`}
            />
            <div className="text-xs">{size}</div>
          </div>
        ))}
      </div>
    );
  };

  // Helper function to generate a typography preview
  const generateTypographyPreview = () => {
    return (
      <div className="flex flex-col gap-2 mt-4">
        <div style={{ fontSize: "var(--font-size-12)", lineHeight: "var(--line-height-16)" }}>
          Font Size 12: {pxToRem(12)}
        </div>
        <div style={{ fontSize: "var(--font-size-14)", lineHeight: "var(--line-height-20)" }}>
          Font Size 14: {pxToRem(14)}
        </div>
        <div style={{ fontSize: "var(--font-size-16)", lineHeight: "var(--line-height-24)" }}>
          Font Size 16: {pxToRem(16)}
        </div>
      </div>
    );
  };

  // Helper function to generate a corner radius preview
  const generateCornerRadiusPreview = () => {
    return (
      <div className="flex gap-4 mt-4">
        {["small", "medium", "large"].map((size) => (
          <div
            key={size}
            className="w-15 h-10 bg-primary-surface-content-subtle text-primary-surface-content-boldest border border-dashed border-primary-border flex items-center justify-center text-xs"
            style={{ borderRadius: `var(--corner-radius-${size})` }}
            title={`corner-radius-${size}`}
          >
            {size}
          </div>
        ))}
      </div>
    );
  };

  // Get the appropriate preview for each category
  const getCategoryPreview = (category: string) => {
    switch (category) {
      case "colors":
        return generateColorPalette();
      case "spacing":
        return generateSpacingPreview();
      case "typography":
        return generateTypographyPreview();
      case "cornerRadius":
        return generateCornerRadiusPreview();
      default:
        return null;
    }
  };

  return (
    <div className="p-8">
      <h1 className="text-2xl mb-6">Design Tokens</h1>
      <p className="mb-6">
        Browse through our design tokens organized by category. These tokens are the foundation of our design system.
      </p>

      <div className="flex flex-col gap-12">
        {Object.entries(categoryDescriptions).map(([category, description]) => (
          <div key={category} className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <h2 className="text-xl">{category.replace(/-/g, " ").replace(/\b\w/g, (char) => char.toUpperCase())}</h2>
              <p className="text-neutral-content-subtler">{description}</p>
            </div>

            {/* Preview for each category */}
            {getCategoryPreview(category)}

            {/* Add raw colors palette for the colors category */}
            {category === "colors" && (
              <div className="mt-4">
                <RawColorsPalette />
              </div>
            )}

            {category !== "colors" && (
              <LinkTo
                kind="design-tokens"
                story="tokens-catalog"
                className="block border border-neutral-border rounded-lg p-4 cursor-pointer mt-6 hover:shadow-md transition-all duration-200"
                onClick={() => {
                  setSearchTerm("");
                  setActiveCategory(category);
                }}
              >
                <p className="text-sm">View all {category} tokens &rarr;</p>
              </LinkTo>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

const meta: Meta = {
  title: "Design/Tokens",
  tags: ["!autodocs"],
  parameters: {
    layout: "fullscreen",
    docs: {
      description: {
        component: "A catalog of all available design tokens in the system. Click on any token to copy its path.",
      },
    },
  },
};

export default meta;

export const TokensIndex = {
  render: () => <TokenCategorized />,
  name: "Index",
  parameters: {
    docs: {
      description: {
        story: "Design tokens organized by their categories for easier navigation.",
      },
    },
  },
};

export const TokensCatalog = {
  render: () => <TokenCatalog />,
  name: "Catalog",
  parameters: {
    docs: {
      description: {
        story: "All design tokens displayed in a searchable and filterable grid.",
      },
    },
  },
};
