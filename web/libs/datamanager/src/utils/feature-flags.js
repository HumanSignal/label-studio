// Outliner + Details
export const FF_DEV_1170 = "ff_front_1170_outliner_030222_short";

/**
 * Support for notification links in the Label Steam and the Review Stream.
 * @link https://app.launchdarkly.com/default/branch/features/feat_front_dev_1752_notification_links_in_label_and_review_streams
 */
export const FF_DEV_1752 = "feat_front_dev_1752_notification_links_in_label_and_review_streams";

// Ask for comment during update in label stream
export const FF_DEV_2186 = "ff_front_dev_2186_comments_for_update";

export const FF_DEV_2536 = "fflag_feat_front_dev-2536_comment_notifications_short";

/**
 * Support for loading media files only a single time. Part of the Audio v3 epic.
 * @link https://app.launchdarkly.com/default/production/features/ff_front_dev_2715_audio_3_280722_short
 */
export const FF_DEV_2715 = "ff_front_dev_2715_audio_3_280722_short";

// Comments for annotation editor
export const FF_DEV_2887 = "fflag-feat-dev-2887-comments-ui-editor-short";

// toggles the ability to drag columns on the datamanager table
export const FF_DEV_2984 = "fflag_feat_front_dev_2984_dm_draggable_columns_short";

export const FF_DEV_3034 = "fflag-feat-dev-3034-comments-with-drafts-short";

export const FF_DEV_3873 = "fflag_feat_front_dev_3873_labeling_ui_improvements_short";

/**
 * Hide task counter because it's mostly irrelevant
 * @link https://app.launchdarkly.com/default/production/features/fflag_fix_front_dev_3734_hide_task_counter_131222_short
 */
export const FF_DEV_3734 = "fflag_fix_front_dev_3734_hide_task_counter_131222_short";

/**
 * Support for Datasets functionality.
 */
export const FF_LOPS_E_3 = "fflag_feat_all_lops_e_3_datasets_short";

/**
 * Fixes memory leaks in label studio frontend relative to mobx-state-tree and react usage
 *
 * @link https://app.launchdarkly.com/default/production/features/fflag_fix_front_lsdv_4620_memory_leaks_100723_short
 */
export const FF_LSDV_4620_3_ML = "fflag_fix_front_lsdv_4620_memory_leaks_100723_short";

/**
 * Fixes how presigned urls are generated and accessed to remove possibility of CORS errors.
 */
export const FF_LSDV_4711 = "fflag_fix_all_lsdv_4711_cors_errors_accessing_task_data_short";

/**
 * Allow the ability to filter annotations by their original created_at timestamp
 */
export const FF_LSDV_5035 = "fflag_feat_back_lsdv_5035_use_created_at_from_draft_for_annotation_256052023_short";

/**
 * Updated UX with improved accessibility
 */
export const FF_LOPS_E_10 = "fflag_feat_front_lops_e_10_updated_ux_short";

/**
 * Save draft on leave annotation editor
 */
export const FF_OPTIC_2 = "fflag_feat_optic_2_ensure_draft_saved_short";

/**
 * Adding the ability to toggle dataset storage editability.
 */
export const FF_LOPS_86 = "fflag_feat_front_lops_86_datasets_storage_edit_short";

/**
 * Self Serve
 * @link https://app.launchdarkly.com/default/test/features/fflag_feat_front_leap_482_self_serve_short/
 */
export const FF_SELF_SERVE = "fflag_feat_front_leap_482_self_serve_short";

// Customize flags
const flags = {};

function getFeatureFlags() {
  return Object.assign(window.APP_SETTINGS?.feature_flags || {}, flags);
}

export function isFF(id) {
  const featureFlags = getFeatureFlags();

  if (id in featureFlags) {
    return featureFlags[id] === true;
  }
  return window.APP_SETTINGS?.feature_flags_default_value === true;
}
