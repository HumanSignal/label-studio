import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@humansignal/ui/lib/card-new/card";
import { useMemo, isValidElement } from "react";
import { Redirect, Route, Switch, useParams, useRouteMatch } from "react-router-dom";
import { useUpdatePageTitle, createTitleFromSegments } from "@humansignal/core";
import styles from "./AccountSettings.module.scss";
import { accountSettingsSections } from "./sections";
import { HotkeysHeaderButtons } from "./sections/Hotkeys";
import clsx from "clsx";
import { useAtomValue } from "jotai";
import { settingsAtom } from "./atoms";
import { useAuth } from "@humansignal/core/providers/AuthProvider";

/**
 * FIXME: This is legacy imports. We're not supposed to use such statements
 * each one of these eventually has to be migrated to core/ui
 */
import { SidebarMenu } from "apps/labelstudio/src/components/SidebarMenu/SidebarMenu";

const AccountSettingsSection = () => {
  const { user, permissions } = useAuth();
  const { sectionId } = useParams<{ sectionId: string }>();
  const settings = useAtomValue(settingsAtom);
  const contentClassName = clsx(styles.accountSettings__content, {
    [styles.accountSettingsPadding]: window.APP_SETTINGS.billing !== undefined,
  });

  const resolvedSections = useMemo(() => {
    return settings.data && !("error" in settings.data) ? accountSettingsSections(settings.data, permissions) : [];
  }, [settings.data, user]);

  const currentSection = useMemo(
    () => resolvedSections.find((section) => section.id === sectionId),
    [resolvedSections, sectionId],
  );

  // Update page title to reflect the current section
  const pageTitleText = useMemo(() => {
    if (!currentSection) return "My Account";

    // If title is a string, use it directly
    if (typeof currentSection.title === "string") {
      return createTitleFromSegments([currentSection.title, "My Account"]);
    }

    // For non-string titles (like JSX elements), derive from the section ID
    const titleFromId = currentSection.id
      .split("-")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");

    return createTitleFromSegments([titleFromId, "My Account"]);
  }, [currentSection]);

  useUpdatePageTitle(pageTitleText);

  if (!currentSection && resolvedSections.length > 0) {
    return <Redirect to={`${AccountSettingsPage.path}/${resolvedSections[0].id}`} />;
  }

  return currentSection ? (
    <div className={contentClassName}>
      <Card key={currentSection.id}>
        <CardHeader>
          <div className="flex flex-col gap-tight">
            <div className="flex justify-between items-center">
              <CardTitle>{currentSection.title}</CardTitle>
              {currentSection.id === "hotkeys" && (
                <div className="flex-shrink-0">
                  <HotkeysHeaderButtons />
                </div>
              )}
            </div>
            {currentSection.description && (
              <CardDescription>
                {isValidElement(currentSection.description) ? (
                  currentSection.description
                ) : (
                  <currentSection.description />
                )}
              </CardDescription>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <currentSection.component />
        </CardContent>
      </Card>
    </div>
  ) : null;
};

const AccountSettingsPage = () => {
  const settings = useAtomValue(settingsAtom);
  const match = useRouteMatch();
  const { sectionId } = useParams<{ sectionId: string }>();
  const { user, permissions } = useAuth();
  const resolvedSections = useMemo(() => {
    return settings.data && !("error" in settings.data) ? accountSettingsSections(settings.data, permissions) : [];
  }, [settings.data, user]);

  const menuItems = useMemo(
    () =>
      resolvedSections.map(({ title, id }) => ({
        title,
        path: `/${id}`,
        active: sectionId === id,
        exact: true,
      })),
    [resolvedSections, sectionId],
  );

  return (
    <div className={styles.accountSettings}>
      <SidebarMenu menuItems={menuItems} path={AccountSettingsPage.path}>
        <Switch>
          <Route path={`${match.path}/:sectionId`} component={AccountSettingsSection} />
          <Route exact path={match.path}>
            {resolvedSections.length > 0 && <Redirect to={`${match.path}/${resolvedSections[0].id}`} />}
          </Route>
        </Switch>
      </SidebarMenu>
    </div>
  );
};

AccountSettingsPage.title = "My Account";
AccountSettingsPage.path = "/user/account";
AccountSettingsPage.exact = false;
AccountSettingsPage.routes = () => [
  {
    title: () => "My Account",
    path: "/account",
    component: () => <Redirect to={AccountSettingsPage.path} />,
  },
  {
    path: `${AccountSettingsPage.path}/:sectionId?`,
    component: AccountSettingsPage,
  },
];

export { AccountSettingsPage };
