import { ArrowDownIcon, ArrowUpIcon } from "@humansignal/icons";
import { Button, ButtonGroup, Tooltip } from "@humansignal/ui";
import { inject, observer } from "mobx-react";
import { useTranslation } from "react-i18next";
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
    const { t } = useTranslation();
    const isLocked = view?.isLockedByManager;
    const lockedTooltip = view?.lockedUpdateMessage;
    const content = (
      <ButtonGroup collapsed {...rest}>
        <ColumnPicker
          columns={columns}
          columnFilter={orderableFilter}
          value={ordering?.field ?? null}
          onChange={(key) => view.setOrdering(key)}
          placeholder={t("dataManager:orderBy")}
          disabled={isLocked}
          triggerProps={{
            style: {
              padding: "var(--spacing-tight)",
            },
          }}
        />

        <Tooltip
          title={
            isLocked ? lockedTooltip : ordering?.desc ? t("dataManager:sortAscending") : t("dataManager:sortDescending")
          }
        >
          <Button
            size={size}
            look="outlined"
            variant="neutral"
            disabled={!ordering || isLocked}
            onClick={() => view.setOrdering(ordering?.field)}
            aria-label={ordering?.desc ? t("dataManager:sortAscending") : t("dataManager:sortDescending")}
            data-testid="dm-order-button"
          >
            {ordering?.desc ? <ArrowUpIcon size={14} weight="bold" /> : <ArrowDownIcon size={14} weight="bold" />}
          </Button>
        </Tooltip>
      </ButtonGroup>
    );
    return (
      <Space style={{ fontSize: 12, ...(isLocked && { opacity: 0.5 }) }} className="orderButton">
        {isLocked ? (
          <Tooltip title={lockedTooltip}>
            <div>{content}</div>
          </Tooltip>
        ) : (
          content
        )}
      </Space>
    );
  }),
);
