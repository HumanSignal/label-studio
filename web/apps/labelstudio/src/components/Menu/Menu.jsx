import { forwardRef, useCallback, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { cn } from "../../utils/bem";
import { useDropdown } from "@humansignal/ui";
import "./Menu.scss";
import { MenuContext } from "./MenuContext";
import { MenuItem } from "./MenuItem";

export const Menu = forwardRef(
  ({ children, className, style, size, selectedKeys, closeDropdownOnItemClick, contextual }, ref) => {
    const dropdown = useDropdown();

    const selected = useMemo(() => {
      return new Set(selectedKeys ?? []);
    }, [selectedKeys]);

    const clickHandler = useCallback(
      (e) => {
        const elem = cn("main-menu").elem("item").closest(e.target);

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
          className={cn("main-menu").mod({ size, collapsed, contextual }).mix(className).toClassName()}
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
Menu.Spacer = () => <li className={cn("main-menu").elem("spacer").toClassName()} />;
Menu.Divider = () => <li className={cn("main-menu").elem("divider").toClassName()} />;
Menu.Builder = (url, menuItems) => {
  return (menuItems ?? []).map((item, index) => {
    if (item === "SPACER") return <Menu.Spacer key={index} />;
    if (item === "DIVIDER") return <Menu.Divider key={index} />;

    let pageLabel;
    let pagePath;

    if (Array.isArray(item)) {
      [pagePath, pageLabel] = item;
    } else {
      const { menuItem, title, path } = item;
      pageLabel = title ?? menuItem;
      pagePath = path;
    }

    if (typeof pagePath === "function") {
      return (
        <Menu.Item key={index} onClick={pagePath}>
          {pageLabel}
        </Menu.Item>
      );
    }

    const location = `${url}${pagePath}`.replace(/([/]+)/g, "/");

    return (
      <Menu.Item key={index} to={location} exact>
        {pageLabel}
      </Menu.Item>
    );
  });
};

Menu.Group = ({ children, title, className, style }) => {
  const { t } = useTranslation();
  const renderedTitle = typeof title === "string" ? t(title, { defaultValue: title }) : title;

  return (
    <div className={cn("menu-group").mix(className).toClassName()} style={style}>
      <div className={cn("menu-group").elem("title").toClassName()}>{renderedTitle}</div>
      <ul className={cn("menu-group").elem("list").toClassName()}>{children}</ul>
    </div>
  );
};
