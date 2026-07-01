import { Checkbox } from "@humansignal/ui";
import { inject, observer } from "mobx-react";

const viewInjector = inject(({ store }) => ({
  view: store.currentView,
}));

export const GridSelectAll = viewInjector(
  observer(({ view }) => {
    if (view?.type !== "grid") {
      return null;
    }

    const { selected } = view;
    const isAllSelected = selected.isAllSelected;
    const ariaLabel = `${isAllSelected ? "Unselect" : "Select"} all rows`;

    return (
      <label className="flex items-center justify-center h-wider w-wider border rounded-smaller">
        <Checkbox
          checked={isAllSelected}
          indeterminate={selected.isIndeterminate}
          onChange={() => view.selectAll()}
          ariaLabel={ariaLabel}
          data-testid="dm-grid-select-all"
        />
      </label>
    );
  }),
);
