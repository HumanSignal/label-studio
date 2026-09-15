import { Select, Typography } from "@humansignal/ui";
import { useTranslation } from "react-i18next";
import { DEFAULT_LANGUAGE, matchSupportedLanguage, setLanguage } from "../../../../i18n";

const languageOptions = [
  { value: "en", label: "English" },
  { value: "zh-CN", label: "简体中文" },
] as const;

export const LanguageSectionTitle = () => {
  const { t } = useTranslation();
  return <>{t("language.sectionTitle")}</>;
};

export const LanguageDescription = () => {
  const { t } = useTranslation();
  return <>{t("language.sectionDescription")}</>;
};

export const LanguageSettings = () => {
  const { t, i18n } = useTranslation();
  const language = matchSupportedLanguage(i18n.resolvedLanguage) ?? DEFAULT_LANGUAGE;

  return (
    <div className="flex max-w-[480px] flex-col gap-tight">
      <Select
        name="interface-language"
        label={t("language.fieldLabel")}
        options={languageOptions}
        value={language}
        dataTestid="language-selector"
        onChange={(value) => void setLanguage(String(value))}
      />
      <Typography size="small" className="text-neutral-content-subtler">
        {t("language.fieldDescription")}
      </Typography>
    </div>
  );
};
