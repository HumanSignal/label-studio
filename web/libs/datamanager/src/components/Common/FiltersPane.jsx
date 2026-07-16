import { inject, observer } from "mobx-react";
import React, { useEffect, useRef } from "react";
import { CaretDownIcon } from "@humansignal/icons";
import { Filters } from "../Filters/Filters";
import { Badge, Button, Dropdown, Tooltip } from "@humansignal/ui";
import { Icon } from "./Icon/Icon";

const buttonInjector = inject(({ store }) => {
  const { viewsStore, currentView } = store;

  return {
    viewsStore,
    currentView,
    sidebarEnabled: viewsStore?.sidebarEnabled ?? false,
    activeFiltersNumber: currentView?.filtersApplied ?? false,
  };
});

export const FiltersButton = buttonInjector(
  observer(
    React.forwardRef(({ activeFiltersNumber, size, sidebarEnabled, viewsStore, currentView, ...rest }, ref) => {
      const hasFilters = activeFiltersNumber > 0;
      const isLocked = currentView?.isLockedByManager;
      const button = (
        <Button
          ref={ref}
          size="small"
          variant="neutral"
          look="outlined"
          disabled={isLocked}
          onClick={() => sidebarEnabled && viewsStore.toggleSidebar()}
          trailing={<CaretDownIcon size={16} />}
          aria-label="Filters"
          data-testid="dm-filters-button"
          {...rest}
        >
          Filters{" "}
          {hasFilters && (
            <Badge size="small" className="ml-tightest">
              {activeFiltersNumber}
            </Badge>
          )}
        </Button>
      );

      return isLocked ? (
        <Tooltip title={currentView.lockedUpdateMessage}>
          <div>{button}</div>
        </Tooltip>
      ) : (
        button
      );
    }),
  ),
);

const injector = inject(({ store }) => {
  return {
    sidebarEnabled: store?.viewsStore?.sidebarEnabled ?? false,
    currentView: store?.currentView,
  };
});

export const FiltersPane = injector(
  observer(({ currentView, sidebarEnabled, size, ...rest }) => {
    const dropdown = useRef();

    useEffect(() => {
      if (sidebarEnabled === true) {
        dropdown?.current?.close();
      }
    }, [sidebarEnabled]);

    return (
      <Dropdown.Trigger
        ref={dropdown}
        disabled={sidebarEnabled || currentView?.isLockedByManager}
        content={<Filters />}
        openUpwardForShortViewport={false}
        isChildValid={(ele) => {
          return !!ele.closest("[data-radix-popper-content-wrapper]");
        }}
      >
        <FiltersButton {...rest} size={size} />
      </Dropdown.Trigger>
    );
  }),
);
