import { ArrowDownIcon, ArrowUpIcon, CaretDownIcon } from "@humansignal/icons";
import { Button, ButtonGroup, Tooltip } from "@humansignal/ui";
import { inject, observer } from "mobx-react";
import { ColumnPicker } from "../../Common/ColumnPicker";
import { Space } from "../../Common/Space/Space";
import "./OrderButton.prefix.css";

const orderableFilter = (col) => col.orderable ?? col.original?.orderable;

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
    return (
      <Space style={{ fontSize: 12 }} className="orderButton">
        <ButtonGroup collapsed {...rest}>
          <ColumnPicker
            columns={columns}
            columnFilter={orderableFilter}
            value={ordering?.field ?? null}
            onChange={(key) => view.setOrdering(key)}
            placeholder="Order by"
            triggerProps={{
              style: {
                padding: "var(--spacing-tight)",
              },
            }}
          />

          <Tooltip title={ordering?.desc ? "Sort ascending" : "Sort descending"}>
            <Button
              size={size}
              look="outlined"
              variant="neutral"
              disabled={!ordering}
              onClick={() => view.setOrdering(ordering?.field)}
              aria-label={ordering?.desc ? "Sort ascending" : "Sort descending"}
              data-testid="dm-order-button"
            >
              {ordering?.desc ? <ArrowUpIcon size={14} weight="bold" /> : <ArrowDownIcon size={14} weight="bold" />}
            </Button>
          </Tooltip>
        </ButtonGroup>
      </Space>
    );
  }),
);
