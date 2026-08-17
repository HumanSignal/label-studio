import { Profile } from "./Profile";
import { EmailPreferences } from "./EmailPreferences";
import { PersonalAccessToken, PersonalAccessTokenDescription } from "./PersonalAccessToken";
import { MembershipInfo } from "./MembershipInfo";
import { HotkeysManager } from "./Hotkeys";
import type React from "react";
import i18next from "i18next";
import { PersonalJWTToken } from "./PersonalJWTToken";
import type { AuthTokenSettings } from "../types";
import { ABILITY, type AuthPermissions } from "@humansignal/core/providers/AuthProvider";
import { ff } from "@humansignal/core";
import { Badge } from "@humansignal/ui";

export type SectionType = {
  title: string | React.ReactNode;
  id: string;
  component: React.FC;
  description?: React.FC;
  rendersOwnCards?: boolean;
};

export const accountSettingsSections = (
  settings: AuthTokenSettings,
  permissions: AuthPermissions,
  extraSections: SectionType[] = [],
): SectionType[] => {
  const canCreateTokens = permissions.can(ABILITY.can_create_tokens);

  return [
    {
      title: i18next.t("account:accountSectionProfile"),
      id: "personal-info",
      component: Profile,
      rendersOwnCards: true,
    },
    // Enterprise-injected sections (e.g. workforce "Skills & Expertise") render right after Profile.
    ...extraSections,
    {
      title: (
        <div className="flex items-center gap-tight">
          <span>{i18next.t("account:accountSectionHotkeys")}</span>
          <Badge variant="beta" look="solid" shape="rounded">
            {i18next.t("account:commonBeta")}
          </Badge>
        </div>
      ),
      id: "hotkeys",
      component: HotkeysManager,
      rendersOwnCards: true,
    },
    {
      title: i18next.t("account:accountSectionEmailPreferences"),
      id: "email-preferences",
      component: EmailPreferences,
    },
    {
      title: i18next.t("account:accountSectionMembershipInfo"),
      id: "membership-info",
      component: MembershipInfo,
    },
    settings.api_tokens_enabled &&
      canCreateTokens &&
      ff.isActive(ff.FF_AUTH_TOKENS) && {
        title: i18next.t("account:accountSectionPersonalAccessToken"),
        id: "personal-access-token",
        component: PersonalJWTToken,
        description: PersonalAccessTokenDescription,
      },
    settings.legacy_api_tokens_enabled &&
      canCreateTokens && {
        title: ff.isActive(ff.FF_AUTH_TOKENS)
          ? i18next.t("account:accountSectionLegacyToken")
          : i18next.t("account:accountSectionAccessToken"),
        id: "legacy-token",
        component: PersonalAccessToken,
        description: PersonalAccessTokenDescription,
      },
  ].filter(Boolean) as SectionType[];
};
