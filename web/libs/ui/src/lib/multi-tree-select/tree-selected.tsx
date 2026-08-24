import { cnb as cn } from "@humansignal/core/lib/utils/bem";
import { memo, useEffect, useRef, useState } from "react";
import { Badge } from "../badge/badge";
import { IdDelimiter, RootSymbol, type TreeAction, useTreeContext } from "./tree-context";

/**
 * Drop child path ids when any ancestor is also selected (e.g. hide workspace
 * projects when the workspace chip is shown). Preserves the caller's selection
 * order — do not sort here; badge order must match click order.
 */
export const filterChildrenOfSelectedParents = (selection: string[]): string[] => {
  return selection.filter((id) => !selection.some((other) => other !== id && id.startsWith(`${other}${IdDelimiter}`)));
};

export const TreeSelected = memo(
  ({
    allLabel,
    placeholder,
    RootLevelIcon,
  }: {
    RootLevelIcon?: React.ReactNode;
    allLabel?: string;
    placeholder?: string;
  }) => {
    const update = useState(0)[1];
    const {
      selected,
      allNodeIds,
      getLabel,
      subscribe,
      customPlaceholder,
      disableAllOption,
      preventAutoChildSelection,
    } = useTreeContext();

    const getInitialSelectedState = () => {
      if (disableAllOption) {
        return [];
      }
      if (selected.current.length === 0 && !customPlaceholder) {
        return [RootSymbol.toString()];
      }
      if (selected.current.length === 0) {
        return [];
      }
      if (selected.current.length === allNodeIds.current.length) {
        return [RootSymbol.toString()];
      }
      if (preventAutoChildSelection) {
        return selected.current;
      }
      return filterChildrenOfSelectedParents(selected.current);
    };

    const selectedRef = useRef<Array<string>>(getInitialSelectedState());
    useEffect(() => {
      return subscribe(RootSymbol, (change: TreeAction) => {
        if (change.action === "select" || change.action === "refresh") {
          if (
            !disableAllOption &&
            allNodeIds.current.length === selected.current.length &&
            selected.current.length > 0
          ) {
            selectedRef.current = [RootSymbol.toString()];
          } else if (selected.current.length === 0) {
            selectedRef.current = [];
          } else if (preventAutoChildSelection) {
            selectedRef.current = [...selected.current];
          } else {
            selectedRef.current = filterChildrenOfSelectedParents(selected.current);
          }
          update((prev: number) => prev + 1);
        }
      });
    }, [customPlaceholder, disableAllOption, preventAutoChildSelection, subscribe]);

    let selectedNodes = null;
    if (!selectedRef.current.length) {
      selectedNodes = (
        <span className={cn("multi-tree-select").elem("selection__placeholder").toClassName()}>
          {customPlaceholder || placeholder}
        </span>
      );
    } else {
      selectedNodes = selectedRef.current?.map((id) => {
        const isRootLevel = id.toString().indexOf("-") === -1;
        const label = id === RootSymbol.toString() ? allLabel : getLabel(id);
        return (
          <Badge
            key={id}
            icon={RootLevelIcon && isRootLevel ? RootLevelIcon : undefined}
            data-testid="multi-tree-select-tag"
          >
            {label}
          </Badge>
        );
      });
    }

    return <div className={cn("multi-tree-select").elem("selection").toClassName()}>{selectedNodes}</div>;
  },
);
