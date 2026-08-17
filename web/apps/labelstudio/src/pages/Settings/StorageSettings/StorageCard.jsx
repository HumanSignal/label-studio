import { useCallback, useContext, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Card, Menu } from "../../../components";
import { Button, Dropdown } from "@humansignal/ui";
import { ApiContext } from "../../../providers/ApiProvider";
import { StorageSummary } from "./StorageSummary";
import { IconEllipsisVertical } from "@humansignal/icons";

export const StorageCard = ({ rootClass, target, storage, onEditStorage, onDeleteStorage, storageTypes }) => {
  const { t } = useTranslation();
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
      header={storageData.title ?? t("settings:untitledStorage", { type: storageData.type })}
      extra={
        <Dropdown.Trigger
          align="right"
          content={
            <Menu size="compact" style={{ width: 110 }}>
              <Menu.Item onClick={() => onEditStorage(storageData)}>{t("settings:editMenuItem")}</Menu.Item>
              <Menu.Item onClick={() => onDeleteStorage(storageData)}>{t("settings:deleteMenuItem")}</Menu.Item>
            </Menu>
          }
        >
          <Button look="string" className="-ml-3" aria-label={t("settings:storageOptionsAria")}>
            <IconEllipsisVertical />
          </Button>
        </Dropdown.Trigger>
      }
    >
      <StorageSummary
        target={target}
        storage={storageData}
        className={rootClass.elem("summary").toClassName()}
        storageTypes={storageTypes}
      />
      <div className={rootClass.elem("sync").toClassName()}>
        <div className="mt-base">
          <Button
            look="outlined"
            waiting={syncing}
            onClick={startSync}
            disabled={notSyncedYet}
            aria-label={t("settings:syncStorageButton")}
          >
            {t("settings:syncStorageButton")}
          </Button>
          {notSyncedYet && (
            <div className={rootClass.elem("sync-count").toClassName()}>{t("settings:syncingTakeTimeHint")}</div>
          )}
        </div>
      </div>
    </Card>
  );
};
