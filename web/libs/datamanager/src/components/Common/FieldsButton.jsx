import { Button, Checkbox, Dropdown, EnterpriseBadge } from "@humansignal/ui";
import { inject, observer } from "mobx-react";
import React from "react";
import { cn } from "../../utils/bem";
import { Menu } from "./Menu/Menu";

const injector = inject(({ store }) => {
  return {
    columns: Array.from(store.currentView?.targetColumns ?? []),
  };
});

const FieldsMenu = observer(({ columns, WrapperComponent, onClick, onReset, selected, resetTitle }) => {
  const MenuItem = (col, onClick) => {
    const enterpriseBadge = col.enterprise_badge ?? col.original?.enterprise_badge;
    const shouldDisable = col.disabled || enterpriseBadge;

    const titleContent = <span>{col.title}</span>;

    return (
      <Menu.Item key={col.key} name={col.key} onClick={onClick} disabled={shouldDisable}>
        {WrapperComponent && col.wra !== false ? (
          <WrapperComponent column={col} disabled={shouldDisable} enterpriseBadge={enterpriseBadge}>
            {titleContent}
          </WrapperComponent>
        ) : (
          <span className="flex items-center justify-between w-full gap-base">
            {titleContent}
            {enterpriseBadge && <EnterpriseBadge ghost />}
          </span>
        )}
      </Menu.Item>
    );
  };

  return (
    <Menu size="small" selectedKeys={selected ? [selected] : ["none"]} closeDropdownOnItemClick={false}>
      {onReset &&
        MenuItem(
          {
            key: "none",
            title: resetTitle ?? "Default",
            wrap: false,
          },
          onReset,
        )}

      {columns.map((col) => {
        if (col.children) {
          return (
            <Menu.Group key={col.key} title={col.title}>
              {col.children.map((col) => MenuItem(col, () => onClick?.(col)))}
            </Menu.Group>
          );
        }
        if (!col.parent) {
          return MenuItem(col, () => onClick?.(col));
        }

        return null;
      })}
    </Menu>
  );
});

export const FieldsButton = injector(
  ({
    columns,
    size,
    style,
    wrapper,
    title,
    icon,
    className,
    trailingIcon,
    onClick,
    onReset,
    resetTitle,
    filter,
    selected,
    tooltip,
    tooltipTheme = "dark",
    openUpwardForShortViewport = true,
    "data-testid": dataTestId,
  }) => {
    const content = [];

    if (title) content.push(<React.Fragment key="f-button-title">{title}</React.Fragment>);

    const renderButton = () => {
      return (
        <Button
          variant="neutral"
          size="small"
          look="outlined"
          leading={icon}
          trailing={trailingIcon}
          data-testid={dataTestId}
        >
          {content.length ? content : null}
        </Button>
      );
    };

    return (
      <Dropdown.Trigger
        content={
          <FieldsMenu
            columns={filter ? columns.filter(filter) : columns}
            WrapperComponent={wrapper}
            onClick={onClick}
            size={size}
            onReset={onReset}
            selected={selected}
            resetTitle={resetTitle}
          />
        }
        style={{ maxHeight: 280, overflow: "auto" }}
        openUpwardForShortViewport={openUpwardForShortViewport}
      >
        {tooltip ? (
          <div className={`${cn("field-button").toClassName()} h-[40px] flex items-center`} style={{ zIndex: 1000 }}>
            <Button
              tooltip={tooltip}
              variant="neutral"
              size={size}
              look="outlined"
              leading={icon}
              trailing={trailingIcon}
              data-testid={dataTestId}
            >
              {content.length ? content : null}
            </Button>
          </div>
        ) : (
          renderButton()
        )}
      </Dropdown.Trigger>
    );
  },
);

FieldsButton.Checkbox = observer(({ column, children, disabled, enterpriseBadge }) => {
  const shouldDisable = disabled;

  return (
    <div style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "8px" }}>
      <div style={{ flex: 1, minWidth: 0, overflow: "hidden" }}>
        <Checkbox size="small" checked={!column.is_hidden} onChange={column.toggleVisibility} disabled={shouldDisable}>
          {children}
        </Checkbox>
      </div>
      {enterpriseBadge && (
        <div style={{ flexShrink: 0 }}>
          <EnterpriseBadge ghost />
        </div>
      )}
    </div>
  );
});
