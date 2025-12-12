import {
  Button,
  EmptyState,
  IconCloudCustom,
  IconCloudProviderAzure,
  IconCloudProviderGCS,
  IconCloudProviderRedis,
  IconCloudProviderS3,
  IconExternal,
  Pagination,
  SimpleCard,
  Tooltip,
  Typography,
} from "@humansignal/ui";
import { StorageConnectionCard } from "./StorageConnectionCard";
import { cn } from "../../../utils/bem";

export const StorageList = ({
  storages,
  storageTypes,
  currentPage,
  totalPages,
  totalItems,
  pageSize,
  onPageChange,
  onEditStorage,
  onDeleteStorage,
  onAddSource,
  onAddTarget,
  rootClass,
}) => {
  if (storages.length === 0) {
    return (
      <SimpleCard title="" className="bg-primary-background border-primary-border-subtler p-base">
        <EmptyState
          size="medium"
          variant="primary"
          icon={<IconCloudCustom />}
          title="Add your first cloud storage"
          description="Use cloud or database storage as the source for your labeling tasks or the target of your completed annotations."
          additionalContent={
            <div className="flex items-center justify-center gap-base" data-testid="dm-storage-provider-icons">
              <Tooltip title="Amazon S3">
                <div className="flex items-center justify-center p-2" aria-label="Amazon S3">
                  <IconCloudProviderS3 width={32} height={32} className="text-neutral-content-subtler" />
                </div>
              </Tooltip>
              <Tooltip title="Google Cloud Storage">
                <div className="flex items-center justify-center p-2" aria-label="Google Cloud Storage">
                  <IconCloudProviderGCS width={32} height={32} className="text-neutral-content-subtler" />
                </div>
              </Tooltip>
              <Tooltip title="Azure Blob Storage">
                <div className="flex items-center justify-center p-2" aria-label="Azure Blob Storage">
                  <IconCloudProviderAzure width={32} height={32} className="text-neutral-content-subtler" />
                </div>
              </Tooltip>
              <Tooltip title="Redis Storage">
                <div className="flex items-center justify-center p-2" aria-label="Redis Storage">
                  <IconCloudProviderRedis width={32} height={32} className="text-neutral-content-subtler" />
                </div>
              </Tooltip>
            </div>
          }
          actions={
            <div className="flex gap-base">
              <Button
                look="primary"
                data-testid="add-source-storage-button-empty-state"
                aria-label="Add Source Storage"
                onClick={onAddSource}
              >
                Add Source Storage
              </Button>
              <Button
                look="primary"
                data-testid="add-target-storage-button-empty-state"
                aria-label="Add Target Storage"
                onClick={onAddTarget}
              >
                Add Target Storage
              </Button>
            </div>
          }
          footer={
            !window.APP_SETTINGS?.whitelabel_is_active && (
              <Typography variant="label" size="small" className="text-primary-link">
                <a
                  href="https://docs.humansignal.com/guide/storage"
                  target="_blank"
                  rel="noopener noreferrer"
                  data-testid="storage-help-link"
                  aria-label="Learn more about cloud storage (opens in new window)"
                  className="inline-flex items-center gap-1 hover:underline"
                >
                  Learn more
                  <IconExternal width={16} height={16} />
                </a>
              </Typography>
            )
          }
        />
      </SimpleCard>
    );
  }

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-base mb-wider">
        {storages.map((storage) => (
          <StorageConnectionCard
            key={`${storage.target}-${storage.id}`}
            storage={storage}
            target={storage.target}
            storageTypes={storageTypes}
            onEditStorage={onEditStorage}
            onDeleteStorage={onDeleteStorage}
            rootClass={rootClass}
          />
        ))}
      </div>

      {totalPages > 1 && (
        <div className="flex justify-end mt-wider">
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={totalItems}
            pageSize={pageSize}
            onPageChange={onPageChange}
            allowRewind={false}
          />
        </div>
      )}
    </>
  );
};

