import React from 'react';
import { Block, Elem } from '../../utils/bem';
import './SidebarTabs.styl';

// @todo there was an idea of switchable tabs, but they were not used,
// @todo so implementation was removed and the whole part of interface
// @todo is waiting to be removed in favor of new UI (see FF_DEV_3873)
export const SidebarTabs = ({ children }) => {
  return (
    <Block name="sidebar-tabs">
      <Elem name="content">{children}</Elem>
    </Block>
  );
};
