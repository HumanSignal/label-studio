/**
 * Fixing "Auto Detect" tool undo functionality and bugs with skipNextUndoState.
 * @link https://app.launchdarkly.com/default/production/features/fflag_fix_front_dev_1284_auto_detect_undo_281022_short
 */
export const FF_DEV_1284 = "fflag_fix_front_dev_1284_auto_detect_undo_281022_short";

export const FF_DEV_1442 = "ff_front_dev_1442_unselect_shape_on_click_outside_080622_short";

// User labels for Taxonomy
export const FF_DEV_1536 = "ff_front_dev_1536_taxonomy_user_labels_150222_long";

export const FF_DEV_2669 = "ff_front_dev_2669_paragraph_author_filter_210622_short";

// Change the rotate tool from bbox
export const FF_DEV_2671 = "ff_front_dev_2671_anchor_rotate_bbox_010722_short";

/**
 * Enable audio spectrograms
 * @link https://app.launchdarkly.com/default/production/features/fflag_feat_optic_2123_audio_spectrograms
 */
export const FF_AUDIO_SPECTROGRAMS = "fflag_feat_optic_2123_audio_spectrograms";

export const FF_DEV_2755 = "fflag_feat_dev_2755_regions_list_grouped_by_labels_with_ordered_collapse_short";

/**
 * Creating separated regions if selection includes hidden phrases
 * @see FF_DEV_2669 (allows filtering)
 * @link https://app.launchdarkly.com/default/production/features/fflag_fix_front_dev_2918_labeling_filtered_paragraphs_250822_short
 */
export const FF_DEV_2918 = "fflag_fix_front_dev_2918_labeling_filtered_paragraphs_250822_short";

export const FF_DEV_3034 = "fflag-feat-dev-3034-comments-with-drafts-short";

export const FF_DEV_3077 = "fflag_feat_front_dev_3077_repeater_tag_loading_performance_short";

/**
 * Correction of image and stage size. It also affects the zoom position restrictions.
 * @link https://app.launchdarkly.com/default/production/features/fflag_fix_front_dev_3377_image_regions_shift_on_resize_280922_short
 */
export const FF_DEV_3377 = "fflag_fix_front_dev_3377_image_regions_shift_on_resize_280922_short";

// Refactoring to use separate trees for every annotation to allow real annotations in View All
export const FF_DEV_3391 = "fflag_fix_front_dev_3391_interactive_view_all";

/**
 * Fixing "Auto Detect" tool undo functionality and bugs with skipNextUndoState.
 * @link https://app.launchdarkly.com/default/production/features/fflag_fix_front_dev_1284_auto_detect_undo_281022_short
 */
export const FF_DEV_3873 = "fflag_feat_front_dev_3873_labeling_ui_improvements_short";
/**
 * Label stream ablation experiment for solving overlap issue
 * @link https://app.launchdarkly.com/default/production/features/fflag_fix_back_dev_4174_overlap_issue_experiments_10012023_short
 */
export const FF_DEV_4174 = "fflag_fix_back_dev_4174_overlap_issue_experiments_10012023_short";

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
 * Annotations with LLM assistance
 * @link https://app.launchdarkly.com/default/production/features/fflag_feat_all_lsdv_e_294_llm_annotations_180723_long
 */
export const FF_LLM_EPIC = "fflag_feat_all_lsdv_e_294_llm_annotations_180723_long";

/**
 * Multi-image segmentation support via `valueList`
 */
export const FF_LSDV_4583 = "fflag_feat_front_lsdv_4583_multi_image_segmentation_short";

/**
 * Enables new way of preloading/caching images
 */
export const FF_LSDV_4583_6 = "fflag_feat_front_lsdv_4583_6_images_preloading_short";

/**
 * Allows to count time spend on textarea results and store it to lead_time meta field
 * @link https://app.launchdarkly.com/default/production/features/fflag_fix_front_lsdv_4600_lead_time_27072023_short
 */
export const FF_LEAD_TIME = "fflag_fix_front_lsdv_4600_lead_time_27072023_short";

/**
 * Fixes memory leaks in label studio frontend relative to mobx-state-tree and react usage
 *
 * @link https://app.launchdarkly.com/default/production/features/fflag_fix_front_lsdv_4620_memory_leaks_100723_short
 */
export const FF_LSDV_4620_3_ML = "fflag_fix_front_lsdv_4620_memory_leaks_100723_short";

/**
 * Fixing issues related to selection tool functional (selecting hidden regions, onClick in Konva, interaction with regions inside selection area)
 *
 * @link https://app.launchdarkly.com/default/production/features/fflag_fix_front_lsdv_4930_selection_tool_fixes_240423_short
 */
export const FF_LSDV_4930 = "fflag_fix_front_lsdv_4930_selection_tool_fixes_240423_short";

/**
 * Resetting shared stores on task change to correctly generate dynamic children
 * @see: fflag_fix_front_dev_3617_taxonomy_memory_leaks_fix: To enable shared store
 * @link https://app.launchdarkly.com/default/production/features/fflag_fix_front_lsdv_4998_missed_dynamic_children_030523_short
 */
export const FF_LSDV_4998 = "fflag_fix_front_lsdv_4998_missed_dynamic_children_030523_short";

/**
 * Allow to load Taxonomy from remote API
 * @link https://app.launchdarkly.com/default/production/features/fflag_feat_front_lsdv_5451_async_taxonomy_110823_short
 */
export const FF_TAXONOMY_ASYNC = "fflag_feat_front_lsdv_5451_async_taxonomy_110823_short";

/**
 * Allow to label NER directly with Taxonomy instead of Labels
 * @link https://app.launchdarkly.com/default/production/features/fflag_feat_front_lsdv_5452_taxonomy_labeling_110823_short
 */
export const FF_TAXONOMY_LABELING = "fflag_feat_front_lsdv_5452_taxonomy_labeling_110823_short";

/**
 * Fix task count on projects with over 100 tasks (switch from task history to queue count)
 * @link https://app.launchdarkly.com/default/production/features/fflag_fix_all_optic_79_task_count_is_wrong_short/targeting
 */

export const FF_TASK_COUNT_FIX = "fflag_fix_all_optic_79_task_count_is_wrong_short";

/** Select annotation only once during store init and trigger the rest from this select */
export const FF_SIMPLE_INIT = "fflag_fix_front_leap_443_select_annotation_once";

/**
 * Optimize stage rendering for large number of regions and zoom interactions
 * @link https://app.launchdarkly.com/default/production/features/fflag_fix_front_leap_32_zoom_perf_190923_short/targeting
 */
export const FF_ZOOM_OPTIM = "fflag_fix_front_leap_32_zoom_perf_190923_short";

export const FF_SAFE_TEXT = "fflag_fix_leap_466_text_sanitization";

export const FF_MULTI_OBJECT_HOTKEYS = "fflag_fix_leap_246_multi_object_hotkeys_160124_short";

/**
 * It changes the reviewer flow to be more user-friendly and intuitive.
 */
export const FF_REVIEWER_FLOW = "fflag_feat_all_leap_1081_reviewer_flow_updates";

export const FF_CUSTOM_SCRIPT = "fflag_feat_all_leap_883_custom_script_270524_short";

/**
 * Self Serve
 * @link https://app.launchdarkly.com/default/test/features/fflag_feat_front_leap_482_self_serve_short/
 */
export const FF_SELF_SERVE = "fflag_feat_front_leap_482_self_serve_short";

/**
 * It adds functionality of bulk annotation
 */
export const FF_BULK_ANNOTATION = "fflag_feat_all_leap_1181_bulk_annotation_short";

/**
 * Disable the postpone option if the skip interface isn't set
 * @link https://app.launchdarkly.com/projects/default/flags/fflag_feat_front_leap_1173_disable_postpone_skip_short
 */
export const FF_LEAP_1173 = "fflag_feat_front_leap_1173_disable_postpone_skip_short";

export const FF_IMAGE_MEMORY_USAGE = "fflag_feat_front_optic_1479_improve_image_tag_memory_usage_short";

export const FF_VIDEO_FRAME_SEEK_PRECISION = "fflag_fix_front_optic_1608_improve_video_frame_seek_precision_short";

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
  // TODO: remove the override + if statement once LSE and LSO start building react the same way and fflag_fix_front_lsdv_4620_memory_leaks_100723_short is removed
  const override: Record<string, boolean> = {
    fflag_fix_front_lsdv_4620_memory_leaks_100723_short: false,
  };

  if (id in override) {
    return override[id];
  }
  if (id in featureFlags) {
    return featureFlags[id] === true;
  }
  return window.APP_SETTINGS?.feature_flags_default_value === true;
}

Object.assign(window, { getFeatureFlags, isFF });
