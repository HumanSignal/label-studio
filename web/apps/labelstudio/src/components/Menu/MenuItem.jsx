import { NavLink } from "react-router-dom";
import { cn } from "../../utils/bem";
import { absoluteURL } from "../../utils/helpers";
import { useTranslation } from "react-i18next";

export const MenuItem = ({
  children,
  label,
  icon,
  to,
  className,
  href,
  exact = false,
  forceReload = false,
  active = false,
  isDangerous = false,
  onClick,
  ...rest
}) => {
  const { t } = useTranslation();
  const rootClass = cn("main-menu", { elem: "item" });
  const classList = [rootClass.toClassName()];
  const isActive = (() => {
    const pathname = location.pathname.replace(/\/$/, "");
    const url = to ?? href;

    if (exact) {
      return pathname === url;
    }
    return pathname.includes(url);
  })();

  if (isActive || active) classList.push(rootClass.mod({ active: true }));

  if (isDangerous) classList.push(rootClass.mod({ dangerous: true }));

  if (className) classList.push(className);

  const renderLabel = () => {
    const raw = children ?? label;
    if (typeof raw === "string") return t(raw, { defaultValue: raw });
    return raw;
  };

  const linkContent = (
    <>
      {icon && <span className={rootClass.elem("item-icon")}>{icon}</span>}
      {renderLabel()}
    </>
  );

  const linkAttributes = {
    className: classList.join(" "),
    onClick,
    ...rest,
  };

  const activeClassName = rootClass.mod({ active: true }).toClassName();
  const finalHref = to ?? href;

  if (forceReload) {
    linkAttributes.onClick = () => (location.href = to ?? href);
  }

  return (
    <li>
      {to ? (
        <NavLink to={finalHref} {...linkAttributes} exact={exact} activeClassName={activeClassName} data-external>
          {linkContent}
        </NavLink>
      ) : finalHref ? (
        <a href={absoluteURL(finalHref)} {...linkAttributes}>
          {linkContent}
        </a>
      ) : (
        <span {...linkAttributes}>{linkContent}</span>
      )}
    </li>
  );
};
