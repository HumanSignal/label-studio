import { Button, Checkbox, Dropdown, EnterpriseBadge } from "@humansignal/ui";
import { inject, observer } from "mobx-react";
import React from "react";
import { cn } from "../../utils/bem";
import { Menu } from "./Menu/Menu";
import { isReviewingAllowed } from "@humansignal/core";

const injector = inject(({ store }) => {
  return {
    columns: Array.from(store.currentView?.targetColumns ?? []),
  };
});

const FieldsMenu = observer(({ columns, WrapperComponent, onClick, onReset, selected, resetTitle }) => {
  const MenuItem = (col, onClick) => {
    const shouldDisable = col.disabled || col.enterprise;

    const titleContent = (
      <span className="flex items-center justify-between w-full gap-base">
        <span>{col.title}</span>
        {col.enterprise && <EnterpriseBadge ghost />}
      </span>
    );

    return (
      <Menu.Item key={col.key} name={col.key} onClick={onClick} disabled={shouldDisable}>
        {WrapperComponent && col.wra !== false ? (
          <WrapperComponent column={col} disabled={shouldDisable}>
            {titleContent}
          </WrapperComponent>
        ) : (
          titleContent
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

FieldsButton.Checkbox = observer(({ column, children, disabled }) => {
  const shouldDisable = disabled || (column.enterprise === true && !isReviewingAllowed());

  return (
    <Checkbox
      size="small"
      checked={!column.hidden}
      onChange={column.toggleVisibility}
      style={{ width: "100%", height: "100%" }}
      disabled={shouldDisable}
    >
      {children}
    </Checkbox>
  );
});
