import { isFlagEnabled } from "./helpers";

const FEATURE_FLAGS = window.APP_SETTINGS?.feature_flags || {};

// Fix displaying of created_at in the review mode
export const FF_DEV_1480 = "ff_front_dev_1480_created_on_in_review_180122_short";
// Fix avatar blinking and stuck on organization page
export const FF_DEV_1495 = "ff_front_dev_1495_avatar_mess_210122_short";
// Notifications
export const FF_DEV_1658 = "ff_front_dev_1658_notification_center_170222_short";
// Add rejected icon on the cards
export const FF_DEV_1614 = "ff_back_1614_rejected_queue_17022022_short";
// Model version selector per model backend
export const FF_DEV_1682 = "ff_front_dev_1682_model_version_dropdown_070622_short";
// Project list performance improvements
export const FF_DEV_2575 = "ff_front_dev_2575_projects_list_performance_280622_short";

/**
 * Addresses the memory leak issue in Taxonomy with Repeater
 * @link https://app.launchdarkly.com/default/production/features/fflag_fix_front_dev_3617_taxonomy_memory_leaks_fix
 */
export const FF_DEV_3617 = "fflag_fix_front_dev_3617_taxonomy_memory_leaks_fix";

// Fixes how presigned urls are generated and accessed to remove possibility of CORS errors.
export const FF_LSDV_4711 = "fflag_fix_all_lsdv_4711_cors_errors_accessing_task_data_short";
// Enables "Enterprise Awareness" features
export const FF_LSDV_E_297 = "fflag_feat_front_lsdv_e_297_increase_oss_to_enterprise_adoption_short";
/**
 * Improve load time performance of Dashboard Members page
 */
export const FF_OPTIC_2 = "fflag_feat_optic_2_ensure_draft_saved_short";

/**
 * Prompter workflow
 */
export const FF_DIA_835 = "fflag_feat_all_dia_835_prompter_workflow_long";

export function isFF(id: string) {
  return isFlagEnabled(id, FEATURE_FLAGS, window.APP_SETTINGS?.feature_flags_default_value === true);
}
