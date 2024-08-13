import { forwardRef } from "react";
import { Block, Elem } from "../../../../../utils/bem";
import "./Label.scss";

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

    return (
      <Block ref={ref} name="label-dm" tag={tagName} style={style} mod={mods} data-required={required}>
        <Elem name="text">
          <Elem name="content">
            {text}
            {description && <Elem name="description">{description}</Elem>}
          </Elem>
        </Elem>
        <Elem name="field">{children}</Elem>
      </Block>
    );
  },
);

export default Label;
