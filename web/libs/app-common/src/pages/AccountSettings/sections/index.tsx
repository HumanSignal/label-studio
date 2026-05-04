import { PersonalInfo } from "./PersonalInfo";
import { EmailPreferences } from "./EmailPreferences";
import { PersonalAccessToken, PersonalAccessTokenDescription } from "./PersonalAccessToken";
import { MembershipInfo } from "./MembershipInfo";
import { HuggingFaceTokenSettings } from "./HuggingFaceTokenSettings";
import type React from "react";
import { PersonalJWTToken } from "./PersonalJWTToken";
import type { AuthTokenSettings } from "../types";
import { ff } from "@humansignal/core";

type SectionType = {
  title: string;
  id: string;
  component: React.FC;
  description?: React.FC;
};

export const accountSettingsSections = (settings: AuthTokenSettings): SectionType[] => {
  return [
    {
      title: "Personal Info",
      id: "personal-info",
      component: PersonalInfo,
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
    {
      title: "Hugging Face",
      id: "huggingface-token",
      component: HuggingFaceTokenSettings,
    },
    settings.api_tokens_enabled &&
      ff.isActive(ff.FF_AUTH_TOKENS) && {
        title: "Personal Access Token",
        id: "personal-access-token",
        component: PersonalJWTToken,
        description: PersonalAccessTokenDescription,
      },
    settings.legacy_api_tokens_enabled && {
      title: ff.isActive(ff.FF_AUTH_TOKENS) ? "Legacy Token" : "Access Token",
      id: "legacy-token",
      component: PersonalAccessToken,
      description: PersonalAccessTokenDescription,
    },
  ].filter(Boolean) as SectionType[];
};
