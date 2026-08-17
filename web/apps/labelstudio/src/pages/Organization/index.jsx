import i18next from "i18next";
import { SidebarMenu } from "../../components/SidebarMenu/SidebarMenu";
import { PeoplePage } from "./PeoplePage/PeoplePage";
import { WebhookPage } from "../WebhookPage/WebhookPage";

const ALLOW_ORGANIZATION_WEBHOOKS = window.APP_SETTINGS.flags?.allow_organization_webhooks;

const MenuLayout = ({ children, ...routeProps }) => {
  const menuItems = [PeoplePage];

  if (ALLOW_ORGANIZATION_WEBHOOKS) {
    menuItems.push(WebhookPage);
  }
  return <SidebarMenu menuItems={menuItems} path={routeProps.match.url} children={children} />;
};

const organizationPages = {};

if (ALLOW_ORGANIZATION_WEBHOOKS) {
  organizationPages[WebhookPage] = WebhookPage;
}

// Route metadata is read by the routing/sidebar system outside of a React
// component, so it resolves through the shared i18next singleton lazily.
export const OrganizationPage = {
  path: "/organization",
  exact: true,
  layout: MenuLayout,
  component: PeoplePage,
  pages: organizationPages,
};

Object.defineProperty(OrganizationPage, "title", {
  get: () => i18next.t("account:orgTitle"),
});
