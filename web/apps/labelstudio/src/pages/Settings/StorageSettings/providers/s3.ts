import { z } from "zod";
import i18next from "i18next";
import type { ProviderConfig } from "@humansignal/app-common/blocks/StorageProviderForm/types/provider";
import { IconCloudProviderS3 } from "@humansignal/icons";

export const s3Provider: ProviderConfig = {
  name: "s3",
  get title() {
    return i18next.t("dataManager:storageAmazonS3");
  },
  get description() {
    return i18next.t("settings:s3ProviderDesc");
  },
  icon: IconCloudProviderS3,
  fields: [
    {
      name: "bucket",
      type: "text",
      get label() {
        return i18next.t("settings:bucketNameLabel");
      },
      required: true,
      placeholder: "my-storage-bucket",
      get schema() {
        return z.string().min(1, i18next.t("settings:bucketNameRequired"));
      },
    },
    {
      name: "region_name",
      type: "text",
      get label() {
        return i18next.t("settings:regionNameLabel");
      },
      get placeholder() {
        return i18next.t("settings:regionNamePlaceholder");
      },
      schema: z.string().optional().default(""),
    },
    {
      name: "s3_endpoint",
      type: "text",
      get label() {
        return i18next.t("settings:s3EndpointLabel");
      },
      get placeholder() {
        return i18next.t("settings:s3EndpointPlaceholder");
      },
      schema: z.string().optional().default(""),
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
      name: "aws_access_key_id",
      type: "password",
      get label() {
        return i18next.t("settings:accessKeyIdLabel");
      },
      required: true,
      placeholder: "AKIAIOSFODNN7EXAMPLE",
      autoComplete: "off",
      accessKey: true,
      get schema() {
        return z.string().min(1, i18next.t("settings:accessKeyIdRequired"));
      },
    },
    {
      name: "aws_secret_access_key",
      type: "password",
      get label() {
        return i18next.t("settings:secretAccessKeyLabel");
      },
      required: true,
      placeholder: "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY",
      autoComplete: "new-password",
      accessKey: true,
      get schema() {
        return z.string().min(1, i18next.t("settings:secretAccessKeyRequired"));
      },
    },
    {
      name: "aws_session_token",
      type: "password",
      get label() {
        return i18next.t("settings:sessionTokenLabel");
      },
      get placeholder() {
        return i18next.t("settings:sessionTokenPlaceholder");
      },
      autoComplete: "new-password",
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
    { fields: ["region_name"] },
    { fields: ["s3_endpoint"] },
    { fields: ["prefix"] },
    { fields: ["aws_access_key_id"] },
    { fields: ["aws_secret_access_key"] },
    { fields: ["aws_session_token"] },
    { fields: ["presign", "presign_ttl"] },
  ],
};
