import { inject, observer } from "mobx-react";
import { RadioGroup } from "../../Common/RadioGroup/RadioGroup";
import { SquaresFourIcon, ListIcon } from "@humansignal/icons";
import { Tooltip } from "@humansignal/ui";
import { useTranslation } from "react-i18next";

const viewInjector = inject(({ store }) => ({
  view: store.currentView,
}));

export const ViewToggle = viewInjector(
  observer(({ view, size, ...rest }) => {
    const { t } = useTranslation();
    const isLocked = view?.isLockedByManager;
    const lockedTooltip = view?.lockedUpdateMessage;

    return (
      <RadioGroup
        size={size}
        value={view.type}
        onChange={(e) => view.setType(e.target.value)}
        {...rest}
        style={{ "--button-padding": "0 var(--spacing-tighter)" }}
      >
        <Tooltip title={isLocked ? lockedTooltip : t("dataManager:listView")}>
          <div>
            <RadioGroup.Button
              value="list"
              aria-label={t("dataManager:switchToListView")}
              data-testid="dm-view-toggle-list"
              disabled={isLocked}
            >
              <ListIcon size={20} />
            </RadioGroup.Button>
          </div>
        </Tooltip>
        <Tooltip title={isLocked ? lockedTooltip : t("dataManager:gridView")}>
          <div>
            <RadioGroup.Button
              value="grid"
              aria-label={t("dataManager:switchToGridView")}
              data-testid="dm-view-toggle-grid"
              disabled={isLocked}
            >
              <SquaresFourIcon size={20} />
            </RadioGroup.Button>
          </div>
        </Tooltip>
      </RadioGroup>
    );
  }),
);

export const DataStoreToggle = viewInjector(({ view, size, ...rest }) => {
  const { t } = useTranslation();

  return (
    <RadioGroup value={view.target} size={size} onChange={(e) => view.setTarget(e.target.value)} {...rest}>
      <RadioGroup.Button value="tasks">{t("dataManager:tabTitleTasks")}</RadioGroup.Button>
      <RadioGroup.Button value="annotations" disabled>
        {t("dataManager:annotationsTarget")}
      </RadioGroup.Button>
    </RadioGroup>
  );
});
