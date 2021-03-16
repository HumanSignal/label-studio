import React from 'react';
import { Menubar } from '../components/Menubar/Menubar';
import { ProjectRoutes } from '../routes/ProjectRoutes';

export const RootPage = ({content}) => {
  const pinned = localStorage.getItem('sidebar-pinned') === 'true';
  const opened = pinned && localStorage.getItem('sidebar-opened') === 'true';

  return (
    <Menubar
      enabled={true}
      defaultOpened={opened}
      defaultPinned={pinned}
      onSidebarToggle={(visible) => localStorage.setItem('sidebar-opened', visible)}
      onSidebarPin={(pinned) => localStorage.setItem('sidebar-pinned', pinned)}
    >
      <ProjectRoutes content={content}/>
    </Menubar>
  );
};
