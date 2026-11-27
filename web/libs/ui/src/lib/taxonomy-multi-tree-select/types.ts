export interface TaxonomyOption {
  value: string;
  label: string;
  parentCode?: string | null;
}

export interface TaxonomySelection {
  code: string;
  label?: string;
  level?: string;
  status?: string;
  accent?: {
    code: string;
    label?: string;
  };
}

export interface TaxonomyLevelOption {
  value: string;
  label: string;
}

export interface TaxonomyAccentOptionsState {
  options: TaxonomyOption[];
  isLoading?: boolean;
  onSearch?: (query: string) => void;
}

export type TaxonomyChipLayout = "inline" | "stacked";

export interface TaxonomyMultiTreeSelectProps {
  options: TaxonomyOption[];
  value: TaxonomySelection[];
  onChange: (value: TaxonomySelection[]) => void;
  chipLayout?: TaxonomyChipLayout;
  addLabel?: string;
  withLevel?: boolean;
  levelOptions?: TaxonomyLevelOption[];
  accentTaxonomyKey?: string;
  accentLabel?: string;
  maxItems?: number;
  controlId?: string;
  fieldLabel?: string;
  disabled?: boolean;
  /** When true, incomplete level/accent selects use the invalid (negative) chip state. */
  highlightIncomplete?: boolean;
  getAccentOptionsState?: (code: string) => TaxonomyAccentOptionsState | undefined;
  onLevelChange?: (code: string, level: string) => void;
  onAccentChange?: (code: string, accent: { code: string; label?: string }) => void;
}
