import { useCallback, useContext, useEffect, useState } from "react";
import { Button, Badge } from "@humansignal/ui";
import {
  IconSettings,
  IconTrash,
  IconSync,
  IconClock,
  IconCloudProviderS3,
  IconCloudProviderGCS,
  IconCloudProviderAzure,
  IconCloudProviderRedis,
  IconWarning,
  IconReload,
  IconFolderOpen,
} from "@humansignal/icons";
import { ApiContext } from "../../../providers/ApiProvider";
import { formatDistanceToNow } from "date-fns";

const getStorageIcon = (type) => {
  const iconMap = {
    s3: IconCloudProviderS3,
    s3s: IconCloudProviderS3,
    gcs: IconCloudProviderGCS,
    azure: IconCloudProviderAzure,
    redis: IconCloudProviderRedis,
    localfiles: IconFolderOpen,
  };
  return iconMap[type] || IconCloudProviderS3;
};

const getStatusColor = (status) => {
  const statusLower = status?.toLowerCase() || "";
  if (statusLower.includes("error") || statusLower.includes("failed")) {
    return "negative";
  }
  if (statusLower.includes("connected") || statusLower.includes("completed")) {
    return "positive";
  }
  return "neutral";
};

const getStatusLabel = (status) => {
  const statusLower = status?.toLowerCase() || "";
  if (statusLower.includes("error") || statusLower.includes("failed")) {
    return "Error";
  }
  if (statusLower.includes("connected") || statusLower.includes("completed")) {
    return "Connected";
  }
  return status?.replace(/_/g, " ") || "Unknown";
};

export const StorageConnectionCard = ({
  storage,
  target,
  storageTypes = [],
  onEditStorage,
  onDeleteStorage,
  rootClass,
}) => {
  const [syncing, setSyncing] = useState(false);
  const api = useContext(ApiContext);
  const [storageData, setStorageData] = useState({ ...storage });
  const [synced, setSynced] = useState(null);

  const startSync = useCallback(async () => {
    setSyncing(true);
    setSynced(null);

    const result = await api.callApi("syncStorage", {
      params: {
        target,
        type: storageData.type,
        pk: storageData.id,
      },
    });

    if (result) {
      setStorageData(result);
      setSynced(result.last_sync_count);
    }

    setSyncing(false);
  }, [storageData, target, api]);

  useEffect(() => {
    setStorageData(storage);
  }, [storage]);

  const StorageIcon = getStorageIcon(storageData.type);
  const storageTypeTitle =
    (storageTypes ?? []).find((s) => s.name === storageData.type)?.title ?? storageData.type;
  const status = storageData.status?.replace(/_/g, " ") || "Unknown";
  const statusColor = getStatusColor(storageData.status);
  const statusLabel = getStatusLabel(storageData.status);

  const lastSyncCount = storageData.last_sync_count || 0;
  const tasksExisted =
    typeof storageData.meta?.tasks_existed !== "undefined" && storageData.meta?.tasks_existed !== null
      ? storageData.meta.tasks_existed
      : 0;
  const totalFiles = target === "export" ? lastSyncCount : lastSyncCount + tasksExisted;

  const lastSyncTime = storageData.last_sync
    ? formatDistanceToNow(new Date(storageData.last_sync), { addSuffix: true })
    : "Never";

  const isSynced = storageData.status === "completed" && !syncing;
  const isError = statusColor === "negative";
  const notSyncedYet = synced !== null || ["in_progress", "queued"].includes(storageData.status);

  const getDescription = () => {
    if (storageData.type === "s3" || storageData.type === "s3s") {
      return "Integrate with AWS S3 or S3-compatible object storage.";
    }
    if (storageData.type === "gcs") {
      return "Integrate with Google Cloud Storage.";
    }
    if (storageData.type === "azure") {
      return "Integrate with Azure Blob Storage.";
    }
    if (storageData.type === "redis") {
      return "Integrate with Redis storage.";
    }
    if (storageData.type === "localfiles") {
      return "Transfer files securely using standard FTP/SFTP protocols.";
    }
    return "Cloud storage connection.";
  };

  return (
    <div className="border border-neutral-border rounded-[10px] bg-neutral-background p-base flex flex-col gap-base h-full">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-base flex-1 min-w-0">
          <div className="size-10 flex items-center justify-center flex-shrink-0">
            <StorageIcon className="size-10" />
          </div>
          <div className="flex-1 min-w-0 grid grid-cols-2 gap-2 items-center">
            <div className="min-w-0">
              <h3 className="font-semibold text-neutral-content text-body-regular truncate mb-1">
                {storageData.title ?? `Untitled ${storageData.type}`}
              </h3>
              <Badge variant="outline" shape="rounded" className="text-body-small px-2 py-0.5">
                {storageTypeTitle}
              </Badge>
            </div>
            <div className="flex justify-center">
              {!isError && (
                <Badge
                  variant="success"
                  shape="rounded"
                  className="text-body-small px-2 py-0.5 flex items-center gap-1 bg-positive-background text-positive-content"
                >
                  <span className="size-1.5 rounded-full bg-positive-content" />
                  {statusLabel}
                </Badge>
              )}
              {isError && (
                <Badge
                  variant="destructive"
                  shape="rounded"
                  className="text-body-small px-2 py-0.5 flex items-center gap-1"
                >
                  <IconWarning className="size-3" />
                  {statusLabel}
                </Badge>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          <Button
            look="string"
            variant="neutral"
            size="small"
            onClick={() => onEditStorage(storageData)}
            className="size-8 p-0 text-neutral-content"
            aria-label="Edit storage"
          >
            <IconSettings className="size-4" />
          </Button>
          <Button
            look="string"
            variant="neutral"
            size="small"
            onClick={() => onDeleteStorage(storageData)}
            className="size-8 p-0 text-neutral-content"
            aria-label="Delete storage"
          >
            <IconTrash className="size-4" />
          </Button>
        </div>
      </div>

      <div className="flex-1 flex flex-col justify-between">
        <p className="text-neutral-content-subtle text-body-small">{getDescription()}</p>

        <div className="flex items-center gap-base text-neutral-content-subtle text-body-small">
          <div className="flex items-center gap-1">
            <IconFolderOpen className="size-4" />
            <span>{totalFiles} files</span>
          </div>
          <div className="flex items-center gap-1">
            <IconClock className="size-4" />
            <span>{lastSyncTime}</span>
          </div>
        </div>
      </div>

      <div className="mt-auto">
        {isError ? (
          <Button
            look="primary"
            variant="primary"
            onClick={startSync}
            waiting={syncing}
            disabled={notSyncedYet}
            className="w-full rounded-[10px] h-[41px]"
            aria-label="Reconnect storage"
          >
            <IconReload className="size-4 mr-1.5" />
            Reconnect
          </Button>
        ) : isSynced ? (
          <Button
            look="outlined"
            variant="neutral"
            disabled
            className="w-full rounded-[10px] h-[41px]"
            aria-label="Synced"
          >
            <IconSync className="size-4 mr-1.5" />
            Synced
          </Button>
        ) : (
          <Button
            look="primary"
            variant="primary"
            onClick={startSync}
            waiting={syncing}
            disabled={notSyncedYet}
            className="w-full rounded-[10px] h-[41px]"
            aria-label="Sync storage"
          >
            <IconSync className="size-4 mr-1.5" />
            Sync Now
          </Button>
        )}
      </div>
    </div>
  );
};

