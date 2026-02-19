import React from "react";
import styles from "./Columns.module.scss";

export const Columns = ({ children, count, size, gap }) => {
  /**@type {import('react').RefObject<HTMLElement>} */
  const ref = React.useRef();

  /**@type {import('react').CSSProperties} */
  const style = {
    "--columns": Math.max(1, count ?? 1),
    "--column-width": size,
    "--column-gap": gap,
  };

  return <div ref={ref} className={styles["columns"]} style={style} children={children} />;
};

Columns.Column = ({ title, children }) => {
  return (
    <div className={styles["columns"]}>
      <div className={`${styles["columns"]} ${styles["columns__title"]}`}>{title}</div>
      {children}
    </div>
  );
};
