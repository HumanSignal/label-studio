import { inject } from "mobx-react";
import React from "react";
import { FaCaretSquareLeft } from "react-icons/fa";
import { Block, Elem } from "../../../utils/bem";
import { Button } from "../../Common/Button/Button";
import { Icon } from "../../Common/Icon/Icon";
import { Filters } from "../Filters";
import "./FilterSidebar.styl";

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
    <Block name="sidebar">
      <Elem name="header">
        <Elem name="extra">
          <Button
            type="link"
            icon={<Icon icon={FaCaretSquareLeft} size="24" />}
            onClick={() => viewsStore.collapseFilters()}
          />
        </Elem>
        <Elem name="title">Filters</Elem>
      </Elem>
      <Filters sidebar={true} />
    </Block>
  ) : null;
});
FiltersSidebar.displayName = "FiltersSidebar";
