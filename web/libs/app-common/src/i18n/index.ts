import { createInstance, type i18n as I18nInstance } from "i18next";
import { initReactI18next } from "react-i18next";
import { en } from "./locales/en";
import { zhCN } from "./locales/zh-CN";

export const DEFAULT_LANGUAGE = "en";
export const LANGUAGE_STORAGE_KEY = "label-studio.language";
export const SUPPORTED_LANGUAGES = [DEFAULT_LANGUAGE, "zh-CN"] as const;

export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number];
type LanguageStorage = Pick<Storage, "getItem" | "setItem">;

type I18nEnvironment = {
  storage?: LanguageStorage | null;
  browserLanguages?: readonly string[];
};

type SetLanguageOptions = {
  instance?: I18nInstance;
  storage?: LanguageStorage | null;
};

const resources = {
  en: { app: en },
  "zh-CN": { app: zhCN },
};

const getStorage = (): LanguageStorage | null => {
  try {
    return typeof window === "undefined" ? null : window.localStorage;
  } catch {
    return null;
  }
};

const getBrowserLanguages = (): readonly string[] => {
  if (typeof navigator === "undefined") return [];
  return navigator.languages?.length ? navigator.languages : navigator.language ? [navigator.language] : [];
};

export const matchSupportedLanguage = (language?: string | null): SupportedLanguage | null => {
  if (!language) return null;

  const normalized = language.trim().replaceAll("_", "-").toLowerCase();
  if (normalized === "en" || normalized.startsWith("en-")) return "en";
  if (
    ["zh", "zh-cn", "zh-sg", "zh-hans"].some((locale) => normalized === locale || normalized.startsWith(`${locale}-`))
  ) {
    return "zh-CN";
  }

  return null;
};

const readStoredLanguage = (storage: LanguageStorage | null): SupportedLanguage | null => {
  try {
    return matchSupportedLanguage(storage?.getItem(LANGUAGE_STORAGE_KEY));
  } catch {
    return null;
  }
};

export const resolveInitialLanguage = ({
  storage = getStorage(),
  browserLanguages = getBrowserLanguages(),
}: I18nEnvironment = {}): SupportedLanguage => {
  const storedLanguage = readStoredLanguage(storage);
  if (storedLanguage) return storedLanguage;

  for (const language of browserLanguages) {
    const supportedLanguage = matchSupportedLanguage(language);
    if (supportedLanguage) return supportedLanguage;
  }

  return DEFAULT_LANGUAGE;
};

const configureI18n = async (instance: I18nInstance, environment: I18nEnvironment = {}) => {
  await instance.use(initReactI18next).init({
    resources,
    lng: resolveInitialLanguage(environment),
    fallbackLng: DEFAULT_LANGUAGE,
    supportedLngs: [...SUPPORTED_LANGUAGES],
    defaultNS: "app",
    ns: ["app"],
    returnEmptyString: false,
    interpolation: {
      escapeValue: false,
    },
    react: {
      useSuspense: false,
    },
  });

  return instance;
};

export const createI18n = (environment: I18nEnvironment = {}) => configureI18n(createInstance(), environment);

export const i18n = createInstance();
let initialization: Promise<I18nInstance> | undefined;

export const initI18n = (environment: I18nEnvironment = {}) => {
  if (i18n.isInitialized) return Promise.resolve(i18n);
  initialization ??= configureI18n(i18n, environment);
  return initialization;
};

export const setLanguage = async (
  language: string,
  { instance = i18n, storage = getStorage() }: SetLanguageOptions = {},
): Promise<SupportedLanguage> => {
  const supportedLanguage = matchSupportedLanguage(language) ?? DEFAULT_LANGUAGE;

  try {
    storage?.setItem(LANGUAGE_STORAGE_KEY, supportedLanguage);
  } catch {
    // A disabled or full localStorage must not prevent language switching.
  }

  await instance.changeLanguage(supportedLanguage);
  return supportedLanguage;
};
