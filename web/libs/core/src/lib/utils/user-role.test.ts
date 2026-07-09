import { afterEach, describe, expect, it } from "bun:test";
import { ANNOTATOR_ROLE, isAnnotatorRole } from "./user-role";

describe("isAnnotatorRole", () => {
  const origAppSettings = (window as { APP_SETTINGS?: unknown }).APP_SETTINGS;

  afterEach(() => {
    (window as { APP_SETTINGS?: unknown }).APP_SETTINGS = origAppSettings;
  });

  it("returns true when user role is annotator", () => {
    (window as { APP_SETTINGS?: unknown }).APP_SETTINGS = { user: { role: ANNOTATOR_ROLE } };
    expect(isAnnotatorRole()).toBe(true);
  });

  it("returns false for non-annotator roles", () => {
    (window as { APP_SETTINGS?: unknown }).APP_SETTINGS = { user: { role: "RE" } };
    expect(isAnnotatorRole()).toBe(false);
  });

  it("returns false when role is missing", () => {
    (window as { APP_SETTINGS?: unknown }).APP_SETTINGS = { user: { id: 1 } };
    expect(isAnnotatorRole()).toBe(false);
  });

  it("returns false when APP_SETTINGS is missing", () => {
    (window as { APP_SETTINGS?: unknown }).APP_SETTINGS = undefined;
    expect(isAnnotatorRole()).toBe(false);
  });
});
