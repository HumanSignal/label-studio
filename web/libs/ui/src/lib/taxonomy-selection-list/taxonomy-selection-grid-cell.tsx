import type { GridChildComponentProps } from "react-window";
import { TaxonomySelectionBadge } from "./taxonomy-selection-badge";
import type { TaxonomySelectionGridData } from "./types";

export function TaxonomySelectionGridCell({
  columnIndex,
  rowIndex,
  style,
  data,
}: GridChildComponentProps<TaxonomySelectionGridData>) {
  const item = data.items[rowIndex * data.columnCount + columnIndex];
  if (!item) return null;

  return (
    <div style={style} className="box-border flex min-w-0 items-center justify-start pr-tighter pb-tighter">
      <TaxonomySelectionBadge item={item} onRemove={data.onRemove} />
    </div>
  );
}
