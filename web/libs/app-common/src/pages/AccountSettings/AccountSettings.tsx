import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@humansignal/ui/lib/card-new/card";
import { useMemo, isValidElement } from "react";
import { Redirect, Route, Switch, useParams, useRouteMatch } from "react-router-dom";
import { useUpdatePageTitle, createTitleFromSegments } from "@humansignal/core";
import { useTranslation } from "react-i18next";
import i18next from "i18next";
import { useAccountSettingsExtension } from "./extensions";
import styles from "./AccountSettings.module.css";
import { accountSettingsSections } from "./sections";
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
  const { permissions } = useAuth();
  const { t, i18n } = useTranslation();
  const { extraSections = [] } = useAccountSettingsExtension();
  const { sectionId } = useParams<{ sectionId: string }>();
  const settings = useAtomValue(settingsAtom);
  const contentClassName = clsx(styles.accountSettings__content, {
    [styles.accountSettingsPadding]: window.APP_SETTINGS.billing !== undefined,
  });

  const resolvedSections = useMemo(() => {
    return settings.data && !("error" in settings.data)
      ? accountSettingsSections(settings.data, permissions, extraSections)
      : [];
    // i18n.language keeps the resolved titles in sync after a language switch.
  }, [settings.data, permissions, extraSections, i18n.language]);

  const currentSection = useMemo(
    () => resolvedSections.find((section) => section.id === sectionId),
    [resolvedSections, sectionId],
  );

  const pageTitleText = useMemo(() => {
    if (!currentSection) return t("account:accountMyAccount");

    if (typeof currentSection.title === "string") {
      return createTitleFromSegments([currentSection.title, t("account:accountMyAccount")]);
    }

    const titleFromId = currentSection.id
      .split("-")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");

    return createTitleFromSegments([titleFromId, t("account:accountMyAccount")]);
  }, [currentSection, t]);

  useUpdatePageTitle(pageTitleText);

  if (!currentSection && resolvedSections.length > 0) {
    return <Redirect to={`${AccountSettingsPage.path}/${resolvedSections[0].id}`} />;
  }

  if (currentSection?.rendersOwnCards) {
    return (
      <div className={contentClassName}>
        <currentSection.component />
      </div>
    );
  }

  return currentSection ? (
    <div className={contentClassName}>
      <Card key={currentSection.id} className="!w-full">
        <CardHeader>
          <div className="flex flex-col gap-tight">
            <CardTitle>{currentSection.title}</CardTitle>
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
  const { i18n } = useTranslation();
  const match = useRouteMatch();
  const { sectionId } = useParams<{ sectionId: string }>();
  const { permissions } = useAuth();
  const { extraSections = [] } = useAccountSettingsExtension();
  const resolvedSections = useMemo(() => {
    return settings.data && !("error" in settings.data)
      ? accountSettingsSections(settings.data, permissions, extraSections)
      : [];
    // i18n.language keeps the resolved titles in sync after a language switch.
  }, [settings.data, permissions, extraSections, i18n.language]);

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

// Route metadata is read by the routing/sidebar system outside of a React
// component, so it resolves through the shared i18next singleton lazily.
Object.defineProperty(AccountSettingsPage, "title", {
  get: () => i18next.t("account:accountMyAccount"),
});
AccountSettingsPage.path = "/user/account";
AccountSettingsPage.exact = false;
AccountSettingsPage.routes = () => [
  {
    title: () => i18next.t("account:accountMyAccount"),
    path: "/account",
    component: () => <Redirect to={AccountSettingsPage.path} />,
  },
  {
    path: `${AccountSettingsPage.path}/:sectionId?`,
    component: AccountSettingsPage,
  },
];

export { AccountSettingsPage };
