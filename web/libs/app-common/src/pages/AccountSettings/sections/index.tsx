import { Profile } from "./Profile";
import { EmailPreferences } from "./EmailPreferences";
import { PersonalAccessToken, PersonalAccessTokenDescription } from "./PersonalAccessToken";
import { MembershipInfo } from "./MembershipInfo";
import { HotkeysManager } from "./Hotkeys";
import type React from "react";
import { PersonalJWTToken } from "./PersonalJWTToken";
import type { AuthTokenSettings } from "../types";
import { ABILITY, type AuthPermissions } from "@humansignal/core/providers/AuthProvider";
import { ff } from "@humansignal/core";
import { Badge } from "@humansignal/ui";
import { LanguageDescription, LanguageSectionTitle, LanguageSettings } from "./Language/Language";

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
      title: "Profile",
      id: "personal-info",
      component: Profile,
      rendersOwnCards: true,
    },
    // Enterprise-injected sections (e.g. workforce "Skills & Expertise") render right after Profile.
    ...extraSections,
    {
      title: <LanguageSectionTitle />,
      id: "language",
      component: LanguageSettings,
      description: LanguageDescription,
    },
    {
      title: (
        <div className="flex items-center gap-tight">
          <span>Hotkeys</span>
          <Badge variant="beta" look="solid" shape="rounded">
            Beta
          </Badge>
        </div>
      ),
      id: "hotkeys",
      component: HotkeysManager,
      rendersOwnCards: true,
    },
    {
      title: "Email Preferences",
      id: "email-preferences",
      component: EmailPreferences,
    },
    {
      title: "Membership Info",
      id: "membership-info",
      component: MembershipInfo,
    },
    settings.api_tokens_enabled &&
      canCreateTokens &&
      ff.isActive(ff.FF_AUTH_TOKENS) && {
        title: "Personal Access Token",
        id: "personal-access-token",
        component: PersonalJWTToken,
        description: PersonalAccessTokenDescription,
      },
    settings.legacy_api_tokens_enabled &&
      canCreateTokens && {
        title: ff.isActive(ff.FF_AUTH_TOKENS) ? "Legacy Token" : "Access Token",
        id: "legacy-token",
        component: PersonalAccessToken,
        description: PersonalAccessTokenDescription,
      },
  ].filter(Boolean) as SectionType[];
};
