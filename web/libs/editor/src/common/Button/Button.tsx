import Keymaster from 'keymaster';
import { ButtonHTMLAttributes, cloneElement, CSSProperties, FC, forwardRef, ForwardRefExoticComponent, useMemo } from 'react';
import { Hotkey } from '../../core/Hotkey';
import { useHotkey } from '../../hooks/useHotkey';
import { Block, CNTagName, Elem } from '../../utils/bem';
import { isDefined } from '../../utils/utilities';
import { Tooltip } from '../Tooltip/Tooltip';
import './Button.styl';

type HTMLButtonProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'type'>

export interface ButtonProps extends HTMLButtonProps {
  type?: 'text' | 'link';
  href?: string;
  extra?: JSX.Element;
  className?: string;
  size?: 'small' | 'medium' | 'compact' | 'large';
  waiting?: boolean;
  icon?: JSX.Element;
  tag?: CNTagName;
  look?: 'primary' | 'danger' | 'destructive' | 'alt' | 'outlined' | 'active' | 'disabled';
  primary?: boolean;
  danger?: boolean;
  style?: CSSProperties;
  hotkey?: keyof typeof Hotkey.keymap;
  tooltip?: string;
  tooltipTheme?: 'light' | 'dark';
  nopadding?: boolean;
}

export interface ButtonGroupProps {
  className?: string;
  collapsed?: boolean;
}

export interface ButtonType<P> extends ForwardRefExoticComponent<P> {
  Group?: FC<ButtonGroupProps>;
}

export const Button: ButtonType<ButtonProps> = forwardRef(({
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
  tooltip,
  tooltipTheme = 'light',
  nopadding,
  ...rest
}, ref) => {
  const finalTag = tag ?? (rest.href ? 'a' : 'button');

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
    mods.look = 'primary';
  }

  const iconElem = useMemo(() => {
    if (!icon) return null;
    if (isDefined(icon.props.size)) return icon;

    switch (size) {
      case 'small':
        return cloneElement(icon, { ...icon.props, size: 12, width: 12, height: 12 });
      case 'compact':
        return cloneElement(icon, { ...icon.props, size: 14, width: 14, height: 14 });
      default:
        return icon;
    }
  }, [icon, size]);

  useHotkey(hotkey, rest.onClick as unknown as Keymaster.KeyHandler);

  const buttonBody = (
    <Block
      name="button"
      mod={mods}
      mix={className}
      ref={ref}
      tag={finalTag}
      type={type}
      {...rest}
    >
      <>
        {iconElem && (
          <Elem tag="span" name="icon">
            {iconElem}
          </Elem>
        )}
        {iconElem && children ? <span>{children}</span> : children}
        {extra !== undefined ? <Elem name="extra">{extra}</Elem> : null}
      </>
    </Block>
  );

  if (hotkey && isDefined(Hotkey.keymap[hotkey])) {
    return (
      <Hotkey.Tooltip name={hotkey} title={tooltip}>
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
});

Button.displayName = 'Button';


const Group: FC<ButtonGroupProps> = ({ className, children, collapsed }) => {
  return (
    <Block name="button-group" mod={{ collapsed }} mix={className}>
      {children}
    </Block>
  );
};

Button.Group = Group;
