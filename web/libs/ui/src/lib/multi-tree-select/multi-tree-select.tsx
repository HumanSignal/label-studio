import { cnb as cn } from "@humansignal/core/lib/utils/bem";
import { memo } from "react";
import { type MultiTreeSelectProps, MultiTreeSelectProvider, useMultiTreeSelectProvider } from "./tree-context";
import { TreeSearch } from "./tree-search";
import { TreeSelect } from "./tree-select";
import { TreeSelected } from "./tree-selected";
import "./multi-tree-select.prefix.css";

export const MultiTreeSelect = memo(
  ({
    children,
    allLabel,
    placeholder,
    RootLevelIcon,
    disableAllOption,
    customPlaceholder,
    preventAutoChildSelection,
    isRadio,
    hiddenNodeFilter,
    ...props
  }: MultiTreeSelectProps) => {
    const { providerProps } = useMultiTreeSelectProvider({
      ...props,
      disableAllOption,
      customPlaceholder,
      preventAutoChildSelection,
      isRadio,
      hiddenNodeFilter,
    });

    return (
      <MultiTreeSelectProvider {...providerProps}>
        <div className={cn("multi-tree-select").toClassName()}>
          {children ? (
            children
          ) : (
            <div className={cn("content").toClassName()}>
              <TreeSelected allLabel={allLabel} placeholder={placeholder} RootLevelIcon={RootLevelIcon} />
              <TreeSearch />
              <TreeSelect allLabel={allLabel} />
            </div>
          )}
        </div>
      </MultiTreeSelectProvider>
    );
  },
);
