import { formatDistanceToNow, format, parseISO } from "date-fns";
import { useCallback, useContext } from "react";
import { useTranslation } from "react-i18next";

import truncate from "truncate-middle";
import { Menu } from "../../../components";
import { Button, Dropdown } from "@humansignal/ui";
import { confirm } from "../../../components/Modal/Modal";
import { Oneof } from "../../../components/Oneof/Oneof";
import { IconEllipsis } from "@humansignal/icons";
import { Tooltip } from "@humansignal/ui";
import { ApiContext } from "../../../providers/ApiProvider";
import { cn } from "../../../utils/bem";

import "./MachineLearningList.prefix.css";

export const MachineLearningList = ({ backends, fetchBackends, onEdit, onTestRequest, onStartTraining }) => {
  const api = useContext(ApiContext);

  const onDeleteModel = useCallback(
    async (backend) => {
      await api.callApi("deleteMLBackend", {
        params: {
          pk: backend.id,
        },
      });
      await fetchBackends();
    },
    [fetchBackends, api],
  );

  return (
    <div>
      {backends.map((backend) => (
        <BackendCard
          key={backend.id}
          backend={backend}
          onStartTrain={onStartTraining}
          onDelete={onDeleteModel}
          onEdit={onEdit}
          onTestRequest={onTestRequest}
        />
      ))}
    </div>
  );
};

const BackendCard = ({ backend, onStartTrain, onEdit, onDelete, onTestRequest }) => {
  const { t } = useTranslation();

  const confirmDelete = useCallback(
    (backend) => {
      confirm({
        title: t("settings:deleteMlBackendTitle"),
        body: t("settings:cannotBeUndoneConfirm"),
        buttonLook: "destructive",
        onOk() {
          onDelete?.(backend);
        },
      });
    },
    [backend, onDelete, t],
  );

  const rootClass = cn("backend-card");

  return (
    <div className={rootClass.toClassName()}>
      <div className={rootClass.elem("title-container").toClassName()}>
        <div>
          <BackendState backend={backend} />
          <div className={rootClass.elem("title").toClassName()}>{backend.title}</div>
        </div>

        <div className={rootClass.elem("menu").toClassName()}>
          <Dropdown.Trigger
            align="right"
            content={
              <Menu size="medium" contextual>
                <Menu.Item onClick={() => onEdit(backend)}>{t("settings:editMenuItem")}</Menu.Item>
                <Menu.Item onClick={() => onTestRequest(backend)}>{t("settings:sendTestRequestMenuItem")}</Menu.Item>
                <Menu.Item onClick={() => onStartTrain(backend)}>{t("settings:startTrainingMenuItem")}</Menu.Item>
                <Menu.Divider />
                <Menu.Item onClick={() => confirmDelete(backend)} isDangerous>
                  {t("settings:deleteMenuItem")}
                </Menu.Item>
              </Menu>
            }
          >
            <Button look="string" size="small" className="!p-0" aria-label={t("settings:mlModelOptionsAria")}>
              <IconEllipsis />
            </Button>
          </Dropdown.Trigger>
        </div>
      </div>

      <div className={rootClass.elem("meta").toClassName()}>
        <div className={rootClass.elem("group").toClassName()}>{truncate(backend.url, 20, 10, "...")}</div>
        <div className={rootClass.elem("group").toClassName()}>
          <Tooltip title={format(parseISO(backend.created_at), "yyyy-MM-dd HH:mm:ss")}>
            <span>
              {t("settings:createdAgo", {
                time: formatDistanceToNow(parseISO(backend.created_at), {
                  addSuffix: true,
                }),
              })}
            </span>
          </Tooltip>
        </div>
      </div>
    </div>
  );
};

const BackendState = ({ backend }) => {
  const { state } = backend;
  const { t } = useTranslation();

  return (
    <div className={cn("ml").elem("status").toClassName()}>
      <span className={cn("ml").elem("indicator").mod({ state }).toClassName()} />
      <Oneof value={state} className={cn("ml").elem("status-label").toClassName()}>
        <span case="DI">{t("settings:mlStateDisconnected")}</span>
        <span case="CO">{t("settings:mlStateConnected")}</span>
        <span case="ER">{t("settings:mlStateError")}</span>
        <span case="TR">{t("settings:mlStateTraining")}</span>
        <span case="PR">{t("settings:mlStatePredicting")}</span>
      </Oneof>
    </div>
  );
};
