import { getProviderConfig } from "../providers";

const PROTECTED_VALUE_PLACEHOLDER = "••••••••••••••••";

export const cleanStorageFormDataForSubmission = (data: any, isEditMode: boolean) => {
  if (!isEditMode) return data;

  const cleanedData = { ...data };
  const providerConfig = getProviderConfig(data.provider);
  const validFieldNames = new Set([
    "project",
    "provider",
    "title",
    "prefix",
    "path",
    "use_blob_urls",
    "regex_filter",
    "recursive_scan",
    "can_delete_objects",
    ...(providerConfig?.fields.map((field) => field.name) || []),
  ]);

  Object.keys(cleanedData).forEach((key) => {
    if (!validFieldNames.has(key)) {
      delete cleanedData[key];
    }
  });

  Object.keys(cleanedData).forEach((key) => {
    const field = providerConfig?.fields.find((candidate) => candidate.name === key);
    const isAccessKey = field?.type !== "message" && field?.accessKey;
    const isEmptyS3Credential = cleanedData[key] === "" && data.provider === "s3";

    if (
      isAccessKey &&
      !isEmptyS3Credential &&
      (cleanedData[key] === "" || cleanedData[key] === undefined || cleanedData[key] === PROTECTED_VALUE_PLACEHOLDER)
    ) {
      delete cleanedData[key];
    }
  });

  return cleanedData;
};
