import React, { createElement } from "react";
import { cn } from "../../../../utils/bem";
import "./Label.scss";

const Label = ({ text, children, required, placement, description, size, large, style, simple, flat }) => {
  const rootClass = cn("label-ls");
  const classList = [rootClass];
  const tagName = simple ? "div" : "label";
  const mods = {
    size,
    large,
    flat,
    placement,
    withDescription: !!description,
    empty: !children,
  };

  classList.push(rootClass.mod(mods));

  return createElement(
    tagName,
    {
      className: classList.join(" "),
      "data-required": required,
      style: style,
    },
    <>
      <div className={rootClass.elem("text")}>
        <div className={rootClass.elem("content")}>
          <div className={rootClass.elem("label")}>{text}</div>
          {description && <div className={rootClass.elem("description")}>{description}</div>}
        </div>
      </div>
      <div className={rootClass.elem("field")}>{children}</div>
    </>,
  );
};

export default Label;
