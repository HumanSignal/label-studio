import { cn } from "../../utils/bem";
import { useTranslation } from "react-i18next";
import "./Hamburger.scss";

export const Hamburger = ({ opened, animated = true }) => {
  const { t } = useTranslation();
  const root = cn("hamburger");

  return (
    <span
      className={root.mod({ animated, opened })}
      role="button"
      aria-label={t("Hamburger.toggle", { defaultValue: "Toggle menu" })}
      title={t("Hamburger.toggle", { defaultValue: "Toggle menu" })}
    >
      <span />
      <span />
      <span />
    </span>
  );
};
