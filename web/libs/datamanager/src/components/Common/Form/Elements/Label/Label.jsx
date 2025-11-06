import { forwardRef, createElement } from "react";
import { cn } from "../../../../../utils/bem";
import "./Label.scss";
/** @deprecated - needs to be replaced with @humansignal/ui Label - visualizes differently currently */
const Label = forwardRef(
  ({ text, children, required, placement, description, size, large, style, simple, flat }, ref) => {
    const tagName = simple ? "div" : "label";
    const mods = {
      size,
      large,
      flat,
      placement,
      withDescription: !!description,
      empty: !children,
    };

    return createElement(
      tagName,
      {
        ref,
        className: cn("label-dm").mod(mods).toClassName(),
        style,
        "data-required": required,
      },
      <div className={cn("label-dm").elem("text").toClassName()}>
        <div className={cn("label-dm").elem("content").toClassName()}>
          {text}
          {description && <div className={cn("label-dm").elem("description").toClassName()}>{description}</div>}
        </div>
      </div>,
      <div className={cn("label-dm").elem("field").toClassName()}>{children}</div>,
    );
  },
);

export default Label;
