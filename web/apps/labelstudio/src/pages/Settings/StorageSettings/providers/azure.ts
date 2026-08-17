import type { ProviderConfig } from "@humansignal/app-common/blocks/StorageProviderForm/types/provider";
import { IconCloudProviderAzure } from "@humansignal/icons";
import i18next from "i18next";
import { z } from "zod";

export const azureProvider: ProviderConfig = {
  name: "azure",
  get title() {
    return i18next.t("dataManager:storageAzureBlob");
  },
  get description() {
    return i18next.t("settings:azureProviderDesc");
  },
  icon: IconCloudProviderAzure,
  fields: [
    {
      name: "container",
      type: "text",
      get label() {
        return i18next.t("settings:containerNameLabel");
      },
      required: true,
      placeholder: "my-azure-container",
      get schema() {
        return z.string().min(1, i18next.t("settings:containerNameRequired"));
      },
    },
    {
      name: "prefix",
      type: "text",
      get label() {
        return i18next.t("settings:bucketPrefixLabel");
      },
      placeholder: "path/to/files",
      schema: z.string().optional().default(""),
      target: "export",
    },
    {
      name: "account_name",
      type: "password",
      get label() {
        return i18next.t("settings:accountNameLabel");
      },
      autoComplete: "off",
      accessKey: true,
      placeholder: "mystorageaccount",
      schema: z.string().optional().default(""),
    },
    {
      name: "account_key",
      type: "password",
      get label() {
        return i18next.t("settings:accountKeyLabel");
      },
      autoComplete: "new-password",
      accessKey: true,
      get placeholder() {
        return i18next.t("settings:accountKeyPlaceholder");
      },
      schema: z.string().optional().default(""),
    },
    {
      name: "presign",
      type: "toggle",
      get label() {
        return i18next.t("settings:presignLabel");
      },
      get description() {
        return i18next.t("settings:presignDescription");
      },
      schema: z.boolean().default(true),
      target: "import",
      resetConnection: false,
    },
    {
      name: "presign_ttl",
      type: "counter",
      get label() {
        return i18next.t("settings:presignTtlLabel");
      },
      min: 1,
      max: 10080,
      step: 1,
      schema: z.number().min(1).max(10080).default(15),
      target: "import",
      resetConnection: false,
      dependsOn: {
        field: "presign",
        value: true,
      },
    },
  ],
  layout: [
    { fields: ["container"] },
    { fields: ["prefix"] },
    { fields: ["account_name"] },
    { fields: ["account_key"] },
    { fields: ["presign", "presign_ttl"] },
  ],
};

export default azureProvider;
