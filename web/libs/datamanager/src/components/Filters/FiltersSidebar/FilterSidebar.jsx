import { inject } from "mobx-react";
import { XIcon } from "@humansignal/icons";
import { cn } from "../../../utils/bem";
import { Button, Typography } from "@humansignal/ui";
import { Filters } from "../Filters";
import { FILTER_CHROME_ICON_SIZE } from "../FilterLine/FilterLine";
import "./FilterSidebar.prefix.css";

const sidebarInjector = inject(({ store }) => {
  const viewsStore = store.viewsStore;

  return {
    viewsStore,
    sidebarEnabled: viewsStore?.sidebarEnabled,
    sidebarVisible: viewsStore?.sidebarVisible,
  };
});

export const FiltersSidebar = sidebarInjector(({ viewsStore, sidebarEnabled, sidebarVisible }) => {
  return sidebarEnabled && sidebarVisible ? (
    <div className={cn("filters-sidebar").toClassName()}>
      <div className={cn("filters-sidebar").elem("header").toClassName()}>
        <Typography as="h2" variant="title" size="medium" className={cn("filters-sidebar").elem("title").toClassName()}>
          Filters
        </Typography>
        <Button
          look="string"
          size="small"
          className="!p-0"
          onClick={() => viewsStore.collapseFilters()}
          tooltip="Close filters"
          aria-label="Close filters"
          data-testid="filters-unpin-sidebar"
          leading={<XIcon size={FILTER_CHROME_ICON_SIZE} aria-hidden="true" />}
        />
      </div>
      <Filters sidebar={true} />
    </div>
  ) : null;
});
FiltersSidebar.displayName = "FiltersSidebar";
