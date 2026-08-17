import { useMemo, useState } from "react";
import { useHistory } from "react-router";
import { Trans, useTranslation } from "react-i18next";
import i18next from "i18next";
import { Button, Typography, useToast } from "@humansignal/ui";
import { useUpdatePageTitle, createTitleFromSegments } from "@humansignal/core";
import { Label } from "../../components/Form";
import { modal } from "../../components/Modal/Modal";
import { useModalControls } from "../../components/Modal/ModalPopup";
import Input from "../../components/Form/Elements/Input/Input";
import { Space } from "../../components/Space/Space";
import { Spinner } from "../../components/Spinner/Spinner";
import { useAPI } from "../../providers/ApiProvider";
import { useProject } from "../../providers/ProjectProvider";
import { cn } from "../../utils/bem";

export const DangerZone = () => {
  const { project } = useProject();
  const api = useAPI();
  const history = useHistory();
  const toast = useToast();
  const { t } = useTranslation();
  const [processing, setProcessing] = useState(null);

  useUpdatePageTitle(createTitleFromSegments([project?.title, t("settings:dangerZonePageTitle")]));

  const showDangerConfirmation = ({ title, message, requiredWord, buttonText, onConfirm }) => {
    const isDev = process.env.NODE_ENV === "development";

    return modal({
      title,
      width: 600,
      allowClose: false,
      body: () => {
        const ctrl = useModalControls();
        const inputValue = ctrl?.state?.inputValue || "";

        return (
          <div>
            <Typography variant="body" size="medium" className="mb-tight">
              {message}
            </Typography>
            <Input
              label={t("settings:typeWordToProceed", { word: requiredWord })}
              value={inputValue}
              onChange={(e) => ctrl?.setState({ inputValue: e.target.value })}
              autoFocus
              data-testid="danger-zone-confirmation-input"
              autoComplete="off"
            />
          </div>
        );
      },
      footer: () => {
        const ctrl = useModalControls();
        const inputValue = (ctrl?.state?.inputValue || "").trim().toLowerCase();
        const isValid = isDev || inputValue === requiredWord.toLowerCase();

        return (
          <Space align="end">
            <Button
              variant="neutral"
              look="outline"
              onClick={() => ctrl?.hide()}
              data-testid="danger-zone-cancel-button"
            >
              {t("settings:cancelButton")}
            </Button>
            <Button
              variant="negative"
              disabled={!isValid}
              onClick={async () => {
                await onConfirm();
                ctrl?.hide();
              }}
              data-testid="danger-zone-confirm-button"
            >
              {buttonText}
            </Button>
          </Space>
        );
      },
    });
  };

  const handleOnClick = (type) => () => {
    // Confirmation words stay in English on purpose: users must type them
    // exactly, and translating them would complicate IME input.
    const actionConfig = {
      reset_cache: {
        title: t("settings:resetCacheTitle"),
        message: (
          <Trans
            i18nKey="settings:resetCacheConfirmMsg"
            values={{ title: project.title }}
            components={{ strong: <strong /> }}
          />
        ),
        requiredWord: "cache",
        buttonText: t("settings:resetCacheTitle"),
      },
      tabs: {
        title: t("settings:dropAllTabsTitle"),
        message: (
          <Trans
            i18nKey="settings:dropAllTabsConfirmMsg"
            values={{ title: project.title }}
            components={{ strong: <strong /> }}
          />
        ),
        requiredWord: "tabs",
        buttonText: t("settings:dropAllTabsTitle"),
      },
      project: {
        title: t("settings:deleteProjectTitle"),
        message: (
          <Trans
            i18nKey="settings:deleteProjectConfirmMsg"
            values={{ title: project.title }}
            components={{ strong: <strong /> }}
          />
        ),
        requiredWord: "delete",
        buttonText: t("settings:deleteProjectTitle"),
      },
    };

    const config = actionConfig[type];

    if (!config) {
      return;
    }

    showDangerConfirmation({
      ...config,
      onConfirm: async () => {
        setProcessing(type);
        try {
          if (type === "reset_cache") {
            await api.callApi("projectResetCache", {
              params: {
                pk: project.id,
              },
            });
            toast.show({ message: t("settings:cacheResetSuccessToast") });
          } else if (type === "tabs") {
            await api.callApi("deleteTabs", {
              body: {
                project: project.id,
              },
            });
            toast.show({ message: t("settings:tabsDroppedSuccessToast") });
          } else if (type === "project") {
            await api.callApi("deleteProject", {
              params: {
                pk: project.id,
              },
            });
            toast.show({ message: t("settings:projectDeletedSuccessToast") });
            history.replace("/projects");
          }
        } catch (error) {
          toast.show({ message: t("settings:errorToast", { message: error.message }), type: "error" });
        } finally {
          setProcessing(null);
        }
      },
    });
  };

  const buttons = useMemo(
    () => [
      {
        type: "annotations",
        disabled: true, //&& !project.total_annotations_number,
        label: t("settings:deleteAnnotationsCount", { count: project.total_annotations_number }),
      },
      {
        type: "tasks",
        disabled: true, //&& !project.task_number,
        label: t("settings:deleteTasksCount", { count: project.task_number }),
      },
      {
        type: "predictions",
        disabled: true, //&& !project.total_predictions_number,
        label: t("settings:deletePredictionsCount", { count: project.total_predictions_number }),
      },
      {
        type: "reset_cache",
        help: t("settings:resetCacheHelp"),
        label: t("settings:resetCacheTitle"),
      },
      {
        type: "tabs",
        help: t("settings:dropAllTabsHelp"),
        label: t("settings:dropAllTabsTitle"),
      },
      {
        type: "project",
        help: t("settings:deleteProjectHelp"),
        label: t("settings:deleteProjectTitle"),
      },
    ],
    [project, t],
  );

  return (
    <div className={cn("simple-settings").toClassName()}>
      <Typography variant="headline" size="medium" className="mb-tighter">
        {t("settings:dangerZonePageTitle")}
      </Typography>
      <Typography variant="body" size="medium" className="text-neutral-content-subtler !mb-base">
        {t("settings:dangerZoneWarning")}
      </Typography>

      {project.id ? (
        <div style={{ marginTop: 16 }}>
          {buttons.map((btn) => {
            const waiting = processing === btn.type;
            const disabled = btn.disabled || (processing && !waiting);

            return (
              btn.disabled !== true && (
                <div className={cn("settings-wrapper").toClassName()} key={btn.type}>
                  <Typography variant="title" size="large">
                    {btn.label}
                  </Typography>
                  {btn.help && <Label description={btn.help} style={{ width: 600, display: "block" }} />}
                  <Button
                    key={btn.type}
                    variant="negative"
                    look="outlined"
                    disabled={disabled}
                    waiting={waiting}
                    onClick={handleOnClick(btn.type)}
                    style={{ marginTop: 16 }}
                  >
                    {btn.label}
                  </Button>
                </div>
              )
            );
          })}
        </div>
      ) : (
        <div style={{ display: "flex", justifyContent: "center", marginTop: 32 }}>
          <Spinner size={32} />
        </div>
      )}
    </div>
  );
};

// Route metadata is read by the routing/sidebar system outside of a React
// component, so it resolves through the shared i18next singleton lazily.
Object.defineProperty(DangerZone, "title", {
  get: () => i18next.t("settings:navDangerZone"),
});
DangerZone.path = "/danger-zone";
