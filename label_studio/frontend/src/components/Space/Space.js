import React from "react";
import { Block } from "../../utils/bem";
import "./Space.styl";

export const Space = ({
  direction = "horizontal",
  size,
  className,
  style,
  children,
  spread,
  stretch,
  align,
}) => {
  return (
    <Block name="space" mod={{ direction, size, spread, stretch, align }} mix={className} style={style}>
      {children}
    </Block>
  );
};
