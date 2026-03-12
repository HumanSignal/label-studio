import styles from "./SimpleBadge.module.css";

export const SimpleBadge = ({ number, className, ...props }) => (
  <div className={[styles.badge, className].filter(Boolean).join(" ")} {...props}>
    {number}
  </div>
);
