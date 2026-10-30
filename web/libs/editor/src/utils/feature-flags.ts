/**
 * Fixing "Auto Detect" tool undo functionality and bugs with skipNextUndoState.
 * @link https://app.launchdarkly.com/default/production/features/fflag_fix_front_dev_1284_auto_detect_undo_281022_short
 */
export const FF_DEV_1284 = "fflag_fix_front_dev_1284_auto_detect_undo_281022_short";

export const FF_DEV_1442 = "ff_front_dev_1442_unselect_shape_on_click_outside_080622_short";

export const FF_DEV_2669 = "ff_front_dev_2669_paragraph_author_filter_210622_short";

// Change the rotate tool from bbox
export const FF_DEV_2671 = "ff_front_dev_2671_anchor_rotate_bbox_010722_short";

/**
 * Enable audio spectrograms
 * @link https://app.launchdarkly.com/default/production/features/fflag_feat_optic_2123_audio_spectrograms
 */
export const FF_AUDIO_SPECTROGRAMS = "fflag_feat_optic_2123_audio_spectrograms";

/**
 * Creating separated regions if selection includes hidden phrases
 * @see FF_DEV_2669 (allows filtering)
 * @link https://app.launchdarkly.com/default/production/features/fflag_fix_front_dev_2918_labeling_filtered_paragraphs_250822_short
 */
export const FF_DEV_2918 = "fflag_fix_front_dev_2918_labeling_filtered_paragraphs_250822_short";

// Refactoring to use separate trees for every annotation to allow real annotations in View All
export const FF_DEV_3391 = "fflag_fix_front_dev_3391_interactive_view_all";

/**
 * Contextual scrolling of Paragraph segments with Audio V0
 * @link https://app.launchdarkly.com/default/production/features/fflag_feat_front_lsdv_e_278_contextual_scrolling_short/targeting
 */
export const FF_LSDV_E_278 = "fflag_feat_front_lsdv_e_278_contextual_scrolling_short";

/**
 * Enhanced paragraph annotation with automatic label selection and smart duplicate prevention
 * Enables automatic phrase annotation when labels are selected, with priority for user text selection
 * @link https://app.launchdarkly.com/default/production/features/fflag_feat_front_bros_199_enable_select_all_in_ner_phrase_short
 */
export const FF_NER_SELECT_ALL = "fflag_feat_front_bros_199_enable_select_all_in_ner_phrase_short";

/**
 * Fixing issues related to selection tool functional (selecting hidden regions, onClick in Konva, interaction with regions inside selection area)
 *
 * @link https://app.launchdarkly.com/default/production/features/fflag_fix_front_lsdv_4930_selection_tool_fixes_240423_short
 */
export const FF_LSDV_4930 = "fflag_fix_front_lsdv_4930_selection_tool_fixes_240423_short";

/**
 * Fix task count on projects with over 100 tasks (switch from task history to queue count)
 * @link https://app.launchdarkly.com/default/production/features/fflag_fix_all_optic_79_task_count_is_wrong_short/targeting
 */

export const FF_TASK_COUNT_FIX = "fflag_fix_all_optic_79_task_count_is_wrong_short";

/** Select annotation only once during store init and trigger the rest from this select */
export const FF_SIMPLE_INIT = "fflag_fix_front_leap_443_select_annotation_once";

/**
 * It changes the reviewer flow to be more user-friendly and intuitive.
 */
export const FF_REVIEWER_FLOW = "fflag_feat_all_leap_1081_reviewer_flow_updates";

export const FF_CUSTOM_SCRIPT = "fflag_feat_all_leap_883_custom_script_270524_short";

/**
 * Disable the postpone option if the skip interface isn't set
 * @link https://app.launchdarkly.com/projects/default/flags/fflag_feat_front_leap_1173_disable_postpone_skip_short
 */
export const FF_LEAP_1173 = "fflag_feat_front_leap_1173_disable_postpone_skip_short";

export const FF_IMAGE_MEMORY_USAGE = "fflag_feat_front_optic_1479_improve_image_tag_memory_usage_short";

export const FF_VIDEO_FRAME_SEEK_PRECISION = "fflag_fix_front_optic_1608_improve_video_frame_seek_precision_short";

/**
 * Strict task overlap enforcement - prevents annotators from submitting
 * annotations when task overlap limit has been reached
 */
export const FF_FIT_1304_STRICT_OVERLAP = "fflag_feat_all_fit_1304_strict_overlap";

export const FF_MODAL_WINDOW_APP_CHROME = "fflag_feat_front_fit_1559_modal_window_short";

Object.assign(window, {
  APP_SETTINGS: {
    ...(window.APP_SETTINGS ?? {}),
    feature_flags: {
      ...(window.APP_SETTINGS?.feature_flags ?? {}),
      ...(window.FEATURE_FLAGS ?? {}),
    },
  },
});

function getFeatureFlags() {
  return {
    ...(window.APP_SETTINGS?.feature_flags ?? {}),
    // could be used to explicitly set flags for testing
  };
}

export function isFF(id: string) {
  const featureFlags = getFeatureFlags();
  if (id in featureFlags) {
    return featureFlags[id] === true;
  }
  return window.APP_SETTINGS?.feature_flags_default_value === true;
}

Object.assign(window, { getFeatureFlags, isFF });
