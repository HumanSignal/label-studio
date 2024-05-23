import { inject, observer } from "mobx-react";
import React from "react";
import { Button } from "./Button/Button";
import { Checkbox } from "./Checkbox/Checkbox";
import { Dropdown } from "./Dropdown/Dropdown";
import { Menu } from "./Menu/Menu";
import { Tooltip } from "./Tooltip/Tooltip";
import { Elem } from "../../utils/bem";

const injector = inject(({ store }) => {
  return {
    columns: Array.from(store.currentView?.targetColumns ?? []),
  };
});

const FieldsMenu = observer(({ columns, WrapperComponent, onClick, onReset, selected, resetTitle }) => {
  const MenuItem = (col, onClick) => {
    return (
      <Menu.Item key={col.key} name={col.key} onClick={onClick}>
        {WrapperComponent && col.wra !== false ? (
          <WrapperComponent column={col}>{col.title}</WrapperComponent>
        ) : (
          col.title
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
  }) => {
    const content = [];

    if (title) content.push(<React.Fragment key="f-button-title">{title}</React.Fragment>);

    const renderButton = () => {
      return (
        <Button size={size} icon={icon} extra={trailingIcon} style={style} className={className}>
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
            onReset={onReset}
            selected={selected}
            resetTitle={resetTitle}
          />
        }
        style={{
          maxHeight: 280,
          overflow: "auto",
        }}
      >
        {tooltip ? (
          <Elem name={"field-button"} style={{ zIndex: 1000 }}>
            <Tooltip title={tooltip} theme={tooltipTheme}>
              {renderButton()}
            </Tooltip>
          </Elem>
        ) : (
          renderButton()
        )}
      </Dropdown.Trigger>
    );
  },
);

FieldsButton.Checkbox = observer(({ column, children }) => {
  return (
    <Checkbox
      size="small"
      checked={!column.hidden}
      onChange={column.toggleVisibility}
      style={{ width: "100%", height: "100%" }}
    >
      {children}
    </Checkbox>
  );
});
