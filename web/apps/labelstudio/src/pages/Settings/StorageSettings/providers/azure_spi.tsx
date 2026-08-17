import { EnterpriseBadge, Message } from "@humansignal/ui";
import { useTranslation } from "react-i18next";
import i18next from "i18next";
import { IconCloudProviderAzure } from "@humansignal/icons";
import type { ProviderConfig } from "@humansignal/app-common/blocks/StorageProviderForm/types/provider";

const AzureSpiEnterpriseMessage = () => {
  const { t } = useTranslation();

  return (
    <Message variant="enterprise" title={t("settings:enterpriseFeatureTitle")}>
      {t("settings:azureSpiEnterpriseMsg")}{" "}
      <a
        href="https://docs.humansignal.com/guide/storage.html#Azure-Blob-Storage-with-Service-Principal-authentication"
        target="_blank"
        rel="noopener noreferrer"
        className="underline hover:no-underline"
      >
        {t("settings:learnMore")}
      </a>
    </Message>
  );
};

const azureSpiProvider: ProviderConfig = {
  name: "azure_spi",
  get title() {
    return i18next.t("settings:azureSpiProviderTitle");
  },
  get description() {
    return i18next.t("settings:azureSpiProviderDesc");
  },
  icon: IconCloudProviderAzure,
  disabled: true,
  badge: <EnterpriseBadge />,
  fields: [
    {
      name: "enterprise_info",
      type: "message",
      content: AzureSpiEnterpriseMessage,
    },
  ],
  layout: [{ fields: ["enterprise_info"] }],
};

export default azureSpiProvider;
