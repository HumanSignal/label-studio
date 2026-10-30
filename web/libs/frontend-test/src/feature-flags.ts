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
 * Creating separated regions if selection includes hidden phrases
 * @see FF_DEV_2669 (allows filtering)
 * @link https://app.launchdarkly.com/default/production/features/fflag_fix_front_dev_2918_labeling_filtered_paragraphs_250822_short
 */
export const FF_DEV_2918 = "fflag_fix_front_dev_2918_labeling_filtered_paragraphs_250822_short";

// Refactoring to use separate trees for every annotation to allow real annotations in View All
export const FF_DEV_3391 = "fflag_fix_front_dev_3391_interactive_view_all";

/**
 * Default Audio v3 to use multichannel mode if the track has 2 or more channels.
 * @link https://app.launchdarkly.com/default/production/features/fflag_feat_front_lsdv_3028_audio_v3_multichannel_default_17022023_short
 *
 */
export const FF_LSDV_3028 = "fflag_feat_front_lsdv_3028_audio_v3_multichannel_default_17022023_short";

/**
 * Fixing issues related to selection tool functional (selecting hidden regions, onClick in Konva, interaction with regions inside selection area)
 *
 * @link https://app.launchdarkly.com/default/production/features/fflag_fix_front_lsdv_4930_selection_tool_fixes_240423_short
 */
export const FF_LSDV_4930 = "fflag_fix_front_lsdv_4930_selection_tool_fixes_240423_short";

Object.assign(window, {
  APP_SETTINGS: {
    ...(window.APP_SETTINGS ?? {}),
    feature_flags: {
      ...(window.APP_SETTINGS?.feature_flags ?? {}),
      ...(window.__FEATURE_FLAGS__ ?? {}),
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
