// Outliner + Details
export const FF_DEV_1170 = 'ff_front_1170_outliner_030222_short';

// Fix lag on first video playing start
export const FF_DEV_1265 = 'ff_front_dev_1265_video_start_lag_100322_short';

// Fix video timeline expanding and collapsing in full screen mode
export const FF_DEV_1270 = 'ff_front_dev_1270_fullscreen_timeline_expand_090322_short';

/**
 * Fixing "Auto Detect" tool undo functionality and bugs with skipNextUndoState.
 * @link https://app.launchdarkly.com/default/production/features/fflag_fix_front_dev_1284_auto_detect_undo_281022_short
 */
export const FF_DEV_1284 = 'fflag_fix_front_dev_1284_auto_detect_undo_281022_short';

// Fix crosshair working with zoom & rotation
export const FF_DEV_1285 = 'ff_front_dev_1285_crosshair_wrong_zoom_140122_short';

export const FF_DEV_1442 = 'ff_front_dev_1442_unselect_shape_on_click_outside_080622_short';

// Keep enabled state of video region on area transformations
export const FF_DEV_1494 = 'ff_front_dev_1494_keep_enabled_on_update_090322_short';

// Fix stuck userpic
export const FF_DEV_1507 = 'ff_front_DEV_1507_stuck_userpic_210122_short';

// User labels for Taxonomy
export const FF_DEV_1536 = 'ff_front_dev_1536_taxonomy_user_labels_150222_long';

// Fix shortcuts focus and cursor problems
export const FF_DEV_1564_DEV_1565 = 'ff_front_dev_1564_dev_1565_shortcuts_focus_and_cursor_010222_short';

// Fix work of shortcuts in results
/** @requires FF_DEV_1564_DEV_1565 */
export const FF_DEV_1566 = 'ff_front_dev_1566_shortcuts_in_results_010222_short';

export const FF_DEV_1598 = 'ff_front_dev_1598_empty_toname_240222_short';

// Add an interactivity flag to the results to make some predictions' results be able to be automatically added to newly created annotations.
export const FF_DEV_1621 = 'ff_front_dev_1621_interactive_mode_150222_short';

// New Audio 2.0 UI
export const FF_DEV_1713 = 'ff_front_DEV_1713_audio_ui_150222_short';

// Rework of Choices tag
export const FF_DEV_2007 = 'ff_dev_2007_rework_choices_280322_short';

// Add ability to generate children tags from task data
export const FF_DEV_2007_DEV_2008 = 'ff_dev_2007_dev_2008_dynamic_tag_children_250322_short';

// Clean unnecessary classification areas after deserialization
export const FF_DEV_2100 = 'ff_dev_2100_clean_unnecessary_areas_140422_short';

// Fix preselected choices
export const FF_DEV_2100_A = 'ff_dev_2100_preselected_choices_250422_short';

// Allow to use html inside <Label/> tags
export const FF_DEV_2128 = 'ff_dev_2128_html_in_labels_150422_short';

// 3-point Rectangle tool to created rotated bboxes conveniently
export const FF_DEV_2132 = 'ff_front_dev_2132_rotating_bounding_box';

// Make nested choices work according to the DES-107
export const FF_DEV_2244 = 'ff_front_dev_2244_nested_choices_des_107_160522_short';

// Show draft as the topmost item in annotation history
export const FF_DEV_2290 = 'ff_front_dev_2290_draft_in_annotation_history_short';

export const FF_DEV_2431 = 'ff_front_dev_2431_delete_polygon_points_080622_short';

export const FF_DEV_2432 = 'ff_front_dev_2432_auto_save_polygon_draft_210622_short';

// Undo keypoints when create new polygon
export const FF_DEV_2576 = 'ff_feat_front_DEV_2576_undo_key_points_polygon_short';

export const FF_DEV_2669 = 'ff_front_dev_2669_paragraph_author_filter_210622_short';

// Change the rotate tool from bbox
export const FF_DEV_2671 = 'ff_front_dev_2671_anchor_rotate_bbox_010722_short';

/**
 * Audio v3 - new Audio UI Library
 * @link https://app.launchdarkly.com/default/production/features/ff_front_dev_2715_audio_3_280722_short
 */
export const FF_DEV_2715 = 'ff_front_dev_2715_audio_3_280722_short';

export const FF_DEV_2755 = 'fflag_feat_dev_2755_regions_list_grouped_by_labels_with_ordered_collapse_short';

/**
 * Creating separated regions if selection includes hidden phrases
 * @see FF_DEV_2669 (allows filtering)
 * @link https://app.launchdarkly.com/default/production/features/fflag_fix_front_dev_2918_labeling_filtered_paragraphs_250822_short
 */
export const FF_DEV_2918 = 'fflag_fix_front_dev_2918_labeling_filtered_paragraphs_250822_short';

export const FF_DEV_3034 = 'fflag-feat-dev-3034-comments-with-drafts-short';

export const FF_DEV_3077 = 'fflag_feat_front_dev_3077_repeater_tag_loading_performance_short';

/**
 * Disallow drawing regions outside of the video canvas
 * Also disables offscreen zooming and panning
 * @link https://app.launchdarkly.com/default/production/features/fflag_fix_front_dev_3350_restrict_drawing_area_short
 */
export const FF_DEV_3350 = 'fflag_fix_front_dev_3350_restrict_drawing_area_short';

/**
 * Correction of image and stage size. It also affects the zoom position restrictions.
 * @link https://app.launchdarkly.com/default/production/features/fflag_fix_front_dev_3377_image_regions_shift_on_resize_280922_short
 */
export const FF_DEV_3377 = 'fflag_fix_front_dev_3377_image_regions_shift_on_resize_280922_short';

// Refactoring to use separate trees for every annotation to allow real annotations in View All
export const FF_DEV_3391 = 'fflag_fix_front_dev_3391_interactive_view_all';

/**
 * Addresses the memory leak issue in Taxonomy with Repeater
 * @link https://app.launchdarkly.com/default/production/features/fflag_fix_front_dev_3617_taxonomy_memory_leaks_fix
 */
export const FF_DEV_3617 = 'fflag_fix_front_dev_3617_taxonomy_memory_leaks_fix';

/**
 * Fixing maxUsages prop of *labels on region creation.
 * @link https://app.launchdarkly.com/default/test/features/fflag_fix_front_dev_3666_max_usages_on_region_creation_171122_short
 */
export const FF_DEV_3666 = 'fflag_fix_front_dev_3666_max_usages_on_region_creation_171122_short';

/**
 * Fixing "Auto Detect" tool undo functionality and bugs with skipNextUndoState.
 * @link https://app.launchdarkly.com/default/production/features/fflag_fix_front_dev_1284_auto_detect_undo_281022_short
 */
export const FF_DEV_3873 = 'fflag_feat_front_dev_3873_labeling_ui_improvements_short';

/**
 * Filter component that filter regions on outliner component
 * @link https://app.launchdarkly.com/default/production/features/fflag_feat_front_lsdv_3025_outliner_filter_short
 */
export const FF_LSDV_3025 = 'fflag_feat_front_lsdv_3025_outliner_filter_short';

/**
 * Allow shourtcuts button to work with visible main textarea when there is no focus
 * @link https://app.launchdarkly.com/default/production/features/fflag_fix_front_dev_3730_shortcuts_initial_input_22122022_short
 */
export const FF_DEV_3730 = 'fflag_fix_front_dev_3730_shortcuts_initial_input_22122022_short';

// Use only relative coords internally to improve performance and reduce bugs
export const FF_DEV_3793 = 'fflag_fix_front_dev_3793_relative_coords_short';

/**
 * Fixing issue with overlapping taxonomy items during searching
 * @link https://app.launchdarkly.com/default/community/features/fflag_fix_front_dev_4075_taxonomy_overlap_281222_short
 */
export const FF_DEV_4075 = 'fflag_fix_front_dev_4075_taxonomy_overlap_281222_short';

// Enable a Magic Wand to be used for quickly thresholding images with segmentation labels.
export const FF_DEV_4081 = 'fflag_feat_front_dev_4081_magic_wand_tool';

/**
 * Label stream ablation experiment for solving overlap issue
 * @link https://app.launchdarkly.com/default/production/features/fflag_fix_back_dev_4174_overlap_issue_experiments_10012023_short
 */
export const FF_DEV_4174 = 'fflag_fix_back_dev_4174_overlap_issue_experiments_10012023_short';

/**
 * Contextual scrolling of Paragraph segments with Audio V0
 * @link https://app.launchdarkly.com/default/production/features/fflag_feat_front_lsdv_e_278_contextual_scrolling_short/targeting
 */
export const FF_LSDV_E_278 = 'fflag_feat_front_lsdv_e_278_contextual_scrolling_short';

/**
 * Annotations with LLM assistance
 * @link https://app.launchdarkly.com/default/production/features/fflag_feat_all_lsdv_e_294_llm_annotations_180723_long
 */
export const FF_LLM_EPIC = 'fflag_feat_all_lsdv_e_294_llm_annotations_180723_long';

/**
 * Fix logic of namespaces inside Hotkeys
 * @link https://app.launchdarkly.com/default/production/features/fflag_fix_font_lsdv_1148_hotkeys_namespaces_01022023_short
 */
export const FF_LSDV_1148 = 'fflag_fix_font_lsdv_1148_hotkeys_namespaces_01022023_short';

/**
 * Multi-image segmentation support via `valueList`
 */
export const FF_LSDV_4583 = 'fflag_feat_front_lsdv_4583_multi_image_segmentation_short';

/**
 * Enables new way of preloading/cacheing images
 */
export const FF_LSDV_4583_6 = 'fflag_feat_front_lsdv_4583_6_images_preloading_short';

/**
 * Removing interrupting from the draft saving
 *
 * Without this flag we have a situation when changes in history leading to the empty results break functionality of adding comments and make the draft saving process indicator stay forever.
 * @link https://app.launchdarkly.com/default/production/features/fflag_fix_font_lsdv_1148_hotkeys_namespaces_01022023_short
 */
export const FF_LSDV_3009 = 'fflag_fix_font_lsdv_3009_draft_saving_stuck_130223_short';

/**
 * Allows to count time spend on textarea results and store it to lead_time meta field
 * @link https://app.launchdarkly.com/default/production/features/fflag_fix_front_lsdv_4600_lead_time_27072023_short
 */
export const FF_LEAD_TIME = 'fflag_fix_front_lsdv_4600_lead_time_27072023_short';

/**
 * Adding "skipDuplicates" parameter for <TextArea /> to preventing adding duplicate entries
 *
 * @link https://app.launchdarkly.com/default/production/features/fflag_feat_front_lsdv_4659_skipduplicates_060323_short
 */
export const FF_LSDV_4659 = 'fflag_feat_front_lsdv_4659_skipduplicates_060323_short';

/**
 * Reworking of RichText to optimize its work with DOM and decrease response time with a large number of regions.
 * It also fixes scenarios of working with hidden regions
 * and edge cases for creating spans inside other spans.
 *
 * @link https://app.launchdarkly.com/default/production/features/fflag_feat_front_lsdv_4620_richtext_opimization_060423_short
 */
export const FF_LSDV_4620_3 = 'fflag_feat_front_lsdv_4620_richtext_opimization_060423_short';

/**
 * Fixes memory leaks in label studio frontend relative to mobx-state-tree and react usage
 *
 * @link https://app.launchdarkly.com/default/production/features/fflag_fix_front_lsdv_4620_memory_leaks_100723_short
 */
export const FF_LSDV_4620_3_ML = 'fflag_fix_front_lsdv_4620_memory_leaks_100723_short';

/**
 * Improving the responsiveness of the interface when working with the list of regions in the outliner
 *
 * @link https://app.launchdarkly.com/default/production/features/fflag_feat_front_lsdv_4620_outliner_optimization_310723_short
 */
export const FF_OUTLINER_OPTIM = 'fflag_feat_front_lsdv_4620_outliner_optimization_310723_short';

/**
 * Fixes Rect3PointTool behaviour in relative coords mode.
 * It also fixes disappearing regions in degenerate cases.
 *
 * @link https://app.launchdarkly.com/default/production/features/fflag_fix_front_lsdv_4673_rect3point_relative_310523_short
 */
export const FF_LSDV_4673 = 'fflag_fix_front_lsdv_4673_rect3point_relative_310523_short';

/**
 * Fixes how presigned urls are generated and accessed to remove possibility of CORS errors.
 */
export const FF_LSDV_4711 = 'fflag_fix_all_lsdv_4711_cors_errors_accessing_task_data_short';

/**
 * Preventing creating duplicates in TextArea results with "skipDuplicates" parameter during editing.
 * It also prevent creating new history steps on every change during editing textarea results.
 *
 * @see FF_LSDV_4659: To enable `skipDuplicates` parameter
 * @link https://app.launchdarkly.com/default/production/features/fflag_feat_front_lsdv_4712_skipduplicates_editing_110423_short
 */
export const FF_LSDV_4712 = 'fflag_feat_front_lsdv_4712_skipduplicates_editing_110423_short';

/**
 * New Ranker tag; flag is used for `deleteAllRegions()` optimization
 */
export const FF_LSDV_4832 = 'fflag_feat_front_lsdv_4832_new_ranker_tag_120423_short';

/**
 * Fixing issue with missed steps in timeseries with optimized data and zoom
 *
 * @link https://app.launchdarkly.com/default/production/features/fflag_fix_front_lsdv_4881_timeseties_points_missing_140423_short
 */
export const FF_LSDV_4881 = 'fflag_fix_front_lsdv_4881_timeseries_points_missing_140423_short';

/** Fix "No Label" for Dynamic Labels by switching off missing labels removal */
export const FF_LSDV_4988 = 'fflag_fix_front_lsdv_4988_dynamic_no_label_120523_short';

/**
 * Fixing issues related to selection tool functional (selecting hidden regions, onClick in Konva, interaction with regions inside selection area)
 *
 * @link https://app.launchdarkly.com/default/production/features/fflag_fix_front_lsdv_4930_selection_tool_fixes_240423_short
 */
export const FF_LSDV_4930 = 'fflag_fix_front_lsdv_4930_selection_tool_fixes_240423_short';

/**
 * Restore "hide all regions" button functionality in the outliner
 *
 * @link https://app.launchdarkly.com/default/production/features/fflag_fix_front_lsdv_4998_missed_dynamic_children_030523_short
 */
export const FF_LSDV_4992 = 'fflag_fix_front_lsdv_4992_hide_all_regions_04052023_short';

/**
 * Resetting shared stores on task change to correctly generate dynamic children
 *
 * @see: ff_dev_2007_dev_2008_dynamic_tag_children_250322_short: To enable dynamic children
 * @see: fflag_fix_front_dev_3617_taxonomy_memory_leaks_fix: To enable shared store
 * @link https://app.launchdarkly.com/default/production/features/fflag_fix_front_lsdv_4998_missed_dynamic_children_030523_short
 */
export const FF_LSDV_4998 = 'fflag_fix_front_lsdv_4998_missed_dynamic_children_030523_short';

/**
 * Add ability to show hints while hover over the choice
 * @see: ff_dev_2007_rework_choices_280322_short: To enable alt version of <Choices/> (it's not necessary)
 */
export const FF_PROD_309 = 'fflag_feat_front_prod_309_choice_hint_080523_short';

/**
 * Fix delay on double-click interactions in Image Segmentation
 * @link https://app.launchdarkly.com/default/production/features/fflag_fix_front_lsdv_5248_double_click_delay_280823_short
 */
export const FF_DBLCLICK_DELAY = 'fflag_fix_front_lsdv_5248_double_click_delay_280823_short';

/**
 * Allow to load Taxonomy from remote API
 * @link https://app.launchdarkly.com/default/production/features/fflag_feat_front_lsdv_5451_async_taxonomy_110823_short
 */
export const FF_TAXONOMY_ASYNC = 'fflag_feat_front_lsdv_5451_async_taxonomy_110823_short';

/**
 * Allow to label NER directly with Taxonomy instead of Labels
 * @link https://app.launchdarkly.com/default/production/features/fflag_feat_front_lsdv_5452_taxonomy_labeling_110823_short
 */
export const FF_TAXONOMY_LABELING = 'fflag_feat_front_lsdv_5452_taxonomy_labeling_110823_short';

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
    // could be used to explicitly set flags for testing, i.e. [FF_DEV_3793]: true
  };
}

export function isFF(id: string) {
  const featureFlags = getFeatureFlags();

  if (id in featureFlags) {
    return featureFlags[id] === true;
  } else {
    return window.APP_SETTINGS?.feature_flags_default_value === true;
  }
}

Object.assign(window, { getFeatureFlags, isFF });
