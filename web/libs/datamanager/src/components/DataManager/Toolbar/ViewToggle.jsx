import { inject, observer } from "mobx-react";
import { RadioGroup } from "../../Common/RadioGroup/RadioGroup";
import { SquaresFourIcon, ListIcon } from "@humansignal/icons";
import { Tooltip } from "@humansignal/ui";

const viewInjector = inject(({ store }) => ({
  view: store.currentView,
}));

export const ViewToggle = viewInjector(
  observer(({ view, size, ...rest }) => {
    return (
      <RadioGroup
        size={size}
        value={view.type}
        onChange={(e) => view.setType(e.target.value)}
        {...rest}
        style={{ "--button-padding": "0 var(--spacing-tighter)" }}
      >
        <Tooltip title="List view">
          <div>
            <RadioGroup.Button value="list" aria-label="Switch to list view" data-testid="dm-view-toggle-list">
              <ListIcon size={20} />
            </RadioGroup.Button>
          </div>
        </Tooltip>
        <Tooltip title="Grid view">
          <div>
            <RadioGroup.Button value="grid" aria-label="Switch to grid view" data-testid="dm-view-toggle-grid">
              <SquaresFourIcon size={20} />
            </RadioGroup.Button>
          </div>
        </Tooltip>
      </RadioGroup>
    );
  }),
);

export const DataStoreToggle = viewInjector(({ view, size, ...rest }) => {
  return (
    <RadioGroup value={view.target} size={size} onChange={(e) => view.setTarget(e.target.value)} {...rest}>
      <RadioGroup.Button value="tasks">Tasks</RadioGroup.Button>
      <RadioGroup.Button value="annotations" disabled>
        Annotations
      </RadioGroup.Button>
    </RadioGroup>
  );
});
