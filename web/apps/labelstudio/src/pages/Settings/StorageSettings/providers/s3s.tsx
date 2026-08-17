import { EnterpriseBadge, Message } from "@humansignal/ui";
import { useTranslation } from "react-i18next";
import i18next from "i18next";
import { IconCloudProviderS3 } from "@humansignal/icons";
import type { ProviderConfig } from "@humansignal/app-common/blocks/StorageProviderForm/types/provider";

const S3sEnterpriseMessage = () => {
  const { t } = useTranslation();

  return (
    <Message variant="enterprise" title={t("settings:enterpriseFeatureTitle")}>
      {t("settings:s3sEnterpriseMsg")}{" "}
      <a
        href="https://docs.humansignal.com/guide/storage.html#Set-up-an-S3-connection-with-IAM-role-access"
        target="_blank"
        rel="noopener noreferrer"
        className="underline hover:no-underline"
      >
        {t("settings:learnMore")}
      </a>
    </Message>
  );
};

const s3sProvider: ProviderConfig = {
  name: "s3s",
  get title() {
    return i18next.t("settings:s3sProviderTitle");
  },
  get description() {
    return i18next.t("settings:s3sProviderDesc");
  },
  icon: IconCloudProviderS3,
  disabled: true,
  badge: <EnterpriseBadge />,
  fields: [
    {
      name: "enterprise_info",
      type: "message",
      content: S3sEnterpriseMessage,
    },
  ],
  layout: [{ fields: ["enterprise_info"] }],
};

export default s3sProvider;
