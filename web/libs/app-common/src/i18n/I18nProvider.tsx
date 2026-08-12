import { useEffect, useMemo, type ReactNode } from "react";
import { I18nextProvider } from "react-i18next";
import { getI18n } from "./init";
import { resolveInitialLanguage } from "./config";

export interface I18nProviderProps {
  children: ReactNode;
  /**
   * Override the browser language list. Defaults to `navigator.languages` at mount time.
   * Exposed primarily for tests.
   */
  browserLanguages?: readonly string[];
}

export function I18nProvider({ children, browserLanguages }: I18nProviderProps) {
  const instance = useMemo(() => getI18n(), []);

  useEffect(() => {
    const initial = resolveInitialLanguage(browserLanguages ?? navigator.languages ?? []);
    if (instance.language !== initial) {
      instance.changeLanguage(initial);
    }
  }, [instance, browserLanguages]);

  return <I18nextProvider i18n={instance}>{children}</I18nextProvider>;
}
