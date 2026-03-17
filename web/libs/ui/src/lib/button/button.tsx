import { cn } from "../../utils/utils";
import { forwardRef, type MouseEvent, type ButtonHTMLAttributes, type PropsWithChildren, type ReactNode } from "react";
import styles from "./button.module.css";
import { setRef } from "@humansignal/core/lib/utils/unwrapRef";
import { Tooltip } from "../Tooltip/Tooltip";

const variants = {
  primary: styles["variant-primary"],
  neutral: styles["variant-neutral"],
  negative: styles["variant-negative"],
  positive: styles["variant-positive"],
  warning: styles["variant-warning"],
  inverted: styles["variant-neutral-interted"],
  gradient: styles["variant-gradient"],
};

const looks = {
  filled: styles["look-filled"],
  string: styles["look-string"],
  outlined: styles["look-outlined"],
};

const sizes = {
  medium: styles["size-medium"], // 40px
  small: styles["size-small"], // 32px
  smaller: styles["size-smaller"], // 24px
};

const alignment = {
  default: styles["align-default"],
  center: styles["align-center"],
  left: styles["align-left"],
  right: styles["align-right"],
};

export type ButtonVariant = ButtonProps["variant"];
export type ButtonLook = ButtonProps["look"];
export type ButtonSize = ButtonProps["size"];

/**
 * Generates a className string with button styling that can be applied to any element
 *
 * This utility function creates a consistent button styling that can be applied not only to
 * button elements but also to other interactive elements like links (`<a>` tags), divs, or spans
 * that need to visually appear as buttons.
 *
 * @example
 * // Apply button styling to a link
 * <a href="/path" className={buttonVariant({ variant: 'primary', look: 'outlined' })}>
 *   Link that looks like a button
 * </a>
 */
export function buttonVariant(
  {
    variant = "primary",
    look = "filled",
    size = "medium",
    align = "default",
    waiting = false,
  }: {
    variant?: ButtonProps["variant"];
    look?: ButtonProps["look"];
    size?: ButtonProps["size"];
    align?: ButtonProps["align"];
    waiting?: boolean;
  } = {},
  className?: string,
) {
  const buttonStyles = [styles.base, variants[variant], looks[look], sizes[size], alignment[align]];
  return cn(
    "inline-flex items-center rounded-smaller border text-shadow-button box-border border transition-all",
    "font-medium text-[color:--text-color] bg-[color:--background-color] bg-[image:--background-image] border-[color:--border-color] shadow-[shadow:--emboss-shadow] text-center",
    "hover:text-[color:--text-color] hover:bg-[color:--background-color-hover] hover:border-[color:--border-color-hover]",
    "active:bg-[color:--background-color-active] active:border-[color:--border-color]",
    "[&_svg]:h-full [&_svg]:inline-block [&_svg]:aspect-square",
    ...buttonStyles,
    { [styles.waiting]: waiting },
    className,
  );
}

export type ButtonProps = {
  /**
   * Controls the color variant of the button
   * See [Storybook](https://labelstud.io/storybook?path=/docs/ui-button--docs)
   */
  variant?: keyof typeof variants;
  /**
   * Controls the look of the button
   * See [Storybook](https://labelstud.io/storybook?path=/docs/ui-button--docs)
   */
  look?: keyof typeof looks;
  size?: keyof typeof sizes;
  align?: keyof typeof alignment;
  /**
   * Waiting state with stripes animation
   */
  waiting?: boolean;
  /**
   * Allow button to be clickable when waiting
   */
  waitingClickable?: boolean;
  /**
   * @deprecated Use `leading` instead
   */
  icon?: ReactNode;
  /**
   * Inserts a leading element preceding the content of the button
   */
  leading?: ReactNode;
  /**
   * Inserts a trailing element following the content of the button
   */
  trailing?: ReactNode;
  /**
   * Adds a tooltip to the button
   */
  tooltip?: string;
  /**
   * When in waiting state with `waitingClickable` enabled, this function will be used
   * as `onClick` if provided. Otherwise default `onClick` will be used.
   */
  secondaryOnClick?: (e: MouseEvent) => void;
} & ButtonHTMLAttributes<HTMLButtonElement>;

/**
 * A versatile button component with various styling options
 *
 * The Button component provides a consistent UI element for user interactions
 * with support for different visual variants, looks, and sizes. It can include
 * leading and trailing elements for additional visual context.
 *
 * Features:
 * - Different colors and looks of the button
 * - Waiting state with secondary action
 * - Icons support
 */
const Button = forwardRef(
  (
    {
      children,
      className = "",
      variant = "primary",
      look = "filled",
      size = "medium",
      waiting = false,
      align = "default",
      waitingClickable = false,
      icon,
      leading = icon,
      trailing,
      tooltip,
      onClick,
      secondaryOnClick,
      ...buttonProps
    }: PropsWithChildren<ButtonProps>,
    ref,
  ): JSX.Element => {
    const buttonClassName = cn(buttonVariant({ variant, look, size, waiting, align }, className));
    const iconClassName = "inline-flex gap-tight not-italic items-center";
    const contentClassName = "inline-flex flex-1 whitespace-pre items-center px-tight";
    const clickHandler = waiting && waitingClickable ? (secondaryOnClick ?? onClick) : onClick;

    const isDisabled = buttonProps.disabled || (!waitingClickable && waiting);

    const buttonBody = (
      <button
        {...buttonProps}
        onClick={clickHandler}
        ref={(el) => setRef(ref, el)}
        disabled={isDisabled}
        data-waiting={waiting}
        data-variant={variant}
        data-look={look}
        data-align={align}
        className={buttonClassName}
      >
        {leading && children && <em className={iconClassName}>{leading}</em>}
        <span className={contentClassName}>{children ?? leading ?? ""}</span>
        {trailing && <em className={iconClassName}>{trailing}</em>}
      </button>
    );

    if (tooltip) {
      // For disabled buttons, wrap in a container that can receive hover events
      return <Tooltip title={tooltip}>{buttonBody}</Tooltip>;
    }

    return buttonBody as JSX.Element;
  },
);

const ButtonGroup = ({ children, collapsed = true }: PropsWithChildren<{ collapsed?: boolean }>) => {
  const className = cn("inline-flex", styles["button-group"], {
    [styles["button-group-collapsed"]]: collapsed,
  });
  return <div className={className}>{children}</div>;
};

export { Button, ButtonGroup };
