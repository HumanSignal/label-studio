import { useTranslation } from "react-i18next";
import { IconGlobe } from "@humansignal/icons";
import { Button, Dropdown } from "@humansignal/ui";
import { useLanguage } from "@humansignal/app-common";
import { Menu } from "../Menu/Menu";

// Locale names stay in their own language so users can always find theirs.
const LOCALES = [
  { value: "zh-CN", label: "中文（简体）" },
  { value: "en", label: "English" },
];

export const LanguageSwitcher = () => {
  const { t } = useTranslation();
  const { language, setLanguage } = useLanguage();

  const switchTo = (locale) => {
    if (locale === language) return;
    setLanguage(locale);
    // Keep Django-rendered pages (login etc.) in sync via LocaleMiddleware
    document.cookie = `django_language=${locale}; path=/; max-age=31536000; samesite=lax`;
    // Full reload so once-evaluated strings (module constants, MST snapshots) re-translate
    window.location.reload();
  };

  return (
    <Dropdown.Trigger
      align="right"
      content={
        <Menu>
          {LOCALES.map(({ value, label }) => (
            <Menu.Item key={value} active={value === language} onClick={() => switchTo(value)}>
              {label}
            </Menu.Item>
          ))}
        </Menu>
      }
    >
      <Button
        variant="neutral"
        look="outlined"
        size="small"
        icon={<IconGlobe />}
        tooltip={t("menubar:switchLanguageTooltip")}
        aria-label={t("menubar:switchLanguageTooltip")}
        data-testid="language-switcher"
      />
    </Dropdown.Trigger>
  );
};
