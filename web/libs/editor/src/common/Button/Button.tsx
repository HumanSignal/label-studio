import { Tooltip } from "@humansignal/ui";
import type Keymaster from "keymaster";
import {
  type ButtonHTMLAttributes,
  cloneElement,
  type CSSProperties,
  type FC,
  forwardRef,
  type ForwardRefExoticComponent,
  useMemo,
  createElement,
} from "react";
import { Hotkey } from "../../core/Hotkey";
import { useHotkey } from "../../hooks/useHotkey";
import { cn, type CNTagName } from "../../utils/bem";
import { isDefined } from "../../utils/utilities";
import "./Button.scss";

type HTMLButtonProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, "type">;

export interface ButtonProps extends HTMLButtonProps {
  type?: "text" | "link";
  href?: string;
  extra?: JSX.Element;
  className?: string;
  size?: "small" | "medium" | "compact" | "large";
  waiting?: boolean;
  icon?: JSX.Element;
  tag?: CNTagName;
  look?: "primary" | "danger" | "destructive" | "alt" | "outlined" | "active" | "disabled";
  primary?: boolean;
  danger?: boolean;
  style?: CSSProperties;
  hotkey?: keyof typeof Hotkey.keymap;
  hotkeyScope?: string;
  displayedHotkey?: keyof typeof Hotkey.keymap;
  tooltip?: string;
  tooltipTheme?: "light" | "dark";
  nopadding?: boolean;
  // Block props
  // @todo can be imported/infered from Block
  mod?: Record<string, any>;
}

export interface ButtonGroupProps {
  className?: string;
  collapsed?: boolean;
}

export interface ButtonType<P> extends ForwardRefExoticComponent<P> {
  Group?: FC<ButtonGroupProps>;
}

export const Button: ButtonType<ButtonProps> = forwardRef(
  (
    {
      children,
      type,
      extra,
      className,
      size,
      waiting,
      icon,
      tag,
      look,
      primary,
      danger,
      hotkey,
      hotkeyScope,
      displayedHotkey,
      tooltip,
      tooltipTheme = "light",
      nopadding,
      ...rest
    },
    ref,
  ) => {
    const finalTag = tag ?? (rest.href ? "a" : "button");

    const mods = {
      size,
      waiting,
      type,
      danger,
      nopadding,
      look: look ?? [],
      withIcon: !!icon,
      withExtra: !!extra,
    };

    if (primary) {
      mods.look = "primary";
    }

    const iconElem = useMemo(() => {
      if (!icon) return null;
      if (isDefined(icon.props.size)) return icon;

      switch (size) {
        case "small":
          return cloneElement(icon, { ...icon.props, size: 12, width: 12, height: 12 });
        case "compact":
          return cloneElement(icon, { ...icon.props, size: 14, width: 14, height: 14 });
        default:
          return icon;
      }
    }, [icon, size]);

    useHotkey(hotkey, rest.onClick as unknown as Keymaster.KeyHandler, hotkeyScope);

    const buttonBody = createElement(
      finalTag as any,
      {
        ref,
        type,
        ...rest,
        className: cn("button").mod(mods).mix(className).toClassName(),
      },
      <>
        {iconElem && <span className={cn("button").elem("icon").toClassName()}>{iconElem}</span>}
        {iconElem && children ? <span>{children}</span> : children}
        {extra !== undefined ? <div className={cn("button").elem("extra").toClassName()}>{extra}</div> : null}
      </>,
    );

    if (
      (hotkey && isDefined(Hotkey.keymap[hotkey])) ||
      (displayedHotkey && isDefined(Hotkey.keymap[displayedHotkey]))
    ) {
      return (
        <Hotkey.Tooltip name={hotkey || displayedHotkey} title={tooltip}>
          {buttonBody}
        </Hotkey.Tooltip>
      );
    }

    if (tooltip) {
      return (
        <Tooltip title={tooltip} theme={tooltipTheme} ref={ref}>
          {buttonBody}
        </Tooltip>
      );
    }

    return buttonBody;
  },
);

Button.displayName = "Button";

const Group: FC<ButtonGroupProps> = ({ className, children, collapsed }) => {
  return <div className={cn("button-group").mod({ collapsed }).mix(className).toClassName()}>{children}</div>;
};

Button.Group = Group;
