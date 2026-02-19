import styles from "./EmptyState.module.scss";

export const EmptyState = ({ icon, title, description, action, footer }) => {
  return (
    <div className={styles["empty-state-default"]}>
      {icon && <div className={`${styles["empty-state-default"]} ${styles["empty-state-default__icon"]}`}>{icon}</div>}
      {title && (
        <div className={`${styles["empty-state-default"]} ${styles["empty-state-default__title"]}`}>{title}</div>
      )}
      {description && (
        <div className={`${styles["empty-state-default"]} ${styles["empty-state-default__description"]}`}>
          {description}
        </div>
      )}
      {action && (
        <div className={`${styles["empty-state-default"]} ${styles["empty-state-default__action"]}`}>{action}</div>
      )}
      {footer && (
        <div className={`${styles["empty-state-default"]} ${styles["empty-state-default__footer"]}`}>{footer}</div>
      )}
    </div>
  );
};
