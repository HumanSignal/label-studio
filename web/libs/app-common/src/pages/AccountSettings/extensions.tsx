import type { FC } from "react";
import type { SectionType } from "./sections";

/**
 * Account Settings extension points.
 *
 * OSS (app-common) ships only the generic account sections. Enterprise features (e.g. the workforce
 * Skills section, the contributor profile card, contributor-required profile fields) are injected at
 * app startup via these registration hooks — mirroring the `stateRegistry` pattern — so no workforce
 * code lives in OSS. LSE registers them once (see the LSE workforce account-settings `register`).
 */
export type AccountSettingsExtension = {
  /** Extra sidebar sections, inserted right after the Profile section. */
  extraSections?: SectionType[];
  /** PersonalInfo field keys that must be non-empty (e.g. for workforce contributors). */
  requiredProfileFields?: string[];
};

type ExtensionHook = () => AccountSettingsExtension;

const EMPTY_EXTENSION: AccountSettingsExtension = {};

let extensionHook: ExtensionHook | null = null;
const profileExtras: FC[] = [];

/** Register a hook that supplies dynamic extension data (extra sections, required fields). */
export const registerAccountSettingsExtension = (hook: ExtensionHook): void => {
  extensionHook = hook;
};

/** Register a component rendered after PersonalInfo inside the Profile section (self-gating). */
export const registerAccountSettingsProfileExtra = (component: FC): void => {
  profileExtras.push(component);
};

export const getAccountSettingsProfileExtras = (): FC[] => profileExtras;

/** Hook consumed by app-common AccountSettings/PersonalInfo. Returns defaults when nothing registered. */
export const useAccountSettingsExtension = (): AccountSettingsExtension =>
  extensionHook ? extensionHook() : EMPTY_EXTENSION;
