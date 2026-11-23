import type { ManifestConfig } from "./types";

/** Cross-component facts that no single folder owns: the package, the gaps, internal exports and non-components. */
export const manifestConfig: ManifestConfig = {
  package: "@humansignal/ui",
  gaps: {
    FormField: {
      intent: ["Bind a control to a form with label, description and error"],
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
