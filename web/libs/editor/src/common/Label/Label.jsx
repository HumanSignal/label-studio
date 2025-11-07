import { createElement, forwardRef } from "react";
import { cn } from "../../utils/bem";
import "./Label.scss";

export const Label = forwardRef(
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
        style,
        "data-required": required,
        className: cn("field-label").mod(mods).toClassName(),
      },
      <div className={cn("field-label").elem("text").toClassName()}>
        <div className={cn("field-label").elem("content").toClassName()}>
          {text}
          {description && <div className={cn("field-label").elem("description").toClassName()}>{description}</div>}
        </div>
      </div>,
      <div className={cn("field-label").elem("field").toClassName()}>{children}</div>,
    );
  },
);

export default Label;
