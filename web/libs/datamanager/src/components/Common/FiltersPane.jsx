import { inject, observer } from "mobx-react";
import React, { useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { CaretDownIcon } from "@humansignal/icons";
import { Filters } from "../Filters/Filters";
import { Badge, Button, Dropdown } from "@humansignal/ui";

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
      const { t } = useTranslation();
      const hasFilters = activeFiltersNumber > 0;
      return (
        <Button
          ref={ref}
          size="small"
          variant="neutral"
          look="outlined"
          onClick={() => sidebarEnabled && viewsStore.toggleSidebar()}
          trailing={<CaretDownIcon size={16} />}
          aria-label={t("dataManager:filters")}
          data-testid="dm-filters-button"
          {...rest}
        >
          {t("dataManager:filters")}{" "}
          {hasFilters && (
            <Badge size="small" className="ml-tightest">
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
