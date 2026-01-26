import { FF_SELF_SERVE, isActive } from "./feature-flags";

/**
 * More human-readable way to detect if we are on Starter Cloud plan.
 * The main distinction between Starter Cloud and SaaS + OnPrem is this flag in billing settings:
 * isEnterprise === false
 * @returns {boolean}
 */
export const isStarterCloudPlan = (): boolean => !window.APP_SETTINGS.billing?.enterprise && isActive(FF_SELF_SERVE);
