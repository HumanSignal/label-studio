const FF_DEV_1284 = "fflag_fix_front_dev_1284_auto_detect_undo_281022_short";
const FF_DEV_1442 = "ff_front_dev_1442_unselect_shape_on_click_outside_080622_short";
const FF_DEV_2669 = "ff_front_dev_2669_paragraph_author_filter_210622_short";
const FF_DEV_2671 = "ff_front_dev_2671_anchor_rotate_bbox_010722_short";
const FF_AUDIO_SPECTROGRAMS = "fflag_feat_optic_2123_audio_spectrograms";
const FF_DEV_2755 = "fflag_feat_dev_2755_regions_list_grouped_by_labels_with_ordered_collapse_short";
const FF_DEV_2918 = "fflag_fix_front_dev_2918_labeling_filtered_paragraphs_250822_short";
const FF_DEV_3034 = "fflag-feat-dev-3034-comments-with-drafts-short";
const FF_DEV_3077 = "fflag_feat_front_dev_3077_repeater_tag_loading_performance_short";
const FF_DEV_3377 = "fflag_fix_front_dev_3377_image_regions_shift_on_resize_280922_short";
const FF_DEV_3391 = "fflag_fix_front_dev_3391_interactive_view_all";
const FF_DEV_4174 = "fflag_fix_back_dev_4174_overlap_issue_experiments_10012023_short";
const FF_LSDV_E_278 = "fflag_feat_front_lsdv_e_278_contextual_scrolling_short";
const FF_NER_SELECT_ALL = "fflag_feat_front_bros_199_enable_select_all_in_ner_phrase_short";
const FF_LSDV_4583 = "fflag_feat_front_lsdv_4583_multi_image_segmentation_short";
const FF_LEAD_TIME = "fflag_fix_front_lsdv_4600_lead_time_27072023_short";
const FF_LSDV_4620_3_ML = "fflag_fix_front_lsdv_4620_memory_leaks_100723_short";
const FF_LSDV_4930 = "fflag_fix_front_lsdv_4930_selection_tool_fixes_240423_short";
const FF_LSDV_4998 = "fflag_fix_front_lsdv_4998_missed_dynamic_children_030523_short";
const FF_TAXONOMY_LABELING = "fflag_feat_front_lsdv_5452_taxonomy_labeling_110823_short";
const FF_TASK_COUNT_FIX = "fflag_fix_all_optic_79_task_count_is_wrong_short";
const FF_SIMPLE_INIT = "fflag_fix_front_leap_443_select_annotation_once";
const FF_ZOOM_OPTIM = "fflag_fix_front_leap_32_zoom_perf_190923_short";
const FF_SAFE_TEXT = "fflag_fix_leap_466_text_sanitization";
const FF_MULTI_OBJECT_HOTKEYS = "fflag_fix_leap_246_multi_object_hotkeys_160124_short";
const FF_REVIEWER_FLOW = "fflag_feat_all_leap_1081_reviewer_flow_updates";
const FF_CUSTOM_SCRIPT = "fflag_feat_all_leap_883_custom_script_270524_short";
const FF_BULK_ANNOTATION = "fflag_feat_all_leap_1181_bulk_annotation_short";
const FF_LEAP_1173 = "fflag_feat_front_leap_1173_disable_postpone_skip_short";
const FF_IMAGE_MEMORY_USAGE = "fflag_feat_front_optic_1479_improve_image_tag_memory_usage_short";
const FF_VIDEO_FRAME_SEEK_PRECISION = "fflag_fix_front_optic_1608_improve_video_frame_seek_precision_short";
const FF_FIT_1304_STRICT_OVERLAP = "fflag_feat_all_fit_1304_strict_overlap";
Object.assign(window, {
  APP_SETTINGS: {
    ...window.APP_SETTINGS ?? {},
    feature_flags: {
      ...window.APP_SETTINGS?.feature_flags ?? {},
      ...window.FEATURE_FLAGS ?? {}
    }
  }
});
function getFeatureFlags() {
  return {
    ...window.APP_SETTINGS?.feature_flags ?? {}
    // could be used to explicitly set flags for testing
  };
}
function isFF(id) {
  const featureFlags = getFeatureFlags();
  const override = {
    fflag_fix_front_lsdv_4620_memory_leaks_100723_short: false
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
export {
  FF_AUDIO_SPECTROGRAMS,
  FF_BULK_ANNOTATION,
  FF_CUSTOM_SCRIPT,
  FF_DEV_1284,
  FF_DEV_1442,
  FF_DEV_2669,
  FF_DEV_2671,
  FF_DEV_2755,
  FF_DEV_2918,
  FF_DEV_3034,
  FF_DEV_3077,
  FF_DEV_3377,
  FF_DEV_3391,
  FF_DEV_4174,
  FF_FIT_1304_STRICT_OVERLAP,
  FF_IMAGE_MEMORY_USAGE,
  FF_LEAD_TIME,
  FF_LEAP_1173,
  FF_LSDV_4583,
  FF_LSDV_4620_3_ML,
  FF_LSDV_4930,
  FF_LSDV_4998,
  FF_LSDV_E_278,
  FF_MULTI_OBJECT_HOTKEYS,
  FF_NER_SELECT_ALL,
  FF_REVIEWER_FLOW,
  FF_SAFE_TEXT,
  FF_SIMPLE_INIT,
  FF_TASK_COUNT_FIX,
  FF_TAXONOMY_LABELING,
  FF_VIDEO_FRAME_SEEK_PRECISION,
  FF_ZOOM_OPTIM,
  isFF
};
