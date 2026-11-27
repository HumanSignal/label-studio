import { useEffect, useState } from "react";
import { NavLink } from "react-router-dom";
import { useConfig } from "../../providers/ConfigProvider";
import { useBreadcrumbs, useFindRouteComponent } from "../../providers/RoutesProvider";
import { cn } from "../../utils/bem";
import { absoluteURL } from "../../utils/helpers";
import { Dropdown } from "@humansignal/ui";
import { Menu } from "../Menu/Menu";
import "./Breadcrumbs.prefix.css";

export const Breadcrumbs = () => {
  const config = useConfig();
  const reactBreadcrumbs = useBreadcrumbs();
  const findComponent = useFindRouteComponent();
  const [breadcrumbs, setBreadcrumbs] = useState(reactBreadcrumbs);

  useEffect(() => {
    if (reactBreadcrumbs.length) {
      setBreadcrumbs(reactBreadcrumbs);
    } else if (config.breadcrumbs) {
      setBreadcrumbs(config.breadcrumbs);
    }
  }, [reactBreadcrumbs, config]);

  return (
    <div className={cn("breadcrumbs").toClassName()}>
      <ul className={cn("breadcrumbs").elem("list").toClassName()}>
        {breadcrumbs.map((item, index, list) => {
          const isLastItem = index === list.length - 1;

          const key = `item-${index}-${item.titleRaw ?? item.key ?? index}`;

          const href = item.href ?? item.path;

          const routeMatch = findComponent(href);
          const isInternal = Array.isArray(routeMatch) ? routeMatch.length > 0 : routeMatch != null;

          const title = (
            <span
              className={cn("breadcrumbs")
                .elem("label")
                .mod({ faded: index === item.length - 1 })
                .toClassName()}
            >
              {item.title}
            </span>
          );

          const extraEl = item.extra ? (
            <span className={cn("breadcrumbs").elem("extra").toClassName()}>{item.extra}</span>
          ) : null;

          const linkWrapperClass = cn("breadcrumbs").elem("link").toClassName();

          const dropdownSubmenu = item.submenu ? (
            <Dropdown>
              <Menu>
                {item.submenu.map((sub, index) => {
                  return (
                    <Menu.Item
                      key={`${index}-${item.title}`}
                      label={sub.title}
                      icon={sub.icon}
                      href={sub.href ?? sub.path}
                      active={sub.active}
                    />
                  );
                })}
              </Menu>
            </Dropdown>
          ) : null;

          return item.onClick ? (
            <li key={key} className={cn("breadcrumbs").elem("item").mod({ last: isLastItem }).toClassName()}>
              <span className={linkWrapperClass}>
                <span onClick={item.onClick}>{title}</span>
              </span>
              {extraEl}
            </li>
          ) : dropdownSubmenu ? (
            <Dropdown.Trigger
              key={key}
              tag="li"
              className={cn("breadcrumbs").elem("item").mod({ last: isLastItem }).toClassName()}
              content={dropdownSubmenu}
            >
              <span className={cn("breadcrumbs").elem("trigger-row").toClassName()}>
                <span className={linkWrapperClass}>
                  <span>{title}</span>
                </span>
                {extraEl}
              </span>
            </Dropdown.Trigger>
          ) : href && !isLastItem ? (
            <li key={key} className={cn("breadcrumbs").elem("item").mod({ last: isLastItem }).toClassName()}>
              <span className={linkWrapperClass}>
                {isInternal ? (
                  <NavLink to={href} data-external={true}>
                    {title}
                  </NavLink>
                ) : (
                  <a href={absoluteURL(href)}>{title}</a>
                )}
              </span>
              {extraEl}
            </li>
          ) : (
            <li key={key} className={cn("breadcrumbs").elem("item").mod({ last: isLastItem }).toClassName()}>
              <span className={linkWrapperClass}>{title}</span>
              {extraEl}
            </li>
          );
        })}
      </ul>
    </div>
  );
};
