import { EnterpriseBadge, Message } from "@humansignal/ui";
import { IconCloudProviderGCS } from "@humansignal/icons";
import type { ProviderConfig } from "@humansignal/app-common/blocks/StorageProviderForm/types/provider";

const gcsWifProvider: ProviderConfig = {
  name: "gcswif",
  title: "Google Cloud Storage\n(WIF Auth)",
  description:
    "Configure your Google Cloud Storage connection with Workload Identity Federation authentication (proxy only)",
  icon: IconCloudProviderGCS,
  disabled: true,
  badge: <EnterpriseBadge />,
  fields: [
    {
      name: "enterprise_info",
      type: "message",
      content: (
        <Message variant="enterprise" title="Enterprise Feature">
          Google Cloud Storage with Workload Identity Federation is available in Label Studio Enterprise.{" "}
          <a
            href="https://docs.humansignal.com/guide/storage.html#Google-Cloud-Storage-with-Workload-Identity-Federation-WIF"
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

export default gcsWifProvider;
