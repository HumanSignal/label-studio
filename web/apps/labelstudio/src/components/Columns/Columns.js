import React from "react";
import { cn } from "../../utils/bem";
import "./Columns.styl";

export const Columns = ({ children, count, size, gap }) => {
  /**@type {import('react').RefObject<HTMLElement>} */
  const ref = React.useRef();

  /**@type {import('react').CSSProperties} */
  const style = {
    "--columns": Math.max(1, count ?? 1),
    "--column-width": size,
    "--column-gap": gap,
  };

  return <div ref={ref} className={cn("columns")} style={style} children={children} />;
};

Columns.Column = ({ title, children }) => {
  return (
    <div className={cn("columns").elem("item")}>
      <div className={cn("columns").elem("title")}>{title}</div>
      {children}
    </div>
  );
};
