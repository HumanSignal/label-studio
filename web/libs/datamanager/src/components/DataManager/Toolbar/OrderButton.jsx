import { IconSortDown, IconSortUp } from "@humansignal/icons";
import { Button, ButtonGroup, Select } from "@humansignal/ui";
import { inject, observer } from "mobx-react";
import { useMemo } from "react";
import {
  COLUMN_VALUE_PREFIX,
  ColumnPickerOptionContent,
  columnsToPickerGroups,
  pickerGroupsToFlatOptions,
  searchFilterByLabel,
  stripColumnPrefix,
} from "../../Common/ColumnPickerList";
import { Space } from "../../Common/Space/Space";
import "./OrderButton.scss";

const orderableFilter = (col) => col.orderable ?? col.original?.orderable;

const DEFAULT_ORDER_VALUE = "__default__";

const injector = inject(({ store }) => {
  const view = store?.currentView;

  return {
    view,
    ordering: view?.currentOrder,
    columns: Array.from(view?.targetColumns ?? []),
  };
});

export const OrderButton = injector(
  observer(({ size, ordering, view, columns, ...rest }) => {
    const groups = useMemo(() => columnsToPickerGroups(columns, orderableFilter), [columns]);
    const columnOptions = useMemo(() => pickerGroupsToFlatOptions(groups), [groups]);
    const flatOptions = useMemo(
      () => [{ value: DEFAULT_ORDER_VALUE, label: "Default", group: null }, ...columnOptions],
      [columnOptions],
    );
    const value = ordering?.field ? COLUMN_VALUE_PREFIX + ordering.field : DEFAULT_ORDER_VALUE;

    return (
      <Space style={{ fontSize: 12 }} className="orderButton">
        <ButtonGroup collapsed {...rest}>
          <Select
            options={flatOptions}
            value={value}
            onChange={(newValue) =>
              view.setOrdering(newValue === DEFAULT_ORDER_VALUE ? null : stripColumnPrefix(newValue))
            }
            searchable
            searchPlaceholder="Search columns"
            searchFilter={searchFilterByLabel}
            groupBy="group"
            optionRenderer={ColumnPickerOptionContent}
            placeholder="Order by"
            renderSelected={(selectedOptions) => {
              const opt = selectedOptions?.[0];
              const v = opt?.value ?? opt;
              return v === DEFAULT_ORDER_VALUE ? "Order by" : (opt?.label ?? opt?.title ?? v);
            }}
            size={size}
            triggerProps={{
              style: {
                height: 32,
                padding: "var(--spacing-tight)",
                color: "var(--color-neutral-content)",
                fontSize: "var(--font-size-14)",
                fontWeight: "var(--font-weight-medium)",
              },
            }}
          />

          <Button
            size={size}
            look="outlined"
            variant="neutral"
            disabled={!!ordering === false}
            onClick={() => view.setOrdering(ordering?.field)}
            aria-label={ordering?.desc ? "Sort ascending" : "Sort descending"}
          >
            {ordering?.desc ? <IconSortUp /> : <IconSortDown />}
          </Button>
        </ButtonGroup>
      </Space>
    );
  }),
);
