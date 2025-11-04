import { Redirect } from "react-router-dom";
import { useAuth } from "@humansignal/core/providers/AuthProvider";
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

const ProtectedOrganizationPage = (props) => {
  const { user, isLoading } = useAuth();

  // Show nothing while loading
  if (isLoading) return null;

  // Redirect non-admins to home
  if (user?.role !== "admin") {
    return <Redirect to="/" />;
  }

  // Render the MenuLayout with children for admins
  return <MenuLayout {...props} />;
};

const organizationPages = {};

if (ALLOW_ORGANIZATION_WEBHOOKS) {
  organizationPages[WebhookPage] = WebhookPage;
}

export const OrganizationPage = {
  title: "Organization",
  path: "/organization",
  exact: true,
  layout: ProtectedOrganizationPage,
  component: PeoplePage,
  pages: organizationPages,
};
