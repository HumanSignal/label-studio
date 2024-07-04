export default {
  enableHotkeys: {
    newUI: {
      title: "Labeling hotkeys",
      description: "Enables quick selection of labels using hotkeys",
    },
    description: "Enable labeling hotkeys",
    onChangeEvent: "toggleHotkeys",
    defaultValue: true,
  },
  enableTooltips: {
    newUI: {
      title: "Show hotkeys on tooltips",
      description: "Displays keybindings on tools and actions tooltips",
    },
    description: "Show hotkey tooltips",
    onChangeEvent: "toggleTooltips",
    checked: "",
    defaultValue: false,
  },
  enableLabelTooltips: {
    newUI: {
      title: "Show hotkeys on labels",
      description: "Displays keybindings on labels",
    },
    description: "Show labels hotkey tooltips",
    onChangeEvent: "toggleLabelTooltips",
    defaultValue: true,
  },
  showLabels: {
    newUI: {
      title: "Show region labels",
      description: "Display region label names",
    },
    description: "Show labels inside the regions",
    onChangeEvent: "toggleShowLabels",
    defaultValue: false,
  },
  'enableRegionBoxes': {
    'newUI': {
      'title': 'Enable or disable visual boxes for regions',
      'description': 'Toggle the visual bounding boxes for the regions'
    },
    'description': 'Enable or disable visual boxes for regions',
    'onChangeEvent': 'toggleRegionBoxes',
    'defaultValue': false
  },
  continuousLabeling: {
    newUI: {
      title: "Keep label selected after creating a region",
      description: "Allows continuous region creation using the selected label",
    },
    description: "Keep label selected after creating a region",
    onChangeEvent: "toggleContinuousLabeling",
    defaultValue: false,
  },
  selectAfterCreate: {
    newUI: {
      title: "Select region after creating it",
      description: "Automatically selects newly created regions",
    },
    description: "Select regions after creating",
    onChangeEvent: "toggleSelectAfterCreate",
    defaultValue: false,
  },
  hideNonActiveRegions: {
    newUI: {
      title: "Hide non active regions.",
      description: "Hides all non active regions when selecting any regions.",
    },
    description: "Hides non active regions.",
    onChangeEvent: "toggleHideNonSelectedRegions",
    defaultValue: false,
  },
  enableActiveRegionOpacity: {
    newUI: {
      title: "Enable active region opacity",
      description: "When using the eraser or brush the opacity can be set to help visual aid",
    },
    description: "Enable active region opacity",
    onChangeEvent: "toggleActiveRegionOpacity",
    defaultValue: false,
  },
  hideAutoAnnotationTooltip: {
    newUI: {
      title: "Hide the auto annotation tooltip",
      description: "When auto annotation is enabled, this will hide the tooltip.",
    },
    description: "Hide the auto annotation tooltip",
    onChangeEvent: "toggleAutoAnnotationTooltip",
    defaultValue: false,
  },
  enableInvertedZoom: {
    newUI: {
      title: "Invert the zoom direction",
      description: "When enabled, the zoom direction is inverted.",
    },
    description: "Invert the zoom direction",
    onChangeEvent: "toggleInvertedZoom",
    defaultValue: false,
  },
  showLineNumbers: {
    newUI: {
      tags: "Text Tag",
      title: "Show line numbers",
      description: "Identify and reference specific lines of text in your document",
    },
    description: "Show line numbers for Text",
    onChangeEvent: "toggleShowLineNumbers",
    defaultValue: false,
  },
  preserveSelectedTool: {
    newUI: {
      tags: "Image Tag",
      title: "Keep selected tool",
      description: "Persists the selected tool across tasks",
    },
    description: "Remember Selected Tool",
    onChangeEvent: "togglepreserveSelectedTool",
    defaultValue: true,
  },
  enableSmoothing: {
    newUI: {
      tags: "Image Tag",
      title: "Pixel smoothing on zoom",
      description: "Smooth image pixels when zoomed in",
    },
    description: "Enable image smoothing when zoom",
    onChangeEvent: "toggleSmoothing",
    defaultValue: true,
  },
};
