import type { CSSProperties } from "react";
import styles from "./toggle-items.module.scss";

export interface ToggleItemsProps {
  className?: string;
  style?: CSSProperties;
  big?: boolean;
  items: { [name: string]: string };
  active: string;
  onSelect: (name: string) => void;
}

export const ToggleItems = ({ className = "", style, big, items, active, onSelect }: ToggleItemsProps) => {
  const rootClass = `${styles.toggleItems} ${big ? styles.toggleItemsBig : ""} ${className}`;

  return (
    <ul className={rootClass} style={style}>
      {Object.keys(items).map((item) => (
        <li
          key={item}
          className={`${styles.toggleItemsItem} ${item === active ? styles.toggleItemsItemActive : ""}`}
          onClick={() => onSelect(item)}
        >
          {items[item]}
        </li>
      ))}
    </ul>
  );
};
