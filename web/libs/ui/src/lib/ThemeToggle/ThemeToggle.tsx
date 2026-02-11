import { clsx } from "clsx";
import styles from "./ThemeToggle.module.scss";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ReactComponent as Sun } from "./icons/sun.svg";
import { ReactComponent as Moon } from "./icons/moon.svg";
import { atom, useSetAtom } from "jotai";

interface ThemeToggleProps {
  className?: string;
}

const THEME_OPTIONS = ["Auto", "Light", "Dark"];
const PREFERRED_COLOR_SCHEME_KEY = "preferred-color-scheme";

export const getCurrentTheme = () => {
  const themeSelection = window.localStorage.getItem(PREFERRED_COLOR_SCHEME_KEY) ?? THEME_OPTIONS[0];
  return themeSelection === THEME_OPTIONS[0]
    ? window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches
      ? "Dark"
      : "Light"
    : themeSelection;
};
export const themeAtom = atom<string>(getCurrentTheme());
export const ThemeToggle: React.FC<ThemeToggleProps> = ({ className }) => {
  const presetTheme = window.localStorage.getItem(PREFERRED_COLOR_SCHEME_KEY) ?? THEME_OPTIONS[1];
  const [theme, setTheme] = useState(presetTheme);
  const systemMode = useMemo(
    () => (window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches ? "Dark" : "Light"),
    [],
  );
  const [appliedTheme, setAppliedTheme] = useState(presetTheme === "Auto" ? systemMode : presetTheme);
  const setThemeAtom = useSetAtom(themeAtom);

  useEffect(() => {
    if (!appliedTheme) return;
    document.documentElement.setAttribute("data-color-scheme", appliedTheme.toLowerCase());
  }, [appliedTheme]);

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

  const themeLabel = useMemo(
    () => THEME_OPTIONS.find((option) => option.toLowerCase() === theme.toLowerCase()),
    [theme],
  );

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
