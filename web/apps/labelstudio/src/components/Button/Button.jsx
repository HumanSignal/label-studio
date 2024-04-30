import React from "react";
import { Block, Elem } from "../../utils/bem";
import { isDefined } from "../../utils/helpers";
import { FormSubmissionContext } from "../Form/FormContext";
import "./Button.styl";

export const Button = React.forwardRef(
  ({ children, type, extra, className, size, waiting, icon, tag, look, ...rest }, ref) => {
    const finalTag = tag ?? (rest.href ? "a" : "button");

    const mods = {
      size,
      waiting,
      type,
      look: look ?? [],
      withIcon: !!icon,
      withExtra: !!extra,
    };

    const formSubmitting = React.useContext(FormSubmissionContext);

    if (formSubmitting === true) {
      if (mods.look?.includes?.("primary") && type === "submit") {
        mods.waiting = true;
      } else {
        rest.disabled = true;
      }
    }

    if (rest.primary) {
      mods.look = "primary";
      delete rest.primary;
    }

    const iconElem = React.useMemo(() => {
      if (!icon) return null;
      if (isDefined(icon.props.size)) return icon;

      switch (size) {
        case "small":
          return React.cloneElement(icon, { ...icon.props, size: 12, width: 12, height: 12 });
        case "compact":
          return React.cloneElement(icon, { ...icon.props, size: 14, width: 14, height: 14 });
        default:
          return icon;
      }
    }, [icon, size]);

    return (
      <Block name="button" mod={mods} mix={className} ref={ref} tag={finalTag} type={type} {...rest}>
        <>
          {iconElem && (
            <Elem tag="span" name="icon">
              {iconElem}
            </Elem>
          )}
          {iconElem && children ? <span>{children}</span> : children}
          {extra !== undefined ? <Elem name="extra">{extra}</Elem> : null}
        </>
      </Block>
    );
  },
);
Button.displayName = "Button";

Button.Group = ({ className, children, collapsed }) => {
  return (
    <Block name="button-group" mod={{ collapsed }} mix={className}>
      {children}
    </Block>
  );
};
