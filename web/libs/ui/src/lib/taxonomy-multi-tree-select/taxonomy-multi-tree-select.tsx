import { useCallback, useMemo } from "react";
import { cnm } from "../../utils/utils";
import { Badge } from "../badge/badge";
import { PlusIcon } from "@humansignal/icons";
import { Typography } from "../typography/typography";
import { MultiTreeSelectDropdown } from "../multi-tree-select/multi-tree-select-dropdown";
import {
  buildTaxonomyTreeData,
  getTaxonomyOptionPath,
  isTaxonomyChipOutsideClickTarget,
  TAXONOMY_TREE_SCHEMA,
  taxonomySelectionsToTreeIds,
  treeIdsToTaxonomySelections,
} from "./taxonomy-multi-tree-utils";
import { TaxonomySelectionChip } from "./taxonomy-selection-chip";
import type { TaxonomyMultiTreeSelectProps } from "./types";
import styles from "./taxonomy-multi-tree-select.module.css";

export const TaxonomyMultiTreeSelect = ({
  options,
  value,
  onChange,
  chipLayout = "inline",
  addLabel = "Add",
  withLevel = false,
  levelOptions = [],
  accentTaxonomyKey,
  maxItems,
  controlId,
  fieldLabel,
  disabled = false,
  highlightIncomplete = false,
  getAccentOptionsState,
  onLevelChange,
  onAccentChange,
}: TaxonomyMultiTreeSelectProps) => {
  const selectedCodes = useMemo(() => new Set(value.map((selection) => selection.code)), [value]);
  const reachedMaxItems = typeof maxItems === "number" && value.length >= maxItems;
  const optionsByValue = useMemo(() => new Map(options.map((option) => [option.value, option])), [options]);

  const treeData = useMemo(
    () => structuredClone(buildTaxonomyTreeData(options, selectedCodes, reachedMaxItems)),
    [options, selectedCodes, reachedMaxItems],
  );

  const selectedTreeIds = useMemo(() => taxonomySelectionsToTreeIds(value, optionsByValue), [value, optionsByValue]);

  const handleChange = useCallback(
    (_data: unknown, treeIds: string[]) => {
      onChange(treeIdsToTaxonomySelections(treeIds, optionsByValue, value));
    },
    [onChange, optionsByValue, value],
  );

  const handleRemove = useCallback(
    (code: string) => {
      onChange(value.filter((selection) => selection.code !== code));
    },
    [onChange, value],
  );

  const showAddPill = !reachedMaxItems && !disabled;

  const selectionTrigger = (
    <div className={styles.triggerContent}>
      {showAddPill ? (
        <Badge
          look="outline"
          variant="neutral"
          size="large"
          icon={<PlusIcon />}
          className={styles.addPill}
          aria-hidden="true"
        >
          {addLabel}
        </Badge>
      ) : (
        <span className={styles.triggerPlaceholder}>Select</span>
      )}
    </div>
  );

  return (
    <div className={styles.root}>
      <MultiTreeSelectDropdown
        data={treeData}
        schema={TAXONOMY_TREE_SCHEMA}
        selected={selectedTreeIds}
        onChange={handleChange}
        disableAllOption
        customPlaceholder="Select"
        preventAutoChildSelection
        inline
        searchPlaceholder="Search"
        triggerTestId={controlId ? `${controlId}-taxonomy` : undefined}
        dropdownClassName={styles.dropdown}
        selectionTrigger={selectionTrigger}
        isChildValid={isTaxonomyChipOutsideClickTarget}
      />
      {value.length > 0 && (
        <>
          <Typography
            variant="label"
            size="small"
            className={styles.selectedCount}
            data-testid={controlId ? `${controlId}-selected-count` : undefined}
          >
            {value.length} selected
          </Typography>
          <div
            className={cnm(
              styles.selections,
              chipLayout === "stacked" ? styles.selectionsStacked : styles.selectionsInline,
            )}
            role="group"
            aria-label={fieldLabel}
            data-testid={controlId ? `${controlId}-selections` : undefined}
          >
            {value.map((selection) => (
              <TaxonomySelectionChip
                key={selection.code}
                selection={selection}
                displayLabel={getTaxonomyOptionPath(selection.code, optionsByValue, selection.label ?? selection.code)}
                chipLayout={chipLayout}
                withLevel={withLevel}
                levelOptions={levelOptions}
                accentTaxonomyKey={accentTaxonomyKey}
                accentOptionsState={getAccentOptionsState?.(selection.code)}
                controlId={controlId}
                highlightIncomplete={highlightIncomplete}
                onRemove={disabled ? undefined : handleRemove}
                onLevelChange={onLevelChange}
                onAccentChange={onAccentChange}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
};
