import { EnterpriseBadge, Tooltip } from "@humansignal/ui";
import { inject, observer } from "mobx-react";
import { useCallback, useMemo } from "react";
import { flushSync } from "react-dom";
import { cn } from "../../utils/bem";
import { ColumnPicker } from "./ColumnPicker";

const injector = inject(({ store }) => {
  return {
    view: store.currentView,
    columns: Array.from(store.currentView?.targetColumns ?? []),
  };
});

/**
 * Columns visibility picker (multi-select). Used by toolbar and Table quick view.
 * Single-select pickers (Order By, Filter column) use ColumnPicker directly.
 */

export const FieldsButton = injector(
  observer(({ view, columns, title, icon, filter, tooltip, className, "data-testid": dataTestId }) => {
    // `is_hidden` is observable, so it has to be read on every render: memoizing on `columns`
    // alone froze the selection at whatever was visible when the column list was last rebuilt,
    // and the picker restored that stale selection whenever it remounted (FIT-2406). The memo
    // only keeps the array reference stable, since ColumnPicker re-seeds on a new `value`.
    const visibleColumnKeys = columns.filter((c) => !c.is_hidden).map((c) => c.key);
    const visibleColumnsSignature = visibleColumnKeys.join("\u0000");
    const value = useMemo(() => visibleColumnKeys, [visibleColumnsSignature]);
    const readOnly = view?.isLockedByManager;

    const handleChange = useCallback(
      (keys) => {
        if (readOnly) return;
        const selectedSet = new Set(keys ?? []);
        flushSync(() => {
          for (const col of columns) {
            if (!col.toggleVisibility) continue;
            const shouldBeVisible = selectedSet.has(col.key);
            const isVisible = !col.is_hidden;
            if (shouldBeVisible !== isVisible) col.toggleVisibility();
          }
        });
      },
      [columns, readOnly],
    );

    const picker = (
      <ColumnPicker
        columns={columns}
        columnFilter={filter}
        value={value}
        onChange={handleChange}
        multiple
        placeholder={title}
        renderSelected={() =>
          icon ? (
            <>
              {icon} {title}
            </>
          ) : (
            title
          )
        }
        dataTestid={dataTestId}
        readOnly={readOnly}
        triggerClassName={className}
        triggerProps={{
          style: {
            minWidth: 110,
          },
        }}
      />
    );

    return tooltip && !readOnly ? (
      <Tooltip title={tooltip}>
        <div className={`${cn("field-button").toClassName()} flex items-center`} style={{ zIndex: 1000 }}>
          {picker}
        </div>
      </Tooltip>
    ) : (
      picker
    );
  }),
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
          <EnterpriseBadge look="ghost" />
        </div>
      )}
    </div>
  );
});
