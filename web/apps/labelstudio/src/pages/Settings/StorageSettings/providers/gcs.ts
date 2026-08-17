import { z } from "zod";
import i18next from "i18next";
import type { ProviderConfig } from "@humansignal/app-common/blocks/StorageProviderForm/types/provider";
import { IconCloudProviderGCS } from "@humansignal/icons";

export const gcsProvider: ProviderConfig = {
  name: "gcs",
  get title() {
    return i18next.t("dataManager:storageGoogleCloud");
  },
  get description() {
    return i18next.t("settings:gcsProviderDesc");
  },
  icon: IconCloudProviderGCS,
  fields: [
    {
      name: "bucket",
      type: "text",
      get label() {
        return i18next.t("settings:bucketNameLabel");
      },
      required: true,
      get schema() {
        return z.string().min(1, i18next.t("settings:bucketNameRequired"));
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
      name: "google_application_credentials",
      type: "password",
      get label() {
        return i18next.t("settings:googleCredentialsLabel");
      },
      get description() {
        return i18next.t("settings:googleCredentialsDescription");
      },
      autoComplete: "new-password",
      accessKey: true,
      schema: z.string().optional().default(""), // JSON validation could be added if needed
    },
    {
      name: "google_project_id",
      type: "text",
      get label() {
        return i18next.t("settings:googleProjectIdLabel");
      },
      get description() {
        return i18next.t("settings:googleProjectIdDescription");
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
    { fields: ["bucket"] },
    { fields: ["prefix"] },
    { fields: ["google_application_credentials"] },
    { fields: ["google_project_id"] },
    { fields: ["presign", "presign_ttl"] },
  ],
};

export default gcsProvider;
