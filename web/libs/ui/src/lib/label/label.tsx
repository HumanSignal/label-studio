import type { PropsWithChildren } from "react";
import clsx from "clsx";
import styles from "./label.module.css";
type LabelProps = PropsWithChildren<{
  text: string;
  required?: boolean;
  placement?: "right" | "left";
  description?: string;
  size?: "large" | "small";
  className?: string;
  style?: React.CSSProperties;
  simple?: boolean;
  flat?: boolean;
}>;

export const Label = ({
  text,
  children,
  required,
  placement = "left",
  className,
  description,
  size = "small",
  style: inlineStyle,
  simple,
  flat,
}: LabelProps) => {
  const TagName = simple ? "div" : "label";

  return (
    <TagName
      style={inlineStyle}
      data-required={required}
      className={clsx(styles.label, className, {
        [styles.label_size_small]: size === "small",
        [styles.label_size_large]: size === "large",
        [styles.label_flat]: flat,
        [styles.label_placement_left]: placement === "left",
        [styles.label_placement_right]: placement === "right",
        [styles.label_withDescription]: !!description,
        [styles.label_empty]: !children,
      })}
    >
      <span className={clsx(styles.label__text)}>
        <span className={clsx(styles.label__content)}>
          {text}
          {description && <span className={clsx(styles.label__description)}>{description}</span>}
        </span>
      </span>
      <span className={clsx(styles.label__field)}>{children}</span>
    </TagName>
  );
};
