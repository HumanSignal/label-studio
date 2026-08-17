import { EnterpriseBadge, Message } from "@humansignal/ui";
import { useTranslation } from "react-i18next";
import i18next from "i18next";
import { IconCloudProviderDatabricks } from "@humansignal/icons";
import type { ProviderConfig } from "@humansignal/app-common/blocks/StorageProviderForm/types/provider";

const DatabricksEnterpriseMessage = () => {
  const { t } = useTranslation();

  return (
    <Message variant="enterprise" title={t("settings:enterpriseFeatureTitle")}>
      {t("settings:databricksEnterpriseMsg")}{" "}
      <a
        href="https://docs.humansignal.com/guide/storage.html#Databricks-Files-UC-Volumes"
        target="_blank"
        rel="noopener noreferrer"
        className="underline hover:no-underline"
      >
        {t("settings:learnMore")}
      </a>
    </Message>
  );
};

const databricksProvider: ProviderConfig = {
  name: "databricks",
  get title() {
    return i18next.t("settings:databricksProviderTitle");
  },
  get description() {
    return i18next.t("settings:databricksProviderDesc");
  },
  icon: IconCloudProviderDatabricks,
  disabled: true,
  badge: <EnterpriseBadge />,
  fields: [
    {
      name: "enterprise_info",
      type: "message",
      content: DatabricksEnterpriseMessage,
    },
  ],
  layout: [{ fields: ["enterprise_info"] }],
};

export default databricksProvider;
