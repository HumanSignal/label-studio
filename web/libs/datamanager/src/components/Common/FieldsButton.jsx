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
    const value = useMemo(() => columns.filter((c) => !c.is_hidden).map((c) => c.key), [columns]);
    const disabled = view?.isLockedByManager;
    const effectiveTooltip = disabled ? view.lockedUpdateMessage : tooltip;

    const handleChange = useCallback(
      (keys) => {
        if (disabled) return;
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
      [columns, disabled],
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
        disabled={disabled}
        triggerClassName={className}
        triggerProps={{
          style: {
            minWidth: 110,
          },
        }}
      />
    );

    return effectiveTooltip ? (
      <Tooltip title={effectiveTooltip}>
        <div
          className={`${cn("field-button").toClassName()} flex items-center`}
          style={{ zIndex: 1000, ...(disabled && { opacity: 0.5 }) }}
        >
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
