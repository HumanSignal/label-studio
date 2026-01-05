/**
 * Support for notification links in the Label Steam and the Review Stream.
 * @link https://app.launchdarkly.com/default/branch/features/feat_front_dev_1752_notification_links_in_label_and_review_streams
 */
export const FF_DEV_1752 = "feat_front_dev_1752_notification_links_in_label_and_review_streams";

// Ask for comment during update in label stream
export const FF_DEV_2186 = "ff_front_dev_2186_comments_for_update";

export const FF_DEV_2536 = "fflag_feat_front_dev-2536_comment_notifications_short";

// Comments for annotation editor
export const FF_DEV_2887 = "fflag-feat-dev-2887-comments-ui-editor-short";

export const FF_DEV_3034 = "fflag-feat-dev-3034-comments-with-drafts-short";

export const FF_DEV_3873 = "fflag_feat_front_dev_3873_labeling_ui_improvements_short";

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
 * Self Serve
 * @link https://app.launchdarkly.com/default/test/features/fflag_feat_front_leap_482_self_serve_short/
 */
export const FF_SELF_SERVE = "fflag_feat_front_leap_482_self_serve_short";

/** Add ability to preview image tasks in Data Manager Grid View */
export const FF_GRID_PREVIEW = "fflag_feat_front_leap_1424_grid_preview_short";

/**
 * Allow to filter tasks in Data Manager by control tag labels used in annotation results
 * @link https://app.launchdarkly.com/projects/default/flags/fflag_root_13_annotation_results_filtering
 */
export const FF_ANNOTATION_RESULTS_FILTERING = "fflag_root_13_annotation_results_filtering";

/**
 * Allow to filter tasks in Data Manager by annotation results and user annotated on the same annotation
 * @link https://app.launchdarkly.com/projects/default/flags/fflag_root_45_better_user_filter
 */
export const FF_BETTER_USER_FILTER = "fflag_root_45_better_user_filter";

/**
 * Disable global user fetching for large-scale deployments
 * @link https://app.launchdarkly.com/projects/default/flags/fflag_all_feat_utc_204_users_performance_improvements_in_dm_for_large_orgs
 */
export const FF_DISABLE_GLOBAL_USER_FETCHING =
  "fflag_all_feat_utc_204_users_performance_improvements_in_dm_for_large_orgs";

// Customize flags
const flags = {};

function getFeatureFlags() {
  return Object.assign(window.APP_SETTINGS?.feature_flags || {}, flags);
}

export function isFF(id) {
  const featureFlags = getFeatureFlags();
  // TODO: remove the override + if statement once LSE and LSO start building react the same way and fflag_fix_front_lsdv_4620_memory_leaks_100723_short is removed
  const override = {
    fflag_fix_front_lsdv_4620_memory_leaks_100723_short: false,
  };
  if (window?.APP_SETTINGS?.sentry_environment === "opensource" && id in override) {
    return override[id];
  }

  if (id in featureFlags) {
    return featureFlags[id] === true;
  }
  return window.APP_SETTINGS?.feature_flags_default_value === true;
}
