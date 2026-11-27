import { describe, expect, it } from "bun:test";
import { getProjectHotkeysSettingsPath, getProjectIdFromPathname } from "@humansignal/core/lib/utils/hotkeysProject";

describe("hotkeysProject helpers", () => {
  it("extracts project ids from labeling paths", () => {
    expect(getProjectIdFromPathname("/projects/123/data")).toBe(123);
    expect(getProjectIdFromPathname("/projects/123/data/labeling")).toBe(123);
    expect(getProjectIdFromPathname("/projects/123/settings/labeling")).toBe(123);
    expect(getProjectIdFromPathname("/user/account/hotkeys")).toBeNull();
    expect(getProjectIdFromPathname("/projects/not-a-number/data")).toBeNull();
  });

  it("builds the canonical account hotkeys deep link", () => {
    expect(getProjectHotkeysSettingsPath(42)).toBe("/user/account/hotkeys?project=42");
    expect(getProjectHotkeysSettingsPath("project/value")).toBe("/user/account/hotkeys?project=project%2Fvalue");
  });

  it("builds project-aware deep links from the current path", () => {
    const projectId = getProjectIdFromPathname("/projects/123/data");
    expect(projectId && getProjectHotkeysSettingsPath(projectId)).toBe("/user/account/hotkeys?project=123");
  });
});
