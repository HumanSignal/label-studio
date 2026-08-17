import { z } from "zod";
import i18next from "i18next";
import type { ProviderConfig } from "@humansignal/app-common/blocks/StorageProviderForm/types/provider";
import { IconCloudProviderRedis } from "@humansignal/icons";

export const redisProvider: ProviderConfig = {
  name: "redis",
  get title() {
    return i18next.t("dataManager:storageRedis");
  },
  get description() {
    return i18next.t("settings:redisProviderDesc");
  },
  icon: IconCloudProviderRedis,
  fields: [
    {
      name: "db",
      type: "text",
      get label() {
        return i18next.t("settings:databaseNumberLabel");
      },
      placeholder: "1",
      schema: z.string().default("1"),
    },
    {
      name: "password",
      type: "password",
      get label() {
        return i18next.t("settings:passwordLabel");
      },
      autoComplete: "new-password",
      get placeholder() {
        return i18next.t("settings:redisPasswordPlaceholder");
      },
      schema: z.string().optional().default(""),
    },
    {
      name: "host",
      type: "text",
      get label() {
        return i18next.t("settings:hostLabel");
      },
      required: true,
      placeholder: "redis://example.com",
      get schema() {
        return z.string().min(1, i18next.t("settings:hostRequired"));
      },
    },
    {
      name: "port",
      type: "text",
      get label() {
        return i18next.t("settings:portLabel");
      },
      placeholder: "6379",
      schema: z.string().default("6379"),
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
  ],
  layout: [{ fields: ["host", "port", "db", "password"] }, { fields: ["prefix"] }],
};

export default redisProvider;
