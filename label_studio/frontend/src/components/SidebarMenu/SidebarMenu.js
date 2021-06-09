import React from 'react';
import { cn } from "../../utils/bem";
import { Menu } from '../Menu/Menu';
import './SidebarMenu.styl';

export const SidebarMenu = ({children, menu, path, menuItems}) => {
  const rootClass = cn('sidebar-menu');

  return (
    <div className={rootClass}>
      <div className={rootClass.elem('navigation')}>
        <Menu>
          {menuItems ? Menu.Builder(path, menuItems) : menu}
        </Menu>
      </div>
      <div className={rootClass.elem('content')}>
        {children}
      </div>
    </div>
  );
};
