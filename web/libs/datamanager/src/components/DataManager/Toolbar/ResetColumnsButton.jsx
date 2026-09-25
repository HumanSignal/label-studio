import { inject, observer } from "mobx-react";
import { FF_PROJECT_DM_COLUMN_DEFAULTS, isActive } from "@humansignal/core/lib/utils/feature-flags";
import { Button } from "@humansignal/ui";
import { captureExploreDefaultsFromTab } from "../../../stores/Tabs/project_column_defaults";
import { useSDK } from "../../../providers/SDKProvider";
import { Modal } from "../../Common/Modal/Modal";

const MANAGE_DEFAULTS_EVENT = "dataManagerSettingsClicked";
export const SAVE_AS_DEFAULT_EVENT = "saveColumnsAsProjectDefault";

const injector = inject(({ store }) => {
  const view = store?.currentView;
  return {
    view,
    locked: !!view?.isLockedByManager,
    enabled: isActive(FF_PROJECT_DM_COLUMN_DEFAULTS),
  };
});

/**
 * Columns dropdown footer — Reset, Manage Defaults, and Save as Default (FIT-2846 / FIT-2847).
 * Reset (left) restores soft project defaults for the current tab only.
 * Save as Default (right) captures the current tab layout into the project explore soft default (Managers+).
 * Hidden when the feature flag is off. Save / Manage Defaults only when the host registered handlers.
 */
export const ResetColumnsButton = injector(
  observer(({ view, locked, enabled, enableSaveAsDefault = false }) => {
    const sdk = useSDK();
    if (!enabled) return null;

    const canManageDefaults = Boolean(sdk?.hasHandler?.(MANAGE_DEFAULTS_EVENT));
    const canSaveAsDefault = Boolean(enableSaveAsDefault && sdk?.hasHandler?.(SAVE_AS_DEFAULT_EVENT));

    const confirmResetTab = () => {
      if (locked || !view) return;
      Modal.confirm({
        title: "Reset this tab’s columns?",
        body: "This will reset the order and visibility of all columns on this tab to the project defaults.",
        okText: "Reset",
        cancelText: "Cancel",
        buttonLook: "negative",
        onOk() {
          view?.resetColumnsToProjectDefaults();
        },
      });
    };

    const confirmSaveAsDefault = () => {
      if (locked || !view || !canSaveAsDefault) return;
      Modal.confirm({
        title: "Save as Default?",
        body: "This will save the current tab’s column order and visibility as the default for this project. Existing tabs keep their customizations. This does not change who can access columns.",
        okText: "Save as Default",
        cancelText: "Cancel",
        onOk() {
          return sdk.invoke(SAVE_AS_DEFAULT_EVENT, captureExploreDefaultsFromTab(view));
        },
      });
    };

    return (
      <div className="flex w-full items-center gap-tight">
        <Button
          size="small"
          look="outlined"
          variant="negative"
          className="flex-1"
          disabled={locked || !view}
          aria-disabled={locked || !view || undefined}
          aria-label="Reset"
          data-testid="dm-reset-columns"
          title={
            locked
              ? "This tab is locked. Unlock it to reset columns."
              : "Reset this tab’s column order and visibility to project defaults"
          }
          onClick={confirmResetTab}
        >
          Reset
        </Button>
        {canManageDefaults ? (
          <Button
            size="small"
            look="outlined"
            variant="neutral"
            className="flex-1"
            aria-label="Manage Defaults"
            data-testid="dm-manage-defaults"
            title="Open Data Manager settings to edit project column defaults"
            onClick={() => sdk.invoke(MANAGE_DEFAULTS_EVENT)}
          >
            Manage Defaults
          </Button>
        ) : null}
        {canSaveAsDefault ? (
          <Button
            size="small"
            look="outlined"
            variant="primary"
            className="flex-1"
            disabled={locked || !view}
            aria-disabled={locked || !view || undefined}
            aria-label="Save as Default"
            data-testid="dm-save-as-default"
            title={
              locked
                ? "This tab is locked. Unlock it to save columns as the project default."
                : "Save this tab’s column order and visibility as the project default"
            }
            onClick={confirmSaveAsDefault}
          >
            Save as Default
          </Button>
        ) : null}
      </div>
    );
  }),
);
