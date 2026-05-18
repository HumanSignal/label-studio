/**
 * Support for notification links in the Label Steam and the Review Stream.
 * @link https://app.launchdarkly.com/default/branch/features/feat_front_dev_1752_notification_links_in_label_and_review_streams
 */
export const FF_DEV_1752 = "feat_front_dev_1752_notification_links_in_label_and_review_streams";

// Ask for comment during update in label stream
export const FF_DEV_2186 = "ff_front_dev_2186_comments_for_update";

export const FF_DEV_2536 = "fflag_feat_front_dev-2536_comment_notifications_short";

/**
 * Support for Datasets functionality.
 */
export const FF_LOPS_E_3 = "fflag_feat_all_lops_e_3_datasets_short";

/**
 * Strict task overlap enforcement - prevents annotators from submitting
 * annotations when task overlap limit has been reached
 */
export const FF_FIT_1304_STRICT_OVERLAP = "fflag_feat_all_fit_1304_strict_overlap";

/**
 * Data Manager `is any of` / `is none of` list-membership filter operators.
 * Gates the operator dropdown for Task ID, Inner ID, and task.data.* columns.
 */
export const FF_BROS_1203 = "fflag_feat_bros_1203_dm_is_any_of_filter_short";

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
