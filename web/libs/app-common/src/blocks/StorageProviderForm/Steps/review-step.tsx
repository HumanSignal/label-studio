interface ReviewStepProps {
  formData: any;
  filesPreview?: any;
  formatSize?: (bytes: number) => string;
}

export const ReviewStep = ({ formData, filesPreview, formatSize }: ReviewStepProps) => {
  const getProviderDisplayName = (provider: string) => {
    const providerMap: Record<string, string> = {
      s3: "Amazon S3",
      gcp: "Google Cloud Storage",
      azure: "Azure Blob Storage",
      redis: "Redis",
      localfiles: "Local Files",
    };
    return providerMap[provider] || provider;
  };

  const getBucketName = () => {
    return formData.bucket || formData.container || "Not specified";
  };

  const getFileCount = () => {
    if (!filesPreview) return "0 files";

    // Check if the last file is the "preview limit reached" indicator
    const lastFile = filesPreview[filesPreview.length - 1];
    const hasMoreFiles = lastFile && lastFile.key === null;

    if (hasMoreFiles) {
      // Subtract 1 to exclude the placeholder file
      const visibleFileCount = filesPreview.length - 1;
      return `More than ${visibleFileCount} files`;
    }

    return `${filesPreview.length} files`;
  };

  const getTotalSize = () => {
    if (!filesPreview || !formatSize) return "0 Bytes";

    // Check if the last file is the "preview limit reached" indicator
    const lastFile = filesPreview[filesPreview.length - 1];
    const hasMoreFiles = lastFile && lastFile.key === null;

    // Calculate total size excluding the placeholder file if it exists
    const filesToCount = hasMoreFiles ? filesPreview.slice(0, -1) : filesPreview;
    const totalBytes = filesToCount.reduce((sum: number, file: any) => sum + (file.size || 0), 0);

    if (hasMoreFiles) {
      return `More than ${formatSize(totalBytes)}`;
    }

    return formatSize(totalBytes);
  };

  return (
    <div>
      <div className="border-b pb-base mb-wide">
        <h2 className="text-2xl font-bold text-gray-900">Ready to Connect</h2>
        <p className="text-gray-600 mt-tighter">Review your connection details and confirm to start importing</p>
      </div>

      {/* Connection Details Section */}
      <div className="grid grid-cols-2 gap-y-base mb-wider">
        <div>
          <p className="text-sm text-gray-500">Provider</p>
          <p className="font-medium">{getProviderDisplayName(formData.provider)}</p>
        </div>

        <div>
          <p className="text-sm text-gray-500">Storage Location</p>
          <p className="font-medium">{getBucketName()}</p>
        </div>

        {formData.prefix && (
          <div>
            <p className="text-sm text-gray-500">Prefix</p>
            <p className="font-medium">{formData.prefix}</p>
          </div>
        )}

        {filesPreview && (
          <>
            <div>
              <p className="text-sm text-gray-500">Files to import</p>
              <p className="font-medium">{getFileCount()}</p>
            </div>

            <div>
              <p className="text-sm text-gray-500">Total size</p>
              <p className="font-medium">{getTotalSize()}</p>
            </div>
          </>
        )}
      </div>

      {/* Import Process Section */}
      <div className="bg-primary-background border border-primary-border-subtler rounded-small p-base mb-wider">
        <h3 className="text-lg font-semibold mb-tight">Import Process</h3>
        <p>Files will be imported in the background. You can continue working while the import is in progress.</p>
      </div>
    </div>
  );
};
