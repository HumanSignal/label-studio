import { useCallback, useContext, useEffect, useState } from "react";
import { FaEllipsisV } from "react-icons/fa";
import { Button, Card, Dropdown, Menu } from "../../../components";
import { ApiContext } from "../../../providers/ApiProvider";
import { StorageSummary } from "./StorageSummary";

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
      header={storageData.title?.slice?.(0, 70) ?? `Untitled ${storageData.type}`}
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
          <Button type="link" style={{ width: 32, height: 32, marginRight: -10 }} icon={<FaEllipsisV />} />
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
        <div>
          <Button waiting={syncing} onClick={startSync} disabled={notSyncedYet}>
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
