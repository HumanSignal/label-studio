import React, { useCallback, useMemo } from "react";
import clsx from "clsx";
import { cn } from "../../../utils/bem";
import { useDropdown } from "@humansignal/ui";
import "./Menu.scss";
import { MenuContext } from "./MenuContext";
import { MenuItem } from "./MenuItem";

const menuCN = cn("menu-dm");

export const Menu = React.forwardRef(
  ({ children, className, style, size, selectedKeys, closeDropdownOnItemClick }, ref) => {
    const dropdown = useDropdown();

    const selected = useMemo(() => {
      return new Set(selectedKeys ?? []);
    }, [selectedKeys]);

    const clickHandler = useCallback(
      (e) => {
        const elem = menuCN.elem("item").closest(e.target);

        if (dropdown && elem && closeDropdownOnItemClick !== false) {
          dropdown.close();
        }
      },
      [dropdown],
    );

    const collapsed = useMemo(() => {
      return !!dropdown;
    }, [dropdown]);

    return (
      <MenuContext.Provider value={{ selected }}>
        <ul
          ref={ref}
          className={clsx(menuCN.toClassName(), menuCN.mod({ size, collapsed }).toClassName(), className)}
          style={style}
          onClick={clickHandler}
        >
          {children}
        </ul>
      </MenuContext.Provider>
    );
  },
);

Menu.Item = MenuItem;
Menu.Spacer = () => <li className={cn("menu-dm", { elem: "spacer" })} />;
Menu.Divider = () => <li className={cn("menu-dm", { elem: "divider" })} />;
Menu.Builder = (url, menuItems) => {
  return (menuItems ?? []).map((item, index) => {
    if (item === "SPACER") return <Menu.Spacer key={index} />;
    if (item === "DIVIDER") return <Menu.Divider key={index} />;

    const [path, label] = item;
    const location = `${url}${path}`.replace(/([/]+)/g, "/");

    return (
      <Menu.Item key={index} to={location} exact>
        {label}
      </Menu.Item>
    );
  });
};

Menu.Group = ({ children, title, className, style }) => {
  const rootClass = cn("menu-group-dm");

  return (
    <li className={rootClass.mix(className).toClassName()} style={style}>
      <div className={rootClass.elem("title").toClassName()}>{title}</div>
      <ul className={rootClass.elem("list").toClassName()}>{children}</ul>
    </li>
  );
};
