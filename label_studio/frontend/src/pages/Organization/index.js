
import React from 'react';
import { SidebarMenu } from '../../components/SidebarMenu/SidebarMenu';
import { PeoplePage } from './PeoplePage/PeoplePage';
import { WebhookPage } from './WebhookPage/WebhookPage';

const MenuLayout = ({ children, ...routeProps }) => {
  return (
    <SidebarMenu
      menuItems={[
        PeoplePage,
        WebhookPage,
      ]}
      path={routeProps.match.url}
      children={children}
    />
  );
};

export const OrganizationPage = {
  title: "Organization",
  path: "/organization",
  exact: true,
  layout: MenuLayout,
  component: PeoplePage,
  pages: {
    WebhookPage,
  },
};
