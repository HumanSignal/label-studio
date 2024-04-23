import React, { type CSSProperties } from "react";
import { cn } from "../../utils/bem";
import "./ToggleItems.styl";

export const ToggleItems = ({
  className,
  style,
  big,
  items,
  active,
  onSelect,
}: {
  className: string;
  style?: CSSProperties;
  big?: boolean;
  items: { [name: string]: string };
  active: string;
  onSelect: (name: string) => any;
}) => {
  const rootClass = cn("toggle-items");

  return (
    <ul className={rootClass.mod({ big }).mix(className).toString()} style={style}>
      {Object.keys(items).map((item) => (
        <li
          key={item}
          className={rootClass
            .elem("item")
            .mod({ active: item === active })
            .toString()}
          onClick={() => onSelect(item)}
        >
          {items[item]}
        </li>
      ))}
    </ul>
  );
};
