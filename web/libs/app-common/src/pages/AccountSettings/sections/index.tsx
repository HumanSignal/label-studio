import { PersonalInfo } from "./PersonalInfo";
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

export type SectionType = {
  title: string | React.ReactNode;
  id: string;
  component: React.FC;
  description?: React.FC;
};

export const accountSettingsSections = (settings: AuthTokenSettings, permissions: AuthPermissions): SectionType[] => {
  const canCreateTokens = permissions.can(ABILITY.can_create_tokens);

  return [
    {
      title: "Personal Info",
      id: "personal-info",
      component: PersonalInfo,
    },
    {
      title: (
        <div className="flex items-center gap-tight">
          <span>Hotkeys</span>
          <Badge variant="beta">Beta</Badge>
        </div>
      ),
      id: "hotkeys",
      component: HotkeysManager,
      description: () =>
        "Customize your keyboard shortcuts to speed up your workflow. Click on any hotkey below to assign a new key combination that works best for you.",
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
