import { inject, observer } from "mobx-react";
import { FF_PROJECT_DM_COLUMN_DEFAULTS, isActive } from "@humansignal/core/lib/utils/feature-flags";
import { Button } from "@humansignal/ui";
import { useSDK } from "../../../providers/SDKProvider";
import { Modal } from "../../Common/Modal/Modal";

const MANAGE_DEFAULTS_EVENT = "dataManagerSettingsClicked";

const injector = inject(({ store }) => {
  const view = store?.currentView;
  return {
    view,
    locked: !!view?.isLockedByManager,
    enabled: isActive(FF_PROJECT_DM_COLUMN_DEFAULTS),
  };
});

/**
 * Columns dropdown footer — Manage Defaults (project settings) + Reset (FIT-2846).
 * Reset confirms before restoring soft project defaults for the current tab only.
 * Hidden when the feature flag is off. Manage Defaults only when the host registered the handler.
 */
export const ResetColumnsButton = injector(
  observer(({ view, locked, enabled }) => {
    const sdk = useSDK();
    if (!enabled) return null;

    const canManageDefaults = Boolean(sdk?.hasHandler?.(MANAGE_DEFAULTS_EVENT));

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

    return (
      <div className="flex w-full items-center gap-tight">
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
      </div>
    );
  }),
);
