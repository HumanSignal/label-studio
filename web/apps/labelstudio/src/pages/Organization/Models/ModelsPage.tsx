import { buttonVariant, Space } from "@humansignal/ui";
import { useUpdatePageTitle } from "@humansignal/core";
import { useTranslation } from "react-i18next";
import i18next from "i18next";
import { cn } from "apps/labelstudio/src/utils/bem";
import { Link } from "react-router-dom";
import type { Page } from "../../types/Page";
import { EmptyList } from "./@components/EmptyList";

export const ModelsPage: Page = () => {
  const { t } = useTranslation();

  useUpdatePageTitle(t("account:orgModelsPageTitle"));

  return (
    <div className={cn("prompter").toClassName()}>
      <EmptyList />
    </div>
  );
};

// Route metadata is read by the routing/sidebar system outside of a React
// component, so it resolves through the shared i18next singleton lazily.
ModelsPage.title = () => i18next.t("account:orgModelsPageTitle");
ModelsPage.titleRaw = "Models";
ModelsPage.path = "/models";

ModelsPage.context = () => {
  return (
    <Space size="small">
      <Link to="/prompt/settings" className={buttonVariant({ size: "small" })}>
        {i18next.t("account:orgCreateModelLink")}
      </Link>
    </Space>
  );
};
