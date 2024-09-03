import React from "react";
import { BemWithSpecifiContext } from "../../utils/bem";
import "./Space.scss";

const { Block } = BemWithSpecifiContext();

export const Space = ({ direction = "horizontal", size, className, style, children, spread, stretch, align }) => {
  return (
    <Block name="space-ls" mod={{ direction, size, spread, stretch, align }} mix={className} style={style}>
      {children}
    </Block>
  );
};
