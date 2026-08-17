import { clsx } from "clsx";
import styles from "./ThemeToggle.module.css";
import { useCallback, useLayoutEffect, useMemo, useState } from "react";
import { ReactComponent as Sun } from "./icons/sun.svg";
import { ReactComponent as Moon } from "./icons/moon.svg";
import { atom, useSetAtom } from "jotai";

interface ThemeToggleProps {
  className?: string;
  /** Optional display labels keyed by theme option ("Auto" | "Light" | "Dark"). */
  labels?: Record<string, string>;
}

const THEME_OPTIONS = ["Auto", "Light", "Dark"];
const PREFERRED_COLOR_SCHEME_KEY = "preferred-color-scheme";

/** Resolve stored preference ("Auto" | "Light" | "Dark") to applied "Light" | "Dark". */
export const resolveThemePreference = (themeSelection: string) => {
  return themeSelection === THEME_OPTIONS[0]
    ? window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches
      ? "Dark"
      : "Light"
    : themeSelection;
};

export const getStoredThemePreference = () =>
  window.localStorage.getItem(PREFERRED_COLOR_SCHEME_KEY) ?? THEME_OPTIONS[1];

export const getCurrentTheme = () => resolveThemePreference(getStoredThemePreference());
export const themeAtom = atom<string>(getCurrentTheme());
export const ThemeToggle: React.FC<ThemeToggleProps> = ({ className, labels }) => {
  const presetTheme = getStoredThemePreference();
  const [theme, setTheme] = useState(presetTheme);
  const systemMode = useMemo(
    () => (window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches ? "Dark" : "Light"),
    [],
  );
  const [appliedTheme, setAppliedTheme] = useState(() => resolveThemePreference(presetTheme));
  const setThemeAtom = useSetAtom(themeAtom);

  // Keep document + jotai atom aligned with the applied theme (including first mount).
  useLayoutEffect(() => {
    if (!appliedTheme) return;
    document.documentElement.setAttribute("data-color-scheme", appliedTheme.toLowerCase());
    setThemeAtom(appliedTheme);
  }, [appliedTheme, setThemeAtom]);

  const themeChanged = useCallback(() => {
    const length = THEME_OPTIONS.length;
    const index = (THEME_OPTIONS.indexOf(theme) + 1) % length;
    const nextTheme = THEME_OPTIONS[index];

    window.localStorage.setItem(PREFERRED_COLOR_SCHEME_KEY, nextTheme);
    setTheme(nextTheme);
    const newTheme = nextTheme === "Auto" ? systemMode : nextTheme;
    setAppliedTheme(newTheme);
    setThemeAtom(newTheme);
  }, [theme]);

  const themeLabel = useMemo(() => {
    const option = THEME_OPTIONS.find((option) => option.toLowerCase() === theme.toLowerCase());
    return (labels?.[option ?? ""] as string | undefined) ?? option;
  }, [theme, labels]);

  return (
    <button
      className={clsx(styles.themeToggle, className, {
        [styles.dark]: appliedTheme === "Dark",
        [styles.light]: appliedTheme === "Light",
      })}
      onClick={themeChanged}
      type="button"
    >
      <div className={clsx(styles.themeToggle__icon)}>
        <div className={clsx(styles.animationWrapper)}>
          <Moon className={clsx(styles.moon)} />
          <Sun className={clsx(styles.sun)} />
        </div>
      </div>
      <span className={clsx(styles.themeToggle__label)}>{themeLabel}</span>
    </button>
  );
};

export default ThemeToggle;
