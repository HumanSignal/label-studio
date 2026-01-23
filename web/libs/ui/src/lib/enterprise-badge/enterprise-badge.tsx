import clsx from "clsx";
import type { FC } from "react";
import { IconSpark } from "../../assets/icons";
import styles from "./enterprise-badge.module.scss";

/* eslint-disable-next-line */
export interface EnterpriseBadgeProps {
  className?: string;
  filled?: boolean;
  compact?: boolean;
  ghost?: boolean;
}

export const EnterpriseBadge: FC<EnterpriseBadgeProps> = ({ className, filled, compact, ghost }) => {
  return (
    <div
      className={clsx(
        styles.badge,
        { [styles.filled]: filled, [styles.compact]: compact, [styles.ghost]: ghost },
        className,
      )}
    >
      <div className={clsx(styles.label)}>
        <IconSpark className={clsx(styles.icon)} />
        {!compact && "Enterprise"}
      </div>
    </div>
  );
};

export default EnterpriseBadge;
