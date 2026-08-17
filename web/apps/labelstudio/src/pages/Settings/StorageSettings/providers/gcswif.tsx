import { EnterpriseBadge, Message } from "@humansignal/ui";
import { useTranslation } from "react-i18next";
import i18next from "i18next";
import { IconCloudProviderGCS } from "@humansignal/icons";
import type { ProviderConfig } from "@humansignal/app-common/blocks/StorageProviderForm/types/provider";

const GcsWifEnterpriseMessage = () => {
  const { t } = useTranslation();

  return (
    <Message variant="enterprise" title={t("settings:enterpriseFeatureTitle")}>
      {t("settings:gcsWifEnterpriseMsg")}{" "}
      <a
        href="https://docs.humansignal.com/guide/storage.html#Google-Cloud-Storage-with-Workload-Identity-Federation-WIF"
        target="_blank"
        rel="noopener noreferrer"
        className="underline hover:no-underline"
      >
        {t("settings:learnMore")}
      </a>
    </Message>
  );
};

const gcsWifProvider: ProviderConfig = {
  name: "gcswif",
  get title() {
    return i18next.t("settings:gcsWifProviderTitle");
  },
  get description() {
    return i18next.t("settings:gcsWifProviderDesc");
  },
  icon: IconCloudProviderGCS,
  disabled: true,
  badge: <EnterpriseBadge />,
  fields: [
    {
      name: "enterprise_info",
      type: "message",
      content: GcsWifEnterpriseMessage,
    },
  ],
  layout: [{ fields: ["enterprise_info"] }],
};

export default gcsWifProvider;
