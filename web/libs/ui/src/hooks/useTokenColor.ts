/**
 * React hook for theme-aware color token resolution
 *
 * This hook provides a `getColor` function that automatically uses the current theme
 * from the themeAtom. It re-renders components when the theme changes.
 *
 * @example
 * ```typescript
 * const MyComponent = () => {
 *   const getColor = useTokenColor();
 *
 *   return (
 *     <div style={{ backgroundColor: getColor("primary-surface") }}>
 *       <span style={{ color: getColor("neutral-content") }}>
 *         Hello
 *       </span>
 *     </div>
 *   );
 * };
 * ```
 */

import { useCallback } from "react";
import { useAtomValue } from "jotai";
import { themeAtom } from "../lib/ThemeToggle/ThemeToggle";
import { getTokenColor, type GetColorFn, type GetTokenColorOptions, type Theme } from "../utils/getTokenColor";

/**
 * Hook that returns a theme-aware getColor function
 *
 * The returned function automatically uses the current theme from themeAtom,
 * so you don't need to pass the theme explicitly.
 *
 * @returns A function to get color tokens with the current theme
 *
 * @example
 * ```typescript
 * const getColor = useTokenColor();
 *
 * // Get colors with current theme
 * const primary = getColor("primary-surface");
 * const border = getColor("neutral-border", { alpha: 0.5 });
 * ```
 */
export function useTokenColor(): GetColorFn {
  const themeValue = useAtomValue(themeAtom);

  // Normalize theme value ("Light"/"Dark" -> "light"/"dark")
  const theme: Theme = themeValue.toLowerCase() === "dark" ? "dark" : "light";

  const getColor = useCallback(
    (tokenName: string, options?: Omit<GetTokenColorOptions, "theme">): string => {
      return getTokenColor(tokenName, { ...options, theme });
    },
    [theme],
  );

  return getColor;
}
