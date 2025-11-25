import { useCallback, useContext, useEffect, useState } from "react";
import { Card, Menu } from "../../../components";
import { Button, Dropdown } from "@humansignal/ui";
import { ApiContext } from "../../../providers/ApiProvider";
import { StorageSummary } from "./StorageSummary";
import { IconEllipsisVertical } from "@humansignal/icons";

export const StorageCard = ({ rootClass, target, storage, onEditStorage, onDeleteStorage, storageTypes }) => {
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
  }, [storage]);

  useEffect(() => {
    setStorageData(storage);
  }, [storage]);

  const notSyncedYet = synced !== null || ["in_progress", "queued"].includes(storageData.status);

  return (
    <Card
      header={storageData.title ?? `Untitled ${storageData.type}`}
      extra={
        <Dropdown.Trigger
          align="right"
          content={
            <Menu size="compact" style={{ width: 110 }}>
              <Menu.Item onClick={() => onEditStorage(storageData)}>Edit</Menu.Item>
              <Menu.Item onClick={() => onDeleteStorage(storageData)}>Delete</Menu.Item>
            </Menu>
          }
        >
          <Button look="string" className="-ml-3" aria-label="Storage options">
            <IconEllipsisVertical />
          </Button>
        </Dropdown.Trigger>
      }
    >
      <StorageSummary
        target={target}
        storage={storageData}
        className={rootClass.elem("summary")}
        storageTypes={storageTypes}
      />
      <div className={rootClass.elem("sync")}>
        <div className="mt-base">
          <Button
            look="outlined"
            waiting={syncing}
            onClick={startSync}
            disabled={notSyncedYet}
            aria-label="Sync Storage"
          >
            Sync Storage
          </Button>
          {notSyncedYet && (
            <div className={rootClass.elem("sync-count")}>
              Syncing may take some time, please refresh the page to see the current status.
            </div>
          )}
        </div>
      </div>
    </Card>
  );
};
