import type { ManifestConfig } from "./types";

/** Cross-component facts that no single folder owns: the package, the gaps, internal exports and non-components. */
export const manifestConfig: ManifestConfig = {
  package: "@humansignal/ui",
  gaps: {
    Input: {
      intent: ["free text entry"],
      use_when: "A single-line text field with leading or trailing elements and error state.",
      replaces: [
        "services/lso/web/apps/labelstudio/src/components/Form/Elements/Input/Input.jsx",
        "services/lse/web/apps/labelstudio/src/components/Form/Elements/Input/Input.tsx",
        "services/lso/web/libs/datamanager/src/components/Common/Form/Elements/Input/Input.jsx",
        "services/lso/web/libs/datamanager/src/components/Common/Input/Input.jsx",
        "services/lso/web/libs/editor/src/common/Input/Input.jsx",
        'jsx:<input type="text">',
      ],
    },
    TextArea: {
      intent: ["multi-line text entry"],
      use_when: "A resizable multi-line text field with error state.",
      replaces: [
        "services/lso/web/apps/labelstudio/src/components/Form/Elements/TextArea/TextArea.jsx",
        "services/lse/web/apps/labelstudio/src/components/Form/Elements/TextArea/TextArea.tsx",
        "services/lso/web/libs/datamanager/src/components/Common/Form/Elements/TextArea/TextArea.jsx",
        "services/lso/web/libs/editor/src/common/TextArea/TextArea.tsx",
        "jsx:<textarea>",
      ],
    },
    Radio: {
      intent: ["pick one of several described options"],
      use_when: "Mutually exclusive options that need a label and a description each.",
      replaces: [
        "services/lso/web/apps/labelstudio/src/components/Form/Elements/RadioGroup/RadioGroup.jsx",
        "services/lse/web/apps/labelstudio/src/components/Form/Elements/RadioGroup/RadioGroup.jsx",
        "services/lso/web/libs/datamanager/src/components/Common/RadioGroup/RadioGroup.jsx",
        "services/lso/web/libs/editor/src/common/RadioGroup/RadioGroup.jsx",
        'jsx:<input type="radio">',
      ],
    },
    FormField: {
      intent: ["bind a control to a form with label, description and error"],
      use_when:
        "The wrapper that registers any control with a form and renders its Label, description and validation error.",
      replaces: [
        "services/lso/web/apps/labelstudio/src/components/Form/Form.jsx",
        "services/lse/web/apps/labelstudio/src/components/Form/Form.tsx",
        "services/lso/web/libs/datamanager/src/components/Common/Form/Form.jsx",
      ],
    },
  },
  internal: {
    Header: "DataTable column header helper; use it through DataTable column definitions.",
    DropdownContext: "React context behind Dropdown; use useDropdown.",
    ToastContext: "React context behind Toast; use useToast.",
    TreeSearchIndex: "Search index class used by MultiTreeSelect.",
    TreeSearchMatch: "Search match class used by MultiTreeSelect.",
  },
  nonComponents: [
    "AVATAR_SIZES",
    "SIZES",
    "CONTEXT_MENU_KEYS",
    "TAXONOMY_TREE_SCHEMA",
    "ToastType",
    "SelectSize",
    "FILTER_SHELL_TREE_DROPDOWN_CLASS",
    "IdDelimiter",
    "IndexedSymbol",
    "RootSymbol",
    "TAXONOMY_LEVEL_PLACEHOLDER",
    "TAXONOMY_PATH_SEPARATOR",
  ],
};
