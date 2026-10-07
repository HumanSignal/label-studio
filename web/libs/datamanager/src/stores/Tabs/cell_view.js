import { tryReference } from "mobx-state-tree";
import * as CellViews from "../../components/CellViews";
import { normalizeCellAlias } from "../../components/CellViews";

/**
 * The cell view a column renders and filters with. A view named after the parent and the column
 * (`ReviewsReviewedAt`) applies to that nested column only, not to a root column with the same alias.
 * The parent is read with `tryReference`: while columns load, it may not be in the tree yet.
 */
export function cellViewFor(column) {
  const parent = tryReference(() => column.parent);
  const byParent = parent && CellViews[normalizeCellAlias(`${parent.alias}_${column.alias}`)];
  if (byParent) return byParent;

  const byAlias = CellViews[normalizeCellAlias(column.alias)];
  const byType = CellViews[column.type];
  // Prefer alias views that customize operators (e.g. GroundTruth without "is empty").
  return byAlias?.customOperators ? byAlias : (byType ?? byAlias);
}
