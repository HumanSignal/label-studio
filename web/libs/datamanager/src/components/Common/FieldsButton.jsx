import { Select, Tooltip } from "@humansignal/ui";
import { Badge } from "@humansignal/ui";
import { inject, observer } from "mobx-react";
import { useCallback, useMemo } from "react";
import { flushSync } from "react-dom";
import { cn } from "../../utils/bem";
import {
  COLUMN_VALUE_PREFIX,
  ColumnPickerOptionContent,
  columnsToPickerGroups,
  pickerGroupsToFlatOptions,
  searchFilterByLabel,
} from "./ColumnPickerList";

const injector = inject(({ store }) => {
  return {
    columns: Array.from(store.currentView?.targetColumns ?? []),
  };
});

/**
 * Columns picker button (multi-select). Used by toolbar and Table quick view.
 * Single-select pickers (Order By, Filter column) use Select directly.
 */
export const FieldsButton = injector(
  observer(
    ({ columns, size, title, icon, filter, tooltip, multiSelect = true, className, "data-testid": dataTestId }) => {
      const groups = useMemo(
        () => columnsToPickerGroups(columns, filter),
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [columns, filter],
      );

      const flatOptions = useMemo(() => pickerGroupsToFlatOptions(groups), [groups]);
      const value = useMemo(
        () => columns.filter((c) => !c.is_hidden).map((c) => COLUMN_VALUE_PREFIX + c.key),
        [columns],
      );

      const handleChange = useCallback(
        (newValue) => {
          const selectedSet = new Set(newValue ?? []);
          flushSync(() => {
            for (const opt of flatOptions) {
              const col = opt.original;
              if (!col?.toggleVisibility) continue;
              const shouldBeVisible = selectedSet.has(opt.value);
              const isVisible = !col.is_hidden;
              if (shouldBeVisible !== isVisible) {
                col.toggleVisibility();
              }
            }
          });
        },
        [flatOptions],
      );

      const selectTrigger = (
        <Select
          options={flatOptions}
          value={value}
          onChange={handleChange}
          multiple
          searchable
          searchPlaceholder="Search columns"
          searchFilter={searchFilterByLabel}
          groupBy="group"
          optionRenderer={ColumnPickerOptionContent}
          renderSelected={() =>
            icon ? (
              <>
                {icon} {title}
              </>
            ) : (
              title
            )
          }
          placeholder={title}
          dataTestid={dataTestId}
          triggerClassName={className}
          triggerProps={{
            style: {
              height: 32,
              minWidth: 110,
              color: "var(--color-neutral-content)",
              fontSize: "var(--font-size-14)",
              fontWeight: "var(--font-weight-medium)",
            },
          }}
        />
      );

      return tooltip ? (
        <div className={`${cn("field-button").toClassName()} h-[40px] flex items-center`} style={{ zIndex: 1000 }}>
          <Tooltip title={tooltip}>{selectTrigger}</Tooltip>
        </div>
      ) : (
        selectTrigger
      );
    },
  ),
);

// Kept for backward compatibility — no longer used internally but may be
// referenced by external consumers.
FieldsButton.Checkbox = observer(({ column, children, disabled, enterpriseBadge }) => {
  return (
    <div className="w-full flex items-center justify-between gap-tight">
      <div className="flex-1 flex items-center min-w-0 overflow-hidden">
        <input
          type="checkbox"
          size="small"
          checked={!column.is_hidden}
          onChange={column.toggleVisibility}
          disabled={disabled}
        />
        {children}
      </div>
      {enterpriseBadge && (
        <div style={{ flexShrink: 0 }}>
          <Badge variant="gradient" style="ghost" />
        </div>
      )}
    </div>
  );
});
