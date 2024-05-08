import React from "react";
import { cn } from "../../../utils/bem";
import { MenuContext } from "./MenuContext";

export const MenuItem = ({
  name,
  children,
  label,
  icon,
  to,
  className,
  href,
  danger,
  exact = false,
  forceReload = false,
  active = false,
  onClick,
  ...rest
}) => {
  const { selected } = React.useContext(MenuContext);
  const rootClass = cn("menu", { elem: "item" });
  const isActive = (() => {
    const pathname = window.location.pathname.replace(/\/$/, "");
    const url = to ?? href;

    if (selected.has(name)) {
      return true;
    }
    if (exact) {
      return pathname === url;
    }
    return pathname.includes(url);
  })();

  const linkContent = (
    <>
      {icon && <span className={rootClass.elem("item-icon")}>{icon}</span>}
      {children ?? label}
    </>
  );

  const linkAttributes = {
    className: rootClass
      .mod({
        active: isActive || active,
        look: danger && "danger",
      })
      .mix(className),
    onClick,
    ...rest,
  };

  if (forceReload) {
    linkAttributes.onClick = () => (window.location.href = to ?? href);
  }

  return (
    <li>
      {href ? (
        <a href={href ?? "#"} {...linkAttributes}>
          {linkContent}
        </a>
      ) : (
        <div {...linkAttributes}>{linkContent}</div>
      )}
    </li>
  );
};
