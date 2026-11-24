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
    size = "medium",
    allLabel,
    placeholder,
    RootLevelIcon,
    disableAllOption,
    customPlaceholder,
    preventAutoChildSelection,
    isRadio,
    requireApply,
    hasExternalPendingChanges,
    onApplyExternal,
    onDiscardExternal,
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
      hasExternalPendingChanges,
      onApplyExternal,
      onDiscardExternal,
      hiddenNodeFilter,
    });

    return (
      <MultiTreeSelectProvider {...providerProps}>
        <div className={cnm(cn("multi-tree-select").toClassName(), className)} data-size={size}>
          {children ? (
            children
          ) : (
            <div className={cn("content").toClassName()}>
              <TreeSelected allLabel={allLabel} placeholder={placeholder} RootLevelIcon={RootLevelIcon} size={size} />
              <TreeSearch />
              <TreeSelect allLabel={allLabel} />
            </div>
          )}
        </div>
      </MultiTreeSelectProvider>
    );
  },
);
