import { cnm } from "../../utils/utils";
import { Badge } from "../badge/badge";
import type { BadgeVariant } from "../badge/badge";
import { Select } from "../select/select";
import type { TaxonomyAccentOptionsState, TaxonomyChipLayout, TaxonomyLevelOption, TaxonomySelection } from "./types";
import styles from "./taxonomy-multi-tree-select.module.css";

export const TAXONOMY_LEVEL_PLACEHOLDER = "Select level";

export interface TaxonomySelectionChipProps {
  selection: TaxonomySelection;
  displayLabel: string;
  chipLayout?: TaxonomyChipLayout;
  withLevel?: boolean;
  levelOptions?: TaxonomyLevelOption[];
  accentTaxonomyKey?: string;
  accentOptionsState?: TaxonomyAccentOptionsState;
  controlId?: string;
  /** When true, incomplete level/accent selects escalate to the invalid (negative) state. */
  highlightIncomplete?: boolean;
  onRemove?: (code: string) => void;
  onLevelChange?: (code: string, level: string) => void;
  onAccentChange?: (code: string, accent: { code: string; label?: string }) => void;
}

const getCompoundBadgeProps = (
  isComplete: boolean,
  highlightIncomplete: boolean,
): { variant: BadgeVariant; look: "filled" | "outline" } => {
  if (isComplete) {
    return { variant: "primary", look: "filled" };
  }
  if (highlightIncomplete) {
    return { variant: "negative", look: "outline" };
  }
  return { variant: "warning", look: "outline" };
};

export const TaxonomySelectionChip = ({
  selection,
  displayLabel,
  chipLayout = "inline",
  withLevel = false,
  levelOptions = [],
  accentTaxonomyKey,
  accentOptionsState,
  controlId,
  highlightIncomplete = false,
  onRemove,
  onLevelChange,
  onAccentChange,
}: TaxonomySelectionChipProps) => {
  const usesAccent = withLevel && Boolean(accentTaxonomyKey);
  const isCompound = withLevel || usesAccent;
  const isLevelComplete = Boolean(selection.level?.trim());
  const isAccentComplete = !usesAccent || Boolean(selection.accent?.code?.trim());
  const isComplete = isLevelComplete && isAccentComplete;
  const { variant: badgeVariant, look: badgeLook } = getCompoundBadgeProps(isComplete, highlightIncomplete);
  const handleClose = onRemove ? () => onRemove(selection.code) : undefined;

  if (!isCompound) {
    return (
      <Badge
        variant="primary"
        size="large"
        className={styles.simpleChip}
        maxWidth="100%"
        title={displayLabel}
        onClose={handleClose}
      >
        {displayLabel}
      </Badge>
    );
  }

  const accentSelectClassName = cnm(
    styles.chipSelect,
    !isAccentComplete && styles.chipSelectPending,
    !isAccentComplete && highlightIncomplete && styles.chipSelectInvalid,
  );
  const levelSelectClassName = cnm(
    styles.chipSelect,
    !isLevelComplete && styles.chipSelectPending,
    !isLevelComplete && highlightIncomplete && styles.chipSelectInvalid,
  );

  return (
    <Badge
      variant={badgeVariant}
      look={badgeLook}
      size="large"
      className={cnm(styles.compoundChip, chipLayout === "stacked" && styles.compoundChipStacked)}
      data-taxonomy-chip-state={isComplete ? "filled" : highlightIncomplete ? "invalid" : "unfilled"}
      onClose={handleClose}
      closeLabel={`Remove ${displayLabel}`}
    >
      <span className={styles.chipLabel} title={displayLabel}>
        {displayLabel}
      </span>
      <span data-taxonomy-chip-interactive className={styles.chipInteractive}>
        {usesAccent && (
          <Select
            placeholder="Select"
            searchable
            size="smaller"
            isInline
            dataTestid={controlId ? `${controlId}-${selection.code}-accent` : undefined}
            triggerClassName={accentSelectClassName}
            triggerProps={{
              "aria-label": isAccentComplete ? `Accent for ${displayLabel}` : `Accent for ${displayLabel}, required`,
              "aria-invalid": !isAccentComplete && highlightIncomplete ? true : undefined,
            }}
            value={selection.accent?.code ?? null}
            options={accentOptionsState?.options ?? []}
            isLoading={accentOptionsState?.isLoading}
            onSearch={accentOptionsState?.onSearch}
            onChange={(nextValue) => {
              const selected = accentOptionsState?.options.find((option) => option.value === String(nextValue));
              onAccentChange?.(selection.code, {
                code: String(nextValue),
                label: selected?.label ?? String(nextValue),
              });
            }}
          />
        )}
        {withLevel && (
          <Select
            size="smaller"
            isInline
            placeholder={TAXONOMY_LEVEL_PLACEHOLDER}
            triggerClassName={levelSelectClassName}
            triggerProps={{
              "aria-label": isLevelComplete ? `Level for ${displayLabel}` : `Level for ${displayLabel}, required`,
              "aria-invalid": !isLevelComplete && highlightIncomplete ? true : undefined,
            }}
            value={selection.level || null}
            options={levelOptions.map((option) => ({ value: option.value, label: option.label }))}
            onChange={(nextValue) => onLevelChange?.(selection.code, String(nextValue))}
          />
        )}
      </span>
    </Badge>
  );
};
