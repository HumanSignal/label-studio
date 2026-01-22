import { inject, observer } from "mobx-react";
import React, { useEffect, useRef } from "react";
import { IconChevronDown } from "@humansignal/icons";
import { Filters } from "../Filters/Filters";
import { Badge } from "./Badge/Badge";
import { Button } from "@humansignal/ui";
import { Dropdown } from "@humansignal/ui";
import { Icon } from "./Icon/Icon";

const buttonInjector = inject(({ store }) => {
  const { viewsStore, currentView } = store;

  return {
    viewsStore,
    sidebarEnabled: viewsStore?.sidebarEnabled ?? false,
    activeFiltersNumber: currentView?.filtersApplied ?? false,
  };
});

export const FiltersButton = buttonInjector(
  observer(
    React.forwardRef(({ activeFiltersNumber, size, sidebarEnabled, viewsStore, ...rest }, ref) => {
      const hasFilters = activeFiltersNumber > 0;

      return (
        <Button
          ref={ref}
          size="small"
          variant="neutral"
          look="outlined"
          onClick={() => sidebarEnabled && viewsStore.toggleSidebar()}
          trailing={<Icon icon={IconChevronDown} />}
          aria-label="Filters"
          {...rest}
        >
          Filters{" "}
          {hasFilters && (
            <Badge size="small" style={{ marginLeft: 5 }}>
              {activeFiltersNumber}
            </Badge>
          )}
        </Button>
      );
    }),
  ),
);

const injector = inject(({ store }) => {
  return {
    sidebarEnabled: store?.viewsStore?.sidebarEnabled ?? false,
  };
});

export const FiltersPane = injector(
  observer(({ sidebarEnabled, size, ...rest }) => {
    const dropdown = useRef();

    useEffect(() => {
      if (sidebarEnabled === true) {
        dropdown?.current?.close();
      }
    }, [sidebarEnabled]);

    return (
      <Dropdown.Trigger
        ref={dropdown}
        disabled={sidebarEnabled}
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
