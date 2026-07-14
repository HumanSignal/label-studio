import { IdDelimiter } from "../multi-tree-select/tree-context";
import type { TaxonomyOption, TaxonomySelection } from "./types";

export interface TaxonomyTreeNode {
  code: string;
  label: string;
  children: TaxonomyTreeNode[];
  disabled?: boolean;
}

export const TAXONOMY_TREE_SCHEMA = {
  id: "code",
  label: "label",
  children: "children",
} as const;

export const TAXONOMY_PATH_SEPARATOR = " / ";

/** Chip selects and their portaled popovers — treat as inside the taxonomy tree dropdown. */
export const TAXONOMY_CHIP_INTERACTIVE_SELECTOR =
  '[data-taxonomy-chip-interactive], [data-testid="select-popup"], [data-slot="popover-content"]';

export const isTaxonomyChipOutsideClickTarget = (target: HTMLElement) =>
  Boolean(target?.closest?.(TAXONOMY_CHIP_INTERACTIVE_SELECTOR));

/**
 * Decodes the leaf taxonomy code from a MultiTreeSelect path id
 * (ancestors joined with IdDelimiter "-").
 *
 * Safe only because BE taxonomy codes never contain "-": they are slugified to
 * [a-z0-9_] / ISO country codes and use "__" as the hierarchy separator
 * (OrganizationTaxonomyNodeSerializer.validate_code / _stable_code). A raw ORM
 * insert with "-" in a code would break this round-trip.
 */
export const taxonomyCodeFromTreeId = (treeId: string) => treeId.split(IdDelimiter).at(-1) ?? treeId;

export const getTaxonomyOptionPath = (
  code: string,
  optionsByValue: ReadonlyMap<string, TaxonomyOption>,
  fallbackLabel?: string,
) => {
  const path: string[] = [];
  const seen = new Set<string>();
  let current = optionsByValue.get(code);

  while (current && !seen.has(current.value)) {
    seen.add(current.value);
    path.unshift(current.label);
    current = current.parentCode ? optionsByValue.get(current.parentCode) : undefined;
  }

  return path.length ? path.join(TAXONOMY_PATH_SEPARATOR) : (fallbackLabel ?? code);
};

export const taxonomySelectionToTreeId = (
  code: string,
  optionsByValue: ReadonlyMap<string, TaxonomyOption>,
): string => {
  const segments: string[] = [];
  const seen = new Set<string>();
  let current = optionsByValue.get(code);

  while (current && !seen.has(current.value)) {
    seen.add(current.value);
    segments.unshift(current.value);
    current = current.parentCode ? optionsByValue.get(current.parentCode) : undefined;
  }

  return segments.join(IdDelimiter);
};

export const taxonomySelectionsToTreeIds = (
  selections: TaxonomySelection[],
  optionsByValue: ReadonlyMap<string, TaxonomyOption>,
) => selections.map((selection) => taxonomySelectionToTreeId(selection.code, optionsByValue));

export const treeIdsToTaxonomySelections = (
  treeIds: string[],
  optionsByValue: ReadonlyMap<string, TaxonomyOption>,
  previousSelections: TaxonomySelection[] = [],
): TaxonomySelection[] => {
  const previousByCode = new Map(previousSelections.map((selection) => [selection.code, selection]));
  const nextByCode = new Map<string, TaxonomySelection>();

  for (const treeId of treeIds) {
    const code = taxonomyCodeFromTreeId(treeId);
    const option = optionsByValue.get(code);
    const previous = previousByCode.get(code);

    nextByCode.set(code, {
      code,
      label: option?.label ?? previous?.label ?? code,
      ...(previous?.level ? { level: previous.level } : {}),
      ...(previous?.status ? { status: previous.status } : {}),
      ...(previous?.accent ? { accent: previous.accent } : {}),
    });
  }

  // Keep previously selected items in their existing order; append new ones in
  // treeIds order so chips don't jump when the tree emits path-order ids.
  const result: TaxonomySelection[] = [];
  for (const previous of previousSelections) {
    const next = nextByCode.get(previous.code);
    if (next) {
      result.push(next);
      nextByCode.delete(previous.code);
    }
  }
  for (const next of nextByCode.values()) {
    result.push(next);
  }
  return result;
};

export const buildTaxonomyTreeData = (
  options: TaxonomyOption[],
  selectedCodes: ReadonlySet<string>,
  reachedMaxItems: boolean,
): TaxonomyTreeNode[] => {
  const byValue = new Map<string, TaxonomyTreeNode>();

  for (const option of options) {
    byValue.set(option.value, {
      code: option.value,
      label: option.label,
      children: [],
      ...(reachedMaxItems && !selectedCodes.has(option.value) ? { disabled: true } : {}),
    });
  }

  const roots: TaxonomyTreeNode[] = [];

  for (const option of options) {
    const node = byValue.get(option.value);
    if (!node) continue;

    const parent = option.parentCode ? byValue.get(option.parentCode) : null;
    if (parent) {
      parent.children.push(node);
    } else {
      roots.push(node);
    }
  }

  return roots;
};
