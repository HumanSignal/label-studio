import React from 'react';
import { useMemo } from 'react';
import { cn } from '../../utils/bem';
import { MenuContext } from './MenuContext';

export const MenuItem = ({
  name,
  children,
  label,
  icon,
  to,
  className,
  href,
  danger,
  exact = false,
  forceReload = false,
  active = false,
  onClick,
  ...rest
}) => {
  const { selected, allowClickSelected } = React.useContext(MenuContext);
  const rootClass = cn('menu', { elem: 'item' });
  const isActive = (() => {
    const pathname = window.location.pathname.replace(/\/$/, '');
    const url = to ?? href;

    if (selected.has(name)) {
      return true;
    } else if (exact) {
      return pathname === url;
    } else {
      return pathname.includes(url);
    }
  })();

  const linkContent = useMemo(() => (
    <>
      {icon && <span className={rootClass.elem('item-icon')}>{icon}</span>}
      {children ?? label}
    </>
  ), [children, label, icon]);

  const linkAttributes = {
    className: rootClass
      .mod({
        active: isActive || active,
        look: danger && 'danger',
        clickable: allowClickSelected,
      })
      .mix(className),
    onClick,
    ...rest,
  };

  if (forceReload) {
    linkAttributes.onClick = () => (window.location.href = to ?? href);
  }

  return (
    <li>
      {href ? (
        <a href={href ?? '#'} {...linkAttributes}>
          {linkContent}
        </a>
      ) : (
        <div {...linkAttributes}>{linkContent}</div>
      )}
    </li>
  );
};
