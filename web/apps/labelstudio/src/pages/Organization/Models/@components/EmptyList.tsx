import { Button } from "@humansignal/ui";
import { cn } from "apps/labelstudio/src/utils/bem";
import type { FC } from "react";
import { useTranslation } from "react-i18next";
import "./EmptyList.prefix.css";
import { HeidiAi } from "apps/labelstudio/src/assets/images";

export const EmptyList: FC = () => {
  const { t } = useTranslation();

  return (
    <div className={cn("empty-models-list").toClassName()}>
      <div className={cn("empty-models-list").elem("content").toClassName()}>
        <div className={cn("empty-models-list").elem("heidy").toClassName()}>
          <HeidiAi />
        </div>
        <div className={cn("empty-models-list").elem("title").toClassName()}>{t("account:orgCreateModelTitle")}</div>
        <div className={cn("empty-models-list").elem("caption").toClassName()}>
          {t("account:orgEmptyModelsCaption")}
        </div>
        <Button aria-label={t("account:orgCreateNewModelAria")}>{t("account:orgCreateModelTitle")}</Button>
      </div>
    </div>
  );
};
