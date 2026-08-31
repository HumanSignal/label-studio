const STORAGE_URI_REGEX = /(["'])((s3|gs|azure-spi|azure-blob|dbx):\/\/[^"']+)\1/g;

/** Replace cloud storage URIs with presigned resolve proxy URLs. */
export function presignUrls(text: string, taskId: number): string {
  if (!taskId) return text;
  return text.replace(STORAGE_URI_REGEX, (_match, quote, url) => {
    return `${quote}/tasks/${taskId}/resolve/?fileuri=${btoa(url)}${quote}`;
  });
}
