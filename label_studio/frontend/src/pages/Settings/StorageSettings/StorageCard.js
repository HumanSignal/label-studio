import { useCallback, useContext, useEffect, useState } from "react";
import { FaEllipsisV } from "react-icons/fa";
import { Button, Card, Dropdown, Menu } from "../../../components";
import { Space } from "../../../components/Space/Space";
import { ApiContext } from "../../../providers/ApiProvider";
import { StorageSummary } from "./StorageSummary";

export const StorageCard = ({rootClass, target, storage, onEditStorage, onDeleteStorage}) => {
  const [syncing, setSyncing] = useState(false);
  const api = useContext(ApiContext);
  const [storageData, setStorageData] = useState({...storage});
  const [synced, setSynced] = useState(null);

  const startSync = useCallback(async () => {
    setSyncing(true);
    setSynced(null);

    const result = await api.callApi('syncStorage', {
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

  return (
    <Card
      header={storageData.title ?? `Untitled ${storageData.type}`}
      extra={(
        <Dropdown.Trigger align="right" content={(
          <Menu size="compact" style={{width: 110}}>
            <Menu.Item onClick={() => onEditStorage(storageData)}>Edit</Menu.Item>
            <Menu.Item onClick={() => onDeleteStorage(storageData)}>Delete</Menu.Item>
          </Menu>
        )}>
          <Button type="link" style={{width: 32, height: 32, marginRight: -10}} icon={<FaEllipsisV/>}/>
        </Dropdown.Trigger>
      )}
    >
      <StorageSummary
        storage={storageData}
        enableLastSync={target !== 'export'}
        className={rootClass.elem('summary')}
      />

      {target !== 'export' && (
        <div className={rootClass.elem('sync')}>
          <Space size="small">
            <Button waiting={syncing} onClick={startSync}>
              Sync Storage
            </Button>

            {synced !== null ? (
              <div className={rootClass.elem('sync-count')}>
                Synced {synced} task(s)
              </div>
            ) : null}
          </Space>
        </div>
      )}
    </Card>
  );
};
