import { createElement } from "react";
import { IconInfoOutline } from "@humansignal/icons";
import { Tooltip } from "@humansignal/ui";
import { cn } from "../../../../utils/bem";
import "./Label.scss";
import { clsx } from "clsx";
/** @deprecated - needs to be replaced with @humansignal/ui Label - visualizes differently currently */
const Label = ({
  text,
  children,
  required,
  placement,
  description,
  footer,
  size,
  large,
  style,
  simple,
  flat,
  className,
  tooltip,
  tooltipIcon,
}) => {
  const rootClass = cn("label-ls");
  const classList = [rootClass.toClassName()];
  const tagName = simple ? "div" : "label";
  const mods = {
    size,
    large,
    flat,
    placement,
    withDescription: !!description,
    withFooter: !!footer,
    empty: !children,
  };

  classList.push(rootClass.mod(mods).toClassName());
  const rootProps = {
    className: clsx(classList, className),
    style: style,
  };

  if (required) {
    rootProps["data-required"] = true;
  }

  return createElement(
    tagName,
    rootProps,
    <>
      <div className={rootClass.elem("text").toClassName()}>
        <div className={rootClass.elem("content").toClassName()}>
          <div className={rootClass.elem("label").toClassName()}>
            <span>{text}</span>
            {tooltip && (
              <div className={rootClass.elem("tooltip").toClassName()}>
                <Tooltip title={tooltip}>{tooltipIcon ? tooltipIcon : <IconInfoOutline />}</Tooltip>
              </div>
            )}
          </div>
          {description && <div className={rootClass.elem("description").toClassName()}>{description}</div>}
        </div>
      </div>
      <div className={rootClass.elem("field").toClassName()}>{children}</div>
      {footer && <div className={rootClass.elem("footer").toClassName()}>{footer}</div>}
    </>,
  );
};

export default Label;
