import { useCallback } from "react";
import { useAtomValue } from "jotai";
import { themeAtom } from "../lib/ThemeToggle/ThemeToggle";
import { getTokenColor, type GetColorFn, type GetTokenColorOptions, type Theme } from "../utils/getTokenColor";

/**
 * Hook that returns a theme-aware color getter function.
 * Automatically re-renders when theme changes.
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
