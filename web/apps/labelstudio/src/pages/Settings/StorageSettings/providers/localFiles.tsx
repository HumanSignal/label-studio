import { z } from "zod";
import { useTranslation } from "react-i18next";
import i18next from "i18next";
import type { ProviderConfig } from "@humansignal/app-common/blocks/StorageProviderForm/types/provider";
import { IconFolderOpen } from "@humansignal/icons";
import { Message } from "@humansignal/ui";

const localFilesDocumentRoot =
  typeof window === "undefined" ? undefined : window.APP_SETTINGS?.local_files_document_root;
const localFilesServingEnabled =
  typeof window === "undefined" ? true : window.APP_SETTINGS?.local_files_serving_enabled !== false;
const isCommunityEdition =
  typeof window === "undefined" ? false : window.APP_SETTINGS?.version?.edition === "Community";
const trimTrailingSeparators = (value?: string) => value?.replace(/[/\\]+$/, "");
const defaultPathExample = localFilesDocumentRoot
  ? `${trimTrailingSeparators(localFilesDocumentRoot)}/your-subdirectory`
  : undefined;

const buildPathSchema = () =>
  defaultPathExample
    ? z.string().min(1, i18next.t("settings:pathRequiredError")).default(defaultPathExample)
    : z.string().min(1, i18next.t("settings:pathRequiredError"));

const LocalFilesServingWarning = () => {
  const { t } = useTranslation();

  if (localFilesServingEnabled) return null;
  return (
    <>
      <Message variant="negative" title={t("settings:localServingDisabledTitle")}>
        {t("settings:localServingDisabledMsg")}{" "}
        <a href="https://labelstud.io/guide/storage.html#Local-storage" target="_blank" rel="noreferrer">
          {t("settings:localStorageDocsLink")}
        </a>
      </Message>
      {isCommunityEdition && (
        <Message variant="primary" className="mt-tight">
          {t("settings:localFilesTip")}
        </Message>
      )}
    </>
  );
};

export const localFilesProvider: ProviderConfig = {
  name: "localfiles",
  get title() {
    return i18next.t("settings:localFilesProviderTitle");
  },
  get description() {
    return i18next.t("settings:localFilesProviderDesc");
  },
  icon: () => (
    <IconFolderOpen
      width={40}
      height={40}
      style={{
        color: "var(--color-accent-canteloupe-base)",
        filter: "drop-shadow(0px 0px 12px var(--color-accent-canteloupe-base))",
      }}
    />
  ),
  fields: [
    {
      name: "serving_warning",
      type: "message",
      content: LocalFilesServingWarning,
    },
    {
      name: "path",
      type: "text",
      get label() {
        return i18next.t("settings:absoluteLocalPathLabel");
      },
      required: true,
      placeholder: defaultPathExample || "/data/my-folder/subdirectory",
      get schema() {
        return buildPathSchema();
      },
      defaultValue: defaultPathExample,
      get description() {
        return i18next.t("settings:localPathDescription", { root: localFilesDocumentRoot });
      },
    },
  ],
  layout: [{ fields: ["serving_warning"] }, { fields: ["path"] }],
};

export default localFilesProvider;
