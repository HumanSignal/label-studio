import { FF_SELF_SERVE, isActive } from "./feature-flags";

/**
 * More human-readable way to detect if we are on Starter Cloud plan.
 * The main distinction between Starter Cloud and SaaS + OnPrem is this flag in billing settings:
 * isEnterprise === false
 * @returns {boolean}
 */
export const isStarterCloudPlan = (): boolean => !window.APP_SETTINGS.billing?.enterprise && isActive(FF_SELF_SERVE);

/**
 * Check if reviewing capabilities (reviewer role and review workflows) are allowed.
 * For Self-Serve customers, this is determined by the license flag disable_reviewing_since.
 * Enterprise customers always have reviewing enabled unless explicitly disabled.
 * @returns {boolean}
 */
export const isReviewingAllowed = (): boolean => {
  // For Self-Serve customers, check the allow_reviewing flag
  // For Enterprise customers, reviewing is always allowed unless explicitly disabled
  if (isStarterCloudPlan()) {
    return window.APP_SETTINGS.billing?.allow_reviewing ?? true;
  }
  // Enterprise customers always have reviewing enabled
  return true;
};
