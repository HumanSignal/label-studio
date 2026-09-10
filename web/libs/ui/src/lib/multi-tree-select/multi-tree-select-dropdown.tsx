import { CaretDownIcon } from "@humansignal/icons";
import { cnb as cn } from "@humansignal/core/lib/utils/bem";
import type { CSSProperties, HTMLAttributes, KeyboardEvent, ReactNode } from "react";
import { memo, useEffect, useRef, useState } from "react";
import { cnm } from "../../utils/utils";
import { Button } from "../button/button";
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

/**
 * Matches Tags filter Select footer: primary filled Apply, disabled until pending changes.
 * @see TagMultiSelect footer + Select `p-tight border-t border-neutral-border flex`
 */
const TreeApplyFooter = memo(() => {
  const { applySelection, hasPendingChanges } = useTreeContext();

  return (
    <div
      className={cnm(
        cn("multi-tree-select__content").elem("footer").toClassName(),
        "p-tight border-t border-neutral-border flex",
      )}
    >
      <Button
        type="button"
        onClick={applySelection}
        variant="primary"
        look="filled"
        size="small"
        className="flex-1"
        disabled={!hasPendingChanges}
        data-testid="multi-tree-select-apply"
      >
        Apply
      </Button>
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
    header,
    isChildValid,
    onToggle,
  }: {
    children: React.ReactNode;
    allLabel?: string;
    searchPlaceholder?: string;
    dropdownRef?: React.RefObject<DropdownRef | null>;
    inline?: boolean;
    syncWidth?: boolean;
    dropdownClassName?: string;
    dropdownStyle?: CSSProperties;
    header?: ReactNode;
    isChildValid?: (element: HTMLElement) => boolean;
    onToggle?: (open: boolean) => void;
  }) => {
    const { notify, requireApply, discardPendingSelection } = useTreeContext();
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
            {header}
            <TreeSearch placeholder={searchPlaceholder} />
            <TreeSelect allLabel={allLabel} />
            {requireApply ? <TreeApplyFooter /> : null}
          </div>
        }
        onToggle={(open) => {
          notify(`${RootSymbol.toString()}::dropdown`, {
            id: `${RootSymbol.toString()}::dropdown`,
            action: "toggleselect",
            value: open,
          });
          if (!open && requireApply) {
            discardPendingSelection();
          }
          onToggle?.(open);
        }}
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
    requireApply,
    inline,
    triggerTestId,
    syncWidth = true,
    dropdownClassName,
    dropdownStyle,
    header,
    selectionTrigger,
    growableTrigger,
    isChildValid,
    triggerClassName,
    triggerProps,
    ...props
  }: MultiTreeSelectProps & {
    inline?: boolean;
    triggerTestId?: string;
    syncWidth?: boolean;
    dropdownClassName?: string;
    dropdownStyle?: CSSProperties;
    header?: ReactNode;
    selectionTrigger?: ReactNode;
    /** When true, trigger height expands to fit wrapped chip content. */
    growableTrigger?: boolean;
    /** Treat matching elements as inside the dropdown (e.g. portaled chip popovers). */
    isChildValid?: (element: HTMLElement) => boolean;
    triggerClassName?: string;
    triggerProps?: HTMLAttributes<HTMLDivElement>;
  }) => {
    const dropdownRef = useRef<DropdownRef | null>(null);
    const [isOpen, setIsOpen] = useState(false);
    const handleTriggerKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
      triggerProps?.onKeyDown?.(event);
      if (event.defaultPrevented || (event.key !== "Enter" && event.key !== " ")) return;
      event.preventDefault();
      dropdownRef.current?.toggle();
    };

    return (
      <MultiTreeSelect
        {...props}
        dropdownRef={dropdownRef}
        allLabel={allLabel}
        disableAllOption={disableAllOption}
        customPlaceholder={customPlaceholder}
        preventAutoChildSelection={preventAutoChildSelection}
        hiddenNodeFilter={hiddenNodeFilter}
        requireApply={requireApply}
      >
        <DropdownContent
          allLabel={allLabel}
          searchPlaceholder={searchPlaceholder}
          dropdownRef={dropdownRef}
          inline={inline}
          syncWidth={syncWidth}
          dropdownClassName={dropdownClassName}
          dropdownStyle={dropdownStyle}
          header={header}
          isChildValid={isChildValid}
          onToggle={setIsOpen}
        >
          <div
            {...triggerProps}
            id={triggerProps?.id}
            role={triggerProps?.role ?? "button"}
            tabIndex={triggerProps?.tabIndex ?? 0}
            aria-expanded={isOpen}
            aria-haspopup="true"
            className={cnm(
              cn("multi-tree-select").elem("input").mod({ growable: growableTrigger }).toClassName(),
              triggerClassName,
              triggerProps?.className,
            )}
            data-testid={triggerTestId ?? triggerProps?.["data-testid"]}
            onKeyDown={handleTriggerKeyDown}
          >
            <span className={cn("multi-tree-select").elem("value").toClassName()}>
              {selectionTrigger ?? (
                <TreeSelected placeholder={placeholder} allLabel={allLabel} RootLevelIcon={RootLevelIcon} />
              )}
            </span>
            <DropdownIcon />
          </div>
        </DropdownContent>
      </MultiTreeSelect>
    );
  },
);
