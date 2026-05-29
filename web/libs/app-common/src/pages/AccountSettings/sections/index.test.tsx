import { accountSettingsSections } from "./index";
import type { AuthPermissions } from "@humansignal/core/providers/AuthProvider";
import type { AuthTokenSettings } from "../types";

const settings: AuthTokenSettings = {
  api_tokens_enabled: false,
  legacy_api_tokens_enabled: false,
  api_token_ttl_days: 0,
};

const permissions: AuthPermissions = {
  can: () => false,
  canAny: () => false,
  canAll: () => false,
};

const skillsSection = {
  title: "Skills & Expertise",
  id: "skills",
  component: () => null,
  rendersOwnCards: true,
};

describe("accountSettingsSections", () => {
  it("renders no extra sections when none are injected", () => {
    const sections = accountSettingsSections(settings, permissions, []);

    expect(sections.map((section) => section.id)).not.toContain("skills");
  });

  it("inserts injected sections (e.g. Skills & Expertise) right after Profile", () => {
    const sections = accountSettingsSections(settings, permissions, [skillsSection]);

    expect(sections.map((section) => section.id).slice(0, 2)).toEqual(["personal-info", "skills"]);
    expect(sections.slice(0, 2).map((section) => section.title)).toEqual(["Profile", "Skills & Expertise"]);
  });
});
