import { clsx } from "clsx";
import styles from "./ThemeToggle.module.scss";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ReactComponent as Sun } from "./icons/sun.svg";
import { ReactComponent as Moon } from "./icons/moon.svg";

const THEME_OPTIONS = ["Auto", "Light", "Dark"];
const PREFERRED_COLOR_SCHEME_KEY = "preferred-color-scheme";
export const ThemeToggle = () => {
  const presetTheme = window.localStorage.getItem(PREFERRED_COLOR_SCHEME_KEY) ?? THEME_OPTIONS[0];
  const [theme, setTheme] = useState(presetTheme);
  const systemMode = useMemo(
    () => (window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches ? "Dark" : "Light"),
    [],
  );
  const [appliedTheme, setAppliedTheme] = useState(presetTheme === "Auto" ? systemMode : presetTheme);

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
    setAppliedTheme(nextTheme === "Auto" ? systemMode : nextTheme);
  }, [theme]);

  return (
    <button 
      className={clsx(styles.themeToggle, { [styles.dark]: appliedTheme === "Dark", [styles.light]: appliedTheme === "Light" })} 
      onClick={themeChanged}
    >
      <div className={clsx(styles.themeToggle__icon)}>
        <div className={clsx(styles.animationWrapper)}>
          <Moon className={clsx(styles.moon)} />
          <Sun className={clsx(styles.sun)} />
        </div>
      </div>
      <span className={clsx(styles.themeToggle__label)}>{theme}</span>
    </button>
  );
};

export default ThemeToggle;
