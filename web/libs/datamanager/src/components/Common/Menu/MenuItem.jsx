import React from "react";
import { cn } from "../../../utils/bem";
import { MenuContext } from "./MenuContext";
import { Tooltip } from "@humansignal/ui";

export const MenuItem = ({
  name,
  children,
  label,
  icon,
  to,
  className,
  href,
  danger, // deprecated, use variant="negative" instead
  variant,
  exact = false,
  forceReload = false,
  active = false,
  onClick,
  disabled,
  tooltip,
  tooltipAlignment = "bottom-center",
  ...rest
}) => {
  const { selected } = React.useContext(MenuContext);
  const rootClass = cn("menu-dm", { elem: "item" });
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

  // Support both deprecated danger prop and new variant prop
  const isNegative = danger || variant === "negative";

  const handleClick = (e) => {
    if (disabled) {
      e.preventDefault();
      e.stopPropagation();
      return;
    }
    onClick?.(e);
  };

  const linkAttributes = {
    className: rootClass
      .mod({
        active: isActive || active,
        look: isNegative && "danger", // Keep existing CSS class for compatibility
      })
      .mix(className),
    onClick: handleClick,
    disabled: disabled || undefined,
    "aria-disabled": disabled || undefined,
    ...rest,
  };

  if (forceReload && !disabled) {
    linkAttributes.onClick = () => {
      window.location.href = to ?? href;
    };
  }

  const menuItem = (
    <li>
      {href ? (
        <a href={disabled ? undefined : (href ?? "#")} {...linkAttributes}>
          {linkContent}
        </a>
      ) : (
        <div {...linkAttributes}>{linkContent}</div>
      )}
    </li>
  );

  // Only wrap in tooltip if tooltip prop is provided and should be shown
  if (tooltip) {
    return (
      <Tooltip title={tooltip} alignment={tooltipAlignment}>
        {menuItem}
      </Tooltip>
    );
  }

  return menuItem;
};
