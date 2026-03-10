import clsx from "clsx";
import type { HTMLAttributes, PropsWithChildren } from "react";
import styles from "./callout.module.css";

export const CalloutVariants = {
  warning: clsx(styles.variantWarning),
};

export type CalloutVariant = keyof typeof CalloutVariants;

export function Callout({
  children,
  className,
  variant,
  ...rest
}: PropsWithChildren<HTMLAttributes<HTMLDivElement> & { variant: CalloutVariant }>) {
  const cls = clsx(styles.callout, CalloutVariants[variant], className);
  return (
    <div className={cls} {...rest}>
      {children}
    </div>
  );
}

export function CalloutIcon({ children, className, ...rest }: PropsWithChildren<HTMLAttributes<HTMLDivElement>>) {
  const cls = clsx("", className);
  return (
    <div className={cls} {...rest}>
      {children}
    </div>
  );
}

export function CalloutHeader({ children, className, ...rest }: PropsWithChildren<HTMLAttributes<HTMLDivElement>>) {
  const cls = clsx(styles.header, className);
  return (
    <div className={cls} {...rest}>
      {children}
    </div>
  );
}

export function CalloutTitle({ children, className, ...rest }: PropsWithChildren<HTMLAttributes<HTMLDivElement>>) {
  const cls = clsx(styles.title, className);
  return (
    <div className={cls} {...rest}>
      {children}
    </div>
  );
}

export function CalloutContent({ children, className, ...rest }: PropsWithChildren<HTMLAttributes<HTMLDivElement>>) {
  const cls = clsx(styles.content, className);
  return (
    <div className={cls} {...rest}>
      {children}
    </div>
  );
}
