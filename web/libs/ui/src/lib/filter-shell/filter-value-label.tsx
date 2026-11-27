import type { ReactNode } from "react";
import styles from "./filter-shell.module.css";

/**
 * Multi-value filter label: primary text at body-small, overflow `+N` at label/smaller.
 * Prefer this over a flat string so CSS can target the count.
 */
export function formatFilterOverflowLabel(primary: ReactNode, remainingCount: number): ReactNode {
  if (remainingCount <= 0) return primary;

  return (
    <span className={styles.valueLabel}>
      <span className={styles.valuePrimary}>{primary}</span>{" "}
      <span className={styles.valueOverflowCount}>+{remainingCount}</span>
    </span>
  );
}
