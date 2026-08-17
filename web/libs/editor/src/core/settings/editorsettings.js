import i18next from "i18next";

// Translate a settings string lazily (at property access time) so that the
// active language is always used; falls back to the original English text.
const tr = (key, fallback) => i18next.t(`editor:${key}`, { defaultValue: fallback }) ?? fallback;

export default {
  enableHotkeys: {
    newUI: {
      get title() {
        return tr("setting_enableHotkeys_title", "Labeling hotkeys");
      },
      get description() {
        return tr("setting_enableHotkeys_description", "Enables quick selection of labels using hotkeys");
      },
    },
    get description() {
      return tr("setting_enableHotkeys_short", "Enable labeling hotkeys");
    },
    onChangeEvent: "toggleHotkeys",
    defaultValue: true,
  },
  enableTooltips: {
    newUI: {
      get title() {
        return tr("setting_enableTooltips_title", "Show hotkeys on tooltips");
      },
      get description() {
        return tr("setting_enableTooltips_description", "Displays keybindings on tools and actions tooltips");
      },
    },
    get description() {
      return tr("setting_enableTooltips_short", "Show hotkey tooltips");
    },
    onChangeEvent: "toggleTooltips",
    checked: "",
    defaultValue: false,
  },
  enableLabelTooltips: {
    newUI: {
      get title() {
        return tr("setting_enableLabelTooltips_title", "Show hotkeys on labels");
      },
      get description() {
        return tr("setting_enableLabelTooltips_description", "Displays keybindings on labels");
      },
    },
    get description() {
      return tr("setting_enableLabelTooltips_short", "Show labels hotkey tooltips");
    },
    onChangeEvent: "toggleLabelTooltips",
    defaultValue: true,
  },
  showLabels: {
    newUI: {
      get title() {
        return tr("setting_showLabels_title", "Show region labels");
      },
      get description() {
        return tr("setting_showLabels_description", "Display region label names");
      },
    },
    get description() {
      return tr("setting_showLabels_short", "Show labels inside the regions");
    },
    onChangeEvent: "toggleShowLabels",
    defaultValue: false,
  },
  continuousLabeling: {
    newUI: {
      get title() {
        return tr("setting_continuousLabeling_title", "Keep label selected after creating a region");
      },
      get description() {
        return tr(
          "setting_continuousLabeling_description",
          "Allows continuous region creation using the selected label",
        );
      },
    },
    get description() {
      return tr("setting_continuousLabeling_short", "Keep label selected after creating a region");
    },
    onChangeEvent: "toggleContinuousLabeling",
    defaultValue: false,
  },
  selectAfterCreate: {
    newUI: {
      get title() {
        return tr("setting_selectAfterCreate_title", "Select region after creating it");
      },
      get description() {
        return tr("setting_selectAfterCreate_description", "Automatically selects newly created regions");
      },
    },
    get description() {
      return tr("setting_selectAfterCreate_short", "Select regions after creating");
    },
    onChangeEvent: "toggleSelectAfterCreate",
    defaultValue: false,
  },
  showLineNumbers: {
    newUI: {
      tags: "Text Tag",
      get title() {
        return tr("setting_showLineNumbers_title", "Show line numbers");
      },
      get description() {
        return tr(
          "setting_showLineNumbers_description",
          "Identify and reference specific lines of text in your document",
        );
      },
    },
    get description() {
      return tr("setting_showLineNumbers_short", "Show line numbers for Text");
    },
    onChangeEvent: "toggleShowLineNumbers",
    defaultValue: false,
  },
  preserveSelectedTool: {
    newUI: {
      tags: "Image Tag",
      get title() {
        return tr("setting_preserveSelectedTool_title", "Keep selected tool");
      },
      get description() {
        return tr("setting_preserveSelectedTool_description", "Persists the selected tool across tasks");
      },
    },
    get description() {
      return tr("setting_preserveSelectedTool_short", "Remember Selected Tool");
    },
    onChangeEvent: "togglepreserveSelectedTool",
    defaultValue: true,
  },
  enableSmoothing: {
    newUI: {
      tags: "Image Tag",
      get title() {
        return tr("setting_enableSmoothing_title", "Pixel smoothing on zoom");
      },
      get description() {
        return tr("setting_enableSmoothing_description", "Smooth image pixels when zoomed in");
      },
    },
    get description() {
      return tr("setting_enableSmoothing_short", "Enable image smoothing when zoom");
    },
    onChangeEvent: "toggleSmoothing",
    defaultValue: true,
  },
  invertedZoom: {
    newUI: {
      tags: "Image Tag",
      get title() {
        return tr("setting_invertedZoom_title", "Invert zoom direction");
      },
      get description() {
        return tr("setting_invertedZoom_description", "Invert the direction of scroll-to-zoom");
      },
    },
    get description() {
      return tr("setting_invertedZoom_short", "Enable inverted zoom direction");
    },
    onChangeEvent: "toggleInvertedZoom",
    defaultValue: false,
  },
};
