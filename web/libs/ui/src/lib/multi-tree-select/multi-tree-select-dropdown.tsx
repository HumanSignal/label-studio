import { CaretDownIcon } from "@humansignal/icons";
import { cnb as cn } from "@humansignal/core/lib/utils/bem";
import type { CSSProperties, ReactNode } from "react";
import { memo, useEffect, useRef, useState } from "react";
import { Dropdown, type DropdownRef } from "../dropdown/dropdown";
import { MultiTreeSelect } from "./multi-tree-select";
import { type MultiTreeSelectProps, RootSymbol, type TreeAction, useTreeContext } from "./tree-context";
import { TreeSearch } from "./tree-search";
import { TreeSelect } from "./tree-select";
import { TreeSelected } from "./tree-selected";

const DropdownIcon = memo(() => {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const { subscribe } = useTreeContext();

  useEffect(() => {
    return subscribe(`${RootSymbol.toString()}::dropdown`, (change: TreeAction) => {
      if (change.action === "toggleselect") {
        setDropdownOpen(change.value);
      }
    });
  }, [subscribe]);

  return (
    <div className={cn("multi-tree-select").elem("icon").mod({ open: dropdownOpen }).toClassName()}>
      <CaretDownIcon size={18} />
    </div>
  );
});

const DropdownContent = memo(
  ({
    children,
    allLabel,
    searchPlaceholder,
    dropdownRef,
    inline,
    syncWidth,
    dropdownClassName,
    dropdownStyle,
    isChildValid,
  }: {
    children: React.ReactNode;
    allLabel?: string;
    searchPlaceholder?: string;
    dropdownRef?: React.RefObject<DropdownRef | null>;
    inline?: boolean;
    syncWidth?: boolean;
    dropdownClassName?: string;
    dropdownStyle?: CSSProperties;
    isChildValid?: (element: HTMLElement) => boolean;
  }) => {
    const { notify } = useTreeContext();
    return (
      <Dropdown.Trigger
        ref={dropdownRef}
        constrainHeight
        syncWidth={syncWidth ?? true}
        dropdownClassName={dropdownClassName}
        style={dropdownStyle}
        inline={inline}
        isChildValid={isChildValid}
        content={
          <div className={cn("multi-tree-select__content").toClassName()}>
            <TreeSearch placeholder={searchPlaceholder} />
            <TreeSelect allLabel={allLabel} />
          </div>
        }
        onToggle={(open) =>
          notify(`${RootSymbol.toString()}::dropdown`, {
            id: `${RootSymbol.toString()}::dropdown`,
            action: "toggleselect",
            value: open,
          })
        }
      >
        {children}
      </Dropdown.Trigger>
    );
  },
);

export const MultiTreeSelectDropdown = memo(
  ({
    children,
    placeholder,
    searchPlaceholder,
    allLabel,
    RootLevelIcon,
    disableAllOption,
    customPlaceholder,
    preventAutoChildSelection,
    hiddenNodeFilter,
    inline,
    triggerTestId,
    syncWidth = true,
    dropdownClassName,
    dropdownStyle,
    selectionTrigger,
    growableTrigger,
    isChildValid,
    ...props
  }: MultiTreeSelectProps & {
    inline?: boolean;
    triggerTestId?: string;
    syncWidth?: boolean;
    dropdownClassName?: string;
    dropdownStyle?: CSSProperties;
    selectionTrigger?: ReactNode;
    /** When true, trigger height expands to fit wrapped chip content. */
    growableTrigger?: boolean;
    /** Treat matching elements as inside the dropdown (e.g. portaled chip popovers). */
    isChildValid?: (element: HTMLElement) => boolean;
  }) => {
    const dropdownRef = useRef<DropdownRef | null>(null);
    return (
      <MultiTreeSelect
        {...props}
        dropdownRef={dropdownRef}
        allLabel={allLabel}
        disableAllOption={disableAllOption}
        customPlaceholder={customPlaceholder}
        preventAutoChildSelection={preventAutoChildSelection}
        hiddenNodeFilter={hiddenNodeFilter}
      >
        <DropdownContent
          allLabel={allLabel}
          searchPlaceholder={searchPlaceholder}
          dropdownRef={dropdownRef}
          inline={inline}
          syncWidth={syncWidth}
          dropdownClassName={dropdownClassName}
          dropdownStyle={dropdownStyle}
          isChildValid={isChildValid}
        >
          <div
            className={cn("multi-tree-select").elem("input").mod({ growable: growableTrigger }).toClassName()}
            data-testid={triggerTestId}
          >
            {selectionTrigger ?? (
              <TreeSelected placeholder={placeholder} allLabel={allLabel} RootLevelIcon={RootLevelIcon} />
            )}
            <DropdownIcon />
          </div>
        </DropdownContent>
      </MultiTreeSelect>
    );
  },
);
