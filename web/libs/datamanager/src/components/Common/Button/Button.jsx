import React, { cloneElement, forwardRef, useMemo } from "react";
import { Block, Elem } from "../../../utils/bem";
import { FF_LOPS_E_10, isFF } from "../../../utils/feature-flags";
import { isDefined } from "../../../utils/utils";
import "./Button.scss";

export const Button = forwardRef(
  ({ children, type, extra, className, href, size, waiting, icon, tag, look, ...rest }, ref) => {
    const finalTag = tag ?? href ? "a" : "button";

    const mods = {
      size,
      waiting,
      type,
      look,
      withIcon: !!icon,
      withExtra: !!extra,
      disabled: !!rest.disabled,
      newUI: isFF(FF_LOPS_E_10),
    };

    const iconElem = useMemo(() => {
      if (!icon) return null;

      switch (size) {
        case "small":
          return cloneElement(icon, { ...icon.props, size: 12 });
        case "compact":
          return cloneElement(icon, { ...icon.props, size: 14 });
        default:
          return icon;
      }
    }, [icon, size]);

    return (
      <Block
        ref={ref}
        name="button-dm"
        tag={finalTag}
        mod={mods}
        className={className?.toString()}
        type={type}
        {...rest}
      >
        <>
          {isDefined(iconElem) && (
            <Elem tag="span" name="icon">
              {iconElem ?? null}
            </Elem>
          )}
          {isDefined(iconElem) && isDefined(children) ? (
            <Elem tag="span" name="content">
              {children}
            </Elem>
          ) : (
            children ?? null
          )}
          {isDefined(extra) ? <Elem name="extra">{extra}</Elem> : null}
        </>
      </Block>
    );
  },
);
Button.displayName = "Button";

Button.Group = ({ className, children, collapsed, ...rest }) => {
  return (
    <Block name="button-group-dm" mod={{ collapsed }} mix={className} {...rest}>
      {children}
    </Block>
  );
};
