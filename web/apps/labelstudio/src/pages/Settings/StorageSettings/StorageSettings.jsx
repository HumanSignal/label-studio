import {
  Button,
  EmptyState,
  IconCloudCustom,
  IconCloudProviderAzure,
  IconCloudProviderGCS,
  IconCloudProviderRedis,
  IconCloudProviderS3,
  IconExternal,
  SimpleCard,
  Spinner,
  Tooltip,
  Typography,
} from "@humansignal/ui";
import { useEffect, useRef } from "react";
import { useHistory, useLocation } from "react-router-dom";
import { useUpdatePageTitle, createTitleFromSegments } from "@humansignal/core";
import { useProject } from "../../../providers/ProjectProvider";
import { cn } from "../../../utils/bem";
import { StorageSet } from "./StorageSet";
import { useStorageCard } from "./hooks/useStorageCard";
import "./StorageSettings.scss";

export const StorageSettings = () => {
  const { project } = useProject();
  const rootClass = cn("storage-settings"); // TODO: Remove in the next BEM cleanup
  const history = useHistory();
  const location = useLocation();
  const sourceStorageRef = useRef();
  const targetStorageRef = useRef();

  useUpdatePageTitle(createTitleFromSegments([project?.title, "Cloud Storage Settings"]));

  // Fetch storage data at parent level
  const sourceStorage = useStorageCard("", project?.id);
  const targetStorage = useStorageCard("export", project?.id);

  // Check if any storages exist
  const hasAnyStorages = sourceStorage.storages?.length > 0 || targetStorage.storages?.length > 0;
  const isLoading = sourceStorage.loading || targetStorage.loading;
  const isLoaded = sourceStorage.loaded && targetStorage.loaded;

  // Handle auto-open query parameter
  useEffect(() => {
    const urlParams = new URLSearchParams(location.search);
    if (urlParams.get("open") === "source" && isLoaded) {
      // Auto-trigger "Add Source Storage" modal
      setTimeout(() => {
        sourceStorageRef.current?.openAddModal();
      }, 100); // Small delay to ensure component is mounted

      // Clean URL by removing the query parameter
      history.replace(location.pathname);
    }
  }, [location, history, isLoaded]);

  return (
    <section className="max-w-[680px]">
      <Typography variant="headline" size="medium" className="mb-base">
        Cloud Storage
      </Typography>
      {hasAnyStorages && (
        <Typography size="small" className="text-neutral-content-subtler mb-wider">
          Use cloud or database storage as the source for your labeling tasks or the target of your completed
          annotations.
        </Typography>
      )}

      {isLoading && !isLoaded && (
        <div className="flex items-center justify-center h-[50rem]">
          <Spinner />
        </div>
      )}

      {/* Always render StorageSet components (hidden when showing EmptyState) so refs are populated */}
      <div className={!hasAnyStorages && isLoaded ? "hidden" : ""}>
        <div className="grid grid-cols-2 gap-8">
          <StorageSet
            ref={sourceStorageRef}
            title="Source Cloud Storage"
            buttonLabel="Add Source Storage"
            rootClass={rootClass}
            storageTypes={sourceStorage.storageTypes}
            storages={sourceStorage.storages}
            storagesLoaded={sourceStorage.storagesLoaded}
            loading={sourceStorage.loading}
            loaded={sourceStorage.loaded}
            fetchStorages={sourceStorage.fetchStorages}
          />

          <StorageSet
            ref={targetStorageRef}
            title="Target Cloud Storage"
            target="export"
            buttonLabel="Add Target Storage"
            rootClass={rootClass}
            storageTypes={targetStorage.storageTypes}
            storages={targetStorage.storages}
            storagesLoaded={targetStorage.storagesLoaded}
            loading={targetStorage.loading}
            loaded={targetStorage.loaded}
            fetchStorages={targetStorage.fetchStorages}
          />
        </div>
      </div>

      {/* Show EmptyState when no storages exist */}
      {!hasAnyStorages && isLoaded && !isLoading && (
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
                  onClick={() => sourceStorageRef.current?.openAddModal()}
                >
                  Add Source Storage
                </Button>
                <Button
                  look="primary"
                  data-testid="add-target-storage-button-empty-state"
                  aria-label="Add Target Storage"
                  onClick={() => targetStorageRef.current?.openAddModal()}
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
      )}
    </section>
  );
};

StorageSettings.title = "Cloud Storage";
StorageSettings.path = "/storage";
