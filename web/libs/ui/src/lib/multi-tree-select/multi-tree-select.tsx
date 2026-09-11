import { cnb as cn } from "@humansignal/core/lib/utils/bem";
import { memo } from "react";
import { cnm } from "../../utils/utils";
import { type MultiTreeSelectProps, MultiTreeSelectProvider, useMultiTreeSelectProvider } from "./tree-context";
import { TreeSearch } from "./tree-search";
import { TreeSelect } from "./tree-select";
import { TreeSelected } from "./tree-selected";
import "./multi-tree-select.prefix.css";

export const MultiTreeSelect = memo(
  ({
    children,
    className,
    allLabel,
    placeholder,
    RootLevelIcon,
    disableAllOption,
    customPlaceholder,
    preventAutoChildSelection,
    isRadio,
    requireApply,
    hiddenNodeFilter,
    ...props
  }: MultiTreeSelectProps) => {
    const { providerProps } = useMultiTreeSelectProvider({
      ...props,
      disableAllOption,
      customPlaceholder,
      preventAutoChildSelection,
      isRadio,
      requireApply,
      hiddenNodeFilter,
    });

    return (
      <MultiTreeSelectProvider {...providerProps}>
        <div className={cnm(cn("multi-tree-select").toClassName(), className)}>
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
