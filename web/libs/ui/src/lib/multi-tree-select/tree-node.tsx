import { CaretRightIcon } from "@humansignal/icons";
import { cnb as cn } from "@humansignal/core/lib/utils/bem";
import { memo, useEffect, useState } from "react";
import { Button } from "../button/button";
import { Checkbox } from "../checkbox/checkbox";
import {
  getChildrenIds,
  IdDelimiter,
  RootSymbol,
  type TreeAction,
  type TreeNodeProps,
  useTreeContext,
} from "./tree-context";

export const TreeNode = memo(({ id, label, children, disabled }: TreeNodeProps) => {
  const update = useState(0)[1];
  const {
    allNodeIds,
    selected,
    expanded: allExpanded,
    notify,
    subscribe,
    searchQuery,
    searchResults,
    preventAutoChildSelection,
    isRadio,
  } = useTreeContext();
  const isRoot = id === RootSymbol.toString();

  const notifyParent = (state: TreeAction) => {
    // notify the parent
    let parentId: string | Symbol = RootSymbol;
    if (typeof state.id === "string" && state.id !== RootSymbol.toString()) {
      parentId = state.id.split(IdDelimiter).slice(0, -1).join(IdDelimiter) || RootSymbol;
    }
    // Ensure the root symbol is always a symbol even if it came from a string
    if (state.id === RootSymbol.toString()) {
      state.id = RootSymbol;
    }
    notify(parentId, state);
    update((prev: number) => prev + 1);
  };

  const setSelected = (value: boolean) => {
    // Special handling for the root node All case
    if (isRoot) {
      if (value) {
        selected.current = [...allNodeIds.current];
      } else {
        selected.current = [];
      }
      notifyParent({ id, action: "select", value });
      return;
    }

    // Radio button behavior: only one can be selected at a time
    if (isRadio) {
      // Simple approach: Check if this exact ID is currently the only item selected
      const isCurrentlyTheOnlySelected = selected.current.length === 1 && selected.current[0] === id;

      if (isCurrentlyTheOnlySelected) {
        // Clicking same radio again - deselect it
        selected.current = [];
        notifyParent({ id, action: "select", value: false });
      } else {
        // Selecting this radio - clear all and select only this one
        selected.current = [id];
        notifyParent({ id, action: "select", value: true });
      }

      // Notify root to trigger re-render of all radio buttons
      // This ensures previously selected radios show as unchecked
      notify(RootSymbol, { id: RootSymbol, action: "select", value: true });
      return;
    }

    // Update the selected state (checkbox behavior)
    const index = selected.current.indexOf(id);
    const hasChildren = children.length > 0;

    if (value && index === -1) {
      selected.current.push(id);

      // When preventAutoChildSelection is false (default), selecting a parent selects all descendants
      // (legacy behavior). When true, parent and children are independent: workspace vs projects, etc.
      if (hasChildren && !preventAutoChildSelection) {
        const childrenIds = getChildrenIds({ id, label, children, searchBy: [] });
        selected.current = Array.from(new Set([...selected.current, ...childrenIds]));
      }
    } else if (!value && index !== -1) {
      selected.current.splice(index, 1);

      if (hasChildren && !preventAutoChildSelection) {
        const childrenIds = getChildrenIds({ id, label, children, searchBy: [] });
        selected.current = selected.current.filter((id) => !childrenIds.includes(id));
      }
    }

    notifyParent({ id, action: "select", value });
  };

  const updateExpanded = (value: boolean) => {
    const index = allExpanded.current.indexOf(id);
    if (value && index === -1) {
      allExpanded.current.push(id);
    } else if (!value && index !== -1) {
      allExpanded.current.splice(index, 1);
      allExpanded.current = allExpanded.current.filter((expandedId) => !expandedId.startsWith(`${id}${IdDelimiter}`));
    }
  };

  const isSelected = (isRoot && allNodeIds.current.length === selected.current.length) || selected.current.includes(id);
  const isIndeterminate =
    !isRoot &&
    !isSelected &&
    !preventAutoChildSelection &&
    selected.current.some((selectedId) => selectedId.startsWith(`${id}${IdDelimiter}`));
  const isSearching = searchQuery.current.trim().length > 2;
  const isMatched =
    !isRoot &&
    (!isSearching || searchResults.current.some((result) => result === id || result.startsWith(`${id}${IdDelimiter}`)));
  const isExpanded = !isRoot && allExpanded.current.includes(id);
  const hasChildren = children.length > 0;
  const hasChildrenMatched =
    !isSearching ||
    (isMatched &&
      children.some((child) =>
        searchResults.current.some((result) => result === child.id || result.startsWith(`${child.id}${IdDelimiter}`)),
      ));

  useEffect(() => {
    if (id === RootSymbol.toString()) {
      return;
    }
    return subscribe(id, (change: TreeAction) => {
      switch (change.action) {
        case "select": {
          // When preventAutoChildSelection is true, DON'T auto-select parent when children change
          // (avoids implying the workspace when only projects are checked). Still bubble so
          // RootSymbol subscribers (TreeSelected chips, debounced onChange) stay in sync.
          if (!preventAutoChildSelection) {
            if (change.value && children.every((child: TreeNodeProps) => selected.current.includes(child.id))) {
              selected.current.push(id);
            } else {
              const index = selected.current.indexOf(id);
              if (index !== -1) {
                selected.current.splice(index, 1);
              }
            }
          }
          notifyParent({ id, action: "select", value: change.value });
          break;
        }
      }
    });
  }, [preventAutoChildSelection]);

  useEffect(() => {
    return subscribe(RootSymbol, (change: TreeAction) => {
      switch (change.action) {
        case "select": {
          // All values are selected/deselected
          // update the component and allow the logic to handle the rest
          if (change.id === RootSymbol || id === RootSymbol.toString()) {
            update((prev: number) => prev + 1);
          }
          break;
        }
        case "refresh": {
          // Refresh UI to reflect external selection changes (e.g., from shared atom state)
          // This is similar to "select" but doesn't trigger onChange in the provider
          update((prev: number) => prev + 1);
          break;
        }
        case "search": {
          if (change.value.query.trim().length > 2) {
            updateExpanded(
              change.value.results.some((result: string) => result === id || result.startsWith(`${id}${IdDelimiter}`)),
            );
          }
          update((prev: number) => prev + 1);
          break;
        }
      }
    });
  }, []);

  const setExpanded = (value: boolean) => {
    updateExpanded(value);
    notifyParent({ id, action: "expand", value });
  };

  const toggleExpanded = () => setExpanded(!isExpanded);
  const isRadioParent = isRadio && hasChildren;

  return (
    <div
      className={cn("multi-tree-select__content")
        .elem("node")
        .mod({ filtered: !isRoot && !isMatched })
        .toClassName()}
    >
      <div
        className={cn("multi-tree-select__content")
          .elem("node__container")
          .mod({ "row-clickable": isRadioParent })
          .toClassName()}
        role={isRadioParent ? "button" : undefined}
        tabIndex={isRadioParent ? 0 : undefined}
        onClick={isRadioParent ? toggleExpanded : undefined}
        onKeyDown={
          isRadioParent
            ? (e: React.KeyboardEvent) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  toggleExpanded();
                }
              }
            : undefined
        }
      >
        {hasChildren &&
          (isRadio ? (
            <div
              className={cn("multi-tree-select__content")
                .elem("toggle")
                .mod({ filtered: !hasChildrenMatched })
                .toClassName()}
            >
              <div
                className={cn("multi-tree-select__content").elem("icon").mod({ expanded: isExpanded }).toClassName()}
              >
                {hasChildrenMatched && (
                  <CaretRightIcon
                    size={20}
                    aria-hidden="true"
                    className={`transition-transform duration-200 ${isExpanded ? "rotate-90" : ""}`}
                  />
                )}
              </div>
            </div>
          ) : (
            <Button
              type="button"
              className={cn("multi-tree-select__content")
                .elem("toggle")
                .mod({ filtered: !hasChildrenMatched })
                .toClassName()}
              size="small"
              look="string"
              variant="neutral"
              onClick={() => setExpanded(!isExpanded)}
            >
              <div
                className={cn("multi-tree-select__content").elem("icon").mod({ expanded: isExpanded }).toClassName()}
              >
                {hasChildrenMatched && (
                  <CaretRightIcon
                    size={20}
                    aria-hidden="true"
                    className={`transition-transform duration-200 ${isExpanded ? "rotate-90" : ""}`}
                  />
                )}
              </div>
            </Button>
          ))}
        <label className={cn("multi-tree-select__content").elem("label-container").toClassName()}>
          {isRadio && hasChildren ? (
            <></>
          ) : isRadio ? (
            <input
              className={cn("multi-tree-select__content").elem("radio").toClassName()}
              type="radio"
              checked={isSelected}
              disabled={disabled}
              onChange={() => setSelected(true)}
            />
          ) : (
            <Checkbox
              className={cn("multi-tree-select__content").elem("checkbox").toClassName()}
              indeterminate={isIndeterminate}
              checked={isSelected}
              disabled={disabled}
              ariaLabel={`Select ${label}`}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSelected(e.currentTarget.checked)}
            />
          )}
          <div className={cn("multi-tree-select__content").elem("label").toClassName()}>{label}</div>
        </label>
      </div>

      {isExpanded && isMatched && hasChildrenMatched && (
        <div className={cn("multi-tree-select__content").elem("children").toClassName()}>
          {children.map((child) => (
            <TreeNode key={child.id} {...child} parentChecked={isSelected} />
          ))}
        </div>
      )}
    </div>
  );
});
