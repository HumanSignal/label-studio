import { EnterpriseBadge, Message } from "@humansignal/ui";
import { IconCloudProviderDatabricks } from "@humansignal/icons";
import type { ProviderConfig } from "@humansignal/app-common/blocks/StorageProviderForm/types/provider";

const databricksProvider: ProviderConfig = {
  name: "databricks",
  title: "Databricks Files\n(UC Volumes)",
  description: "Configure your Databricks Unity Catalog Volumes connection with all required settings (proxy only)",
  icon: IconCloudProviderDatabricks,
  disabled: true,
  badge: <EnterpriseBadge />,
  fields: [
    {
      name: "enterprise_info",
      type: "message",
      content: (
        <Message variant="enterprise" title="Enterprise Feature">
          Databricks Files (UC Volumes) is available in Label Studio Enterprise.{" "}
          <a
            href="https://docs.humansignal.com/guide/storage.html#Databricks-Files-UC-Volumes"
            target="_blank"
            rel="noopener noreferrer"
            className="underline hover:no-underline"
          >
            Learn more
          </a>
        </Message>
      ),
    },
  ],
  layout: [{ fields: ["enterprise_info"] }],
};

export default databricksProvider;
