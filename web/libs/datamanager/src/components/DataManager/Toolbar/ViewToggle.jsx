import { inject, observer } from "mobx-react";
import { SquaresFourIcon, ListIcon } from "@humansignal/icons";
import { SegmentedControl, Tooltip } from "@humansignal/ui";

const viewInjector = inject(({ store }) => ({
  view: store.currentView,
}));

export const ViewToggle = viewInjector(
  observer(({ view, size }) => {
    const isLocked = view?.isLockedByManager;

    const control = (
      <SegmentedControl
        size={size}
        aria-label="View"
        data-testid="dm-view-toggle"
        selectedOption={view.type}
        onChange={(type) => view.setType(type)}
        disabled={isLocked}
        options={[
          {
            value: "list",
            label: <ListIcon weight="bold" />,
            tooltip: isLocked ? undefined : "List view",
            "aria-label": "Switch to list view",
          },
          {
            value: "grid",
            label: <SquaresFourIcon weight="bold" />,
            tooltip: isLocked ? undefined : "Grid view",
            "aria-label": "Switch to grid view",
          },
        ]}
      />
    );

    // Disabled buttons ignore hover, so the lock reason sits on a wrapper.
    return isLocked ? (
      <Tooltip title={view?.lockedUpdateMessage}>
        <div>{control}</div>
      </Tooltip>
    ) : (
      control
    );
  }),
);
