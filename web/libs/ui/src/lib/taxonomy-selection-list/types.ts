export interface TaxonomySelectionItem {
  value: string;
  label: string;
  isUserAdded?: boolean;
}

export interface TaxonomySelectionListProps {
  items: TaxonomySelectionItem[];
  onRemove?: (value: string) => void;
  className?: string;
}

export interface TaxonomySelectionGridData extends Pick<TaxonomySelectionListProps, "items" | "onRemove"> {
  columnCount: number;
}
